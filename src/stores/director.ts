import { defineStore } from 'pinia'
import { parse as parsePartial, Allow } from 'partial-json'
import { ref, watch } from 'vue'
import type { ChatMessage, DirectorOutput, Idea, MoveSpec } from '#shared/director'
import { engine } from '@/engine/engine'
import { planReply } from '@/engine/timing'
import { applyBlockChanges, setMuted } from '@/engine/program'
import { DirectorError, streamDirect, type StreamResult } from '@/director/client'
import { matchCueTitle, parseQuickCommand, type QuickCommand } from '@/director/commands'
import { buildDirectionMessage, buildRepairMessage } from '@/director/context'
import { useClock } from './clock'
import { useDeck, type Cue, type CueMetrics } from './deck'
import { useSettings } from './settings'
import { useVisuals } from './visuals'

const KEY = 'claude-strudel:conversation'

interface Pending {
  direction: string
  requestCycle: number
}

/** A partially streamed reply, parsed leniently for the UI. */
const peek = (text: string) => {
  try {
    return parsePartial(text, Allow.ALL) as Partial<DirectorOutput>
  } catch {
    return {}
  }
}

export const useDirector = defineStore('director', () => {
  const deck = useDeck()
  const clock = useClock()
  const visuals = useVisuals()
  const { settings } = useSettings()

  const messages = ref<ChatMessage[]>([])
  const queue = ref<Pending[]>([])
  const busy = ref(false)
  const say = ref('')
  const notice = ref('')
  const error = ref('')
  let current: AbortController | undefined
  let ideaControllers: AbortController[] = []

  try {
    messages.value = JSON.parse(localStorage.getItem(KEY) ?? '[]') as ChatMessage[]
  } catch {}
  watch(
    messages,
    (value) => {
      try {
        localStorage.setItem(KEY, JSON.stringify(value))
      } catch {}
    },
    { deep: true }
  )

  const flash = (text: string) => {
    notice.value = text
    setTimeout(() => notice.value === text && (notice.value = ''), 4000)
  }

  const ask = (opts: {
    messages: ChatMessage[]
    signal?: AbortSignal
    onText?: (snapshot: string) => void
  }) =>
    streamDirect({
      request: {
        messages: opts.messages,
        mode: settings.editMode,
        model: settings.model,
        effort: settings.effort,
        fast: settings.fast
      },
      password: settings.password,
      signal: opts.signal,
      onText: opts.onText,
      onNotice: flash
    })

  const metricsFor = (result: StreamResult, extra: Partial<CueMetrics> = {}): CueMetrics => ({
    model: result.message.model,
    mode: settings.editMode,
    fast: settings.fast,
    ttftMs: result.ttftMs,
    totalMs: result.totalMs,
    outputTokens: result.message.usage.output_tokens,
    inputTokens: result.message.usage.input_tokens + (result.message.usage.cache_creation_input_tokens ?? 0),
    cacheReadTokens: result.message.usage.cache_read_input_tokens ?? 0,
    ...extra
  })

  /** Turn a move into a full program, building on `base`. */
  const programFor = (move: MoveSpec, base: string) => {
    if (settings.editMode === 'full' || typeof move.code === 'string') return move.code ?? base
    return applyBlockChanges({ code: base, changes: move.blocks ?? [], preamble: move.preamble })
  }

  /**
   * Create cues for every move in a reply and validate them all. Nothing launches unless every move is valid
   * (a reply is atomic), so a repair can resend the whole reply.
   */
  const materialise = async (opts: {
    output: DirectorOutput
    pending: Pending
    metrics: CueMetrics
    status?: 'generating' | 'idea'
  }) => {
    const { output, pending, metrics } = opts
    const replyId = crypto.randomUUID()
    let base = deck.basis?.code ?? ''
    const cues: Cue[] = []
    const failures: { index: number; title: string; errors: string[] }[] = []
    for (const [index, move] of output.moves.entries()) {
      const code = programFor(move, base)
      const cue = deck.create({
        title: move.title || 'Untitled',
        summary: move.summary,
        origin: opts.status === 'idea' ? 'idea' : 'direction',
        direction: pending.direction,
        when: move.when,
        code,
        bpm: move.bpm,
        visuals: move.visuals,
        requestCycle: pending.requestCycle,
        status: opts.status ?? 'generating',
        metrics,
        replyId
      })
      const result = await deck.compile(cue)
      cue.errors = result.errors
      cue.warnings = result.warnings
      if (!result.ok) failures.push({ index, title: cue.title, errors: result.errors })
      base = code
      cues.push(cue)
    }
    return { cues, failures }
  }

  const launchAll = async (cues: Cue[]) => {
    const arm = settings.launchMode === 'arm'
    const targets = planReply({
      whens: cues.map((cue) => (arm ? { type: 'manual' as const, bars: null } : cue.when)),
      requestCycle: cues[0]?.requestCycle ?? 0,
      frontier: clock.frontier(),
      phraseBars: settings.phraseBars,
      started: engine.started
    })
    for (const [i, cue] of cues.entries()) await deck.launch(cue.id, { target: targets[i] ?? null })
  }

  const process = async (pending: Pending) => {
    const controller = new AbortController()
    current = controller
    const placeholder = deck.create({
      title: pending.direction,
      origin: 'direction',
      direction: pending.direction,
      when: { type: 'next_phrase', bars: null },
      requestCycle: pending.requestCycle,
      status: 'generating',
      partial: ''
    })
    const userMessage: ChatMessage = {
      role: 'user',
      content: buildDirectionMessage({
        direction: pending.direction,
        requestCycle: pending.requestCycle,
        bpm: Math.round(engine.bpm),
        phraseBars: settings.phraseBars,
        launchMode: settings.launchMode,
        editMode: settings.editMode,
        started: engine.started,
        live: deck.live,
        queued: deck.queued,
        ready: deck.ready,
        basis: deck.basis,
        results: deck.takeResults()
      })
    }
    try {
      let conversation = [...messages.value, userMessage]
      const onText = (snapshot: string) => {
        const partial = peek(snapshot)
        placeholder.partial = snapshot
        if (partial.say) say.value = partial.say
        const title = partial.moves?.[0]?.title
        if (title) placeholder.title = title
      }
      let result = await ask({ messages: conversation, signal: controller.signal, onText })
      conversation = [...conversation, { role: 'assistant', content: result.message.content as unknown[] }]
      messages.value = conversation
      say.value = result.output.say
      deck.remove(placeholder.id)
      let { cues, failures } = await materialise({
        output: result.output,
        pending,
        metrics: metricsFor(result)
      })

      if (failures.length && settings.autoRepair) {
        for (const cue of cues) deck.remove(cue.id)
        const repairMessage: ChatMessage = { role: 'user', content: buildRepairMessage(failures) }
        const repairPlaceholder = deck.create({
          title: `Fixing: ${failures[0]!.title}`,
          origin: 'repair',
          direction: pending.direction,
          when: { type: 'next_phrase', bars: null },
          requestCycle: pending.requestCycle,
          status: 'generating',
          partial: ''
        })
        conversation = [...conversation, repairMessage]
        result = await ask({
          messages: conversation,
          signal: controller.signal,
          onText: (snapshot) => (repairPlaceholder.partial = snapshot)
        })
        messages.value = [
          ...conversation,
          { role: 'assistant', content: result.message.content as unknown[] }
        ]
        deck.remove(repairPlaceholder.id)
        say.value = result.output.say
        ;({ cues, failures } = await materialise({
          output: result.output,
          pending,
          metrics: metricsFor(result, { repaired: true })
        }))
      }

      if (failures.length) {
        for (const cue of cues) cue.status = 'failed'
        deck.report(
          `your reply to "${pending.direction}" failed validation: ${failures.map((f) => f.errors.join(' | ')).join('; ')}`
        )
        error.value = failures[0]!.errors[0] ?? 'Move failed validation'
        return
      }
      error.value = ''
      await launchAll(cues)
      void startIdeas(result.output.ideas)
    } catch (err) {
      deck.remove(placeholder.id)
      if (controller.signal.aborted) return
      error.value = err instanceof DirectorError || err instanceof Error ? err.message : String(err)
      console.error({ err })
    } finally {
      if (current === controller) current = undefined
    }
  }

  const pump = async () => {
    if (busy.value) return
    busy.value = true
    try {
      while (queue.value.length) await process(queue.value.shift()!)
    } finally {
      busy.value = false
    }
  }

  const stopIdeas = () => {
    for (const controller of ideaControllers) controller.abort()
    ideaControllers = []
    deck.clearIdeas()
  }

  /** Pre-generate Claude's suggested next moves as forks of the conversation (greyed cues). */
  const startIdeas = async (ideas: Idea[]) => {
    stopIdeas()
    const count = Math.min(settings.ideas, ideas.length)
    const base = messages.value
    await Promise.all(
      ideas.slice(0, count).map(async (idea, slot) => {
        const controller = new AbortController()
        ideaControllers.push(controller)
        const pending = { direction: idea.direction, requestCycle: engine.position() }
        const placeholder = deck.create({
          title: idea.title,
          summary: idea.direction,
          origin: 'idea',
          direction: idea.direction,
          when: { type: 'next_bar', bars: null },
          status: 'idea',
          partial: '',
          slot
        })
        const userMessage: ChatMessage = {
          role: 'user',
          content: buildDirectionMessage({
            direction: idea.direction,
            requestCycle: pending.requestCycle,
            bpm: Math.round(engine.bpm),
            phraseBars: settings.phraseBars,
            launchMode: settings.launchMode,
            editMode: settings.editMode,
            started: engine.started,
            live: deck.live,
            queued: deck.queued,
            ready: deck.ready,
            basis: deck.basis,
            results: []
          })
        }
        try {
          const fork = [...base, userMessage]
          const result = await ask({ messages: fork, signal: controller.signal })
          if (controller.signal.aborted || messages.value !== base) return deck.remove(placeholder.id)
          const first = result.output.moves[0]
          if (!first) return deck.remove(placeholder.id)
          const { cues, failures } = await materialise({
            output: { ...result.output, moves: [first] },
            pending,
            metrics: metricsFor(result),
            status: 'idea'
          })
          deck.remove(placeholder.id)
          const cue = cues[0]!
          if (failures.length || controller.signal.aborted) return deck.remove(cue.id)
          cue.title = idea.title
          cue.slot = slot
          cue.fork = [...fork, { role: 'assistant', content: result.message.content as unknown[] }]
        } catch {
          deck.remove(placeholder.id)
        }
      })
    )
  }

  // Playing an idea makes its fork part of the real conversation.
  deck.hooks.onIdeaPlayed = (cue) => {
    if (!cue.fork) return
    messages.value = [...cue.fork]
    for (const controller of ideaControllers) controller.abort()
    ideaControllers = []
  }

  /** Mute/unmute blocks locally and queue the result as a cue (no Claude round trip). */
  const muteBlocks = async (command: Extract<QuickCommand, { type: 'mute' | 'unmute' }>) => {
    const basis = deck.basis
    if (!basis) return
    const { code, changed } = setMuted({
      code: basis.code,
      names: command.names,
      muted: command.type === 'mute'
    })
    if (!changed) return flash(`No block called ${command.names.join(', ')}`)
    const cue = deck.create({
      title: `${command.type === 'mute' ? 'Mute' : 'Unmute'} ${command.names.join(', ')}`,
      origin: 'command',
      direction: `${command.type} ${command.names.join(', ')}`,
      when: { type: settings.goQuantize, bars: null },
      code,
      bpm: null,
      status: 'ready',
      inheritStart: basis.moveStart
    })
    const result = await deck.compile(cue)
    if (!result.ok) return flash(result.errors[0] ?? 'Could not apply')
    deck.report(`director ${command.type}d ${command.names.join(', ')} (quick command, #${cue.number})`)
    await deck.launch(cue.id, { quantize: settings.goQuantize })
  }

  const runCommand = async (command: QuickCommand) => {
    if (command.type === 'go') return deck.go()
    if (command.type === 'undo') return deck.undo()
    if (command.type === 'stop') return engine.stop()
    if (command.type === 'start') return engine.start()
    if (command.type === 'idea') {
      const idea = deck.ideas[command.index]
      return idea ? deck.playIdea(idea.id) : flash('No idea there yet')
    }
    if (command.type === 'cancel') {
      if (current) return current.abort()
      const last = deck.queued.at(-1)
      return last ? deck.cancel(last.id) : undefined
    }
    if (command.type === 'recall') return
    return muteBlocks(command)
  }

  /** Entry point for typed or spoken directions. */
  const direct = async (input: string, opts: { requestCycle?: number } = {}) => {
    const direction = input.trim()
    if (!direction) return
    const command = parseQuickCommand(direction)
    if (command?.type === 'recall') {
      // "back to the drop" names a cue: replay it instantly. Otherwise it's a musical direction for Claude.
      const played = deck.cues.filter((cue) => cue.number > 0 && ['played', 'live'].includes(cue.status))
      const match = matchCueTitle({ phrase: command.title, cues: played })
      if (match) return deck.recall(match.id)
    } else if (command) return runCommand(command)
    stopIdeas()
    error.value = ''
    queue.value.push({ direction, requestCycle: opts.requestCycle ?? engine.position() })
    await pump()
  }

  /** Abort whatever Claude is doing (and drop queued directions). */
  const abort = () => {
    queue.value = []
    current?.abort()
    stopIdeas()
  }

  /** Start a new set: forget the conversation, the deck and the stage look. */
  const newSet = () => {
    abort()
    engine.stop()
    messages.value = []
    deck.reset()
    visuals.reset()
    say.value = ''
    error.value = ''
  }

  return { messages, queue, busy, say, notice, error, direct, abort, newSet, runCommand }
})
