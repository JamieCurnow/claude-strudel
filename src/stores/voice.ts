import { defineStore } from 'pinia'
import { ref } from 'vue'
import { engine } from '@/engine/engine'
import { parseProgram } from '@/engine/program'
import { openMic, SAMPLE_RATE, type Mic } from '@/voice/mic'
import { useDeck } from './deck'
import { useDirector } from './director'
import { useSettings } from './settings'

/** Words Deepgram should expect (boosted recognition): music vocabulary + the current block names. */
const BASE_KEYTERMS = [
  'amen',
  'reese',
  'hats',
  'hi-hats',
  'snare',
  'kick',
  'sub',
  'bassline',
  'breakbeat',
  'jungle',
  'drum and bass',
  'techno',
  'house',
  'dubstep',
  'halftime',
  'riser',
  'snare roll',
  'reverb',
  'delay',
  'filter',
  'low pass',
  'high pass',
  'drop',
  'build',
  'breakdown',
  'bars',
  'phrase',
  'key change',
  'tempo',
  'bpm',
  'wobble',
  'acid',
  'pad',
  'stab',
  'arp',
  'chords',
  'minor',
  'major',
  'mute',
  'unmute',
  'undo',
  'strip it back',
  'Hydra'
]

type Status = 'off' | 'connecting' | 'listening' | 'finishing'

interface DeepgramResult {
  type: string
  is_final?: boolean
  from_finalize?: boolean
  channel?: { alternatives?: { transcript?: string }[] }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Hold-to-talk voice input. Press starts capturing straight away: audio waits in a backlog while the mic and
 * the WebSocket to the Worker's Deepgram proxy open (~0.5 s cold), then streams live. Release finalises the
 * transcript and sends it as a direction (timed from the bar you started talking on).
 */
export const useVoice = defineStore('voice', () => {
  const status = ref<Status>('off')
  const interim = ref('')
  const heard = ref('')
  const error = ref('')
  const level = ref(0)
  const deck = useDeck()
  const director = useDirector()
  const { settings } = useSettings()

  let mic: Promise<Mic> | undefined
  let socket: WebSocket | undefined
  let finals: string[] = []
  /** Mic audio belongs to an utterance... */
  let recording = false
  /** ...and goes straight to the socket (otherwise it waits in the backlog). */
  let streaming = false
  let backlog: Int16Array<ArrayBuffer>[] = []
  /** Every audio chunk of the last utterance (dev builds: `__show.voice.replay()`). */
  let clip: Int16Array<ArrayBuffer>[] = []
  let utterance = 0
  /** Resolves with the press's bar once its audio is streaming (undefined if it failed). */
  let starting: Promise<number | undefined> = Promise.resolve(undefined)
  /** Resolves once the previous utterance's transcript is in, so the next one can't bleed into it. */
  let finishing: Promise<unknown> = Promise.resolve()
  let keepAlive: ReturnType<typeof setInterval> | undefined
  let idleClose: ReturnType<typeof setTimeout> | undefined
  let meter = 0
  let finalised: (() => void) | undefined

  const keyterms = () => {
    const blocks = deck.basis ? parseProgram(deck.basis.code).blocks.map((block) => block.name) : []
    return [...new Set([...BASE_KEYTERMS, ...blocks])]
  }

  const onAudio = (pcm: Int16Array<ArrayBuffer>) => {
    if (!recording) return
    if (import.meta.env.DEV) clip.push(pcm)
    if (streaming && socket?.readyState === WebSocket.OPEN) socket.send(pcm)
    else backlog.push(pcm)
  }

  const openMicOnce = () => {
    mic ??= openMic(onAudio).catch((err: unknown) => {
      mic = undefined
      throw err
    })
    return mic
  }

  const connect = () =>
    new Promise<WebSocket>((resolve, reject) => {
      if (socket && socket.readyState === WebSocket.OPEN) return resolve(socket)
      const params = new URLSearchParams({ sample_rate: String(SAMPLE_RATE) })
      for (const term of keyterms()) params.append('keyterm', term)
      if (settings.password) params.set('pw', settings.password)
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${protocol}://${location.host}/api/voice?${params.toString()}`)
      ws.binaryType = 'arraybuffer'
      ws.onopen = () => resolve(ws)
      ws.onerror = () => reject(new Error('Voice connection failed (is DEEPGRAM_API_KEY set?)'))
      ws.onclose = () => {
        if (socket === ws) socket = undefined
        clearInterval(keepAlive)
      }
      ws.onmessage = (event: MessageEvent<string>) => {
        const data = JSON.parse(event.data) as DeepgramResult
        if (data.type !== 'Results') return
        const transcript = data.channel?.alternatives?.[0]?.transcript ?? ''
        if (data.is_final) {
          if (transcript) finals.push(transcript)
          interim.value = ''
          if (data.from_finalize) finalised?.()
        } else {
          interim.value = transcript
        }
        heard.value = [...finals, interim.value].filter(Boolean).join(' ')
      }
      socket = ws
      clearInterval(keepAlive)
      keepAlive = setInterval(() => {
        if (!streaming && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'KeepAlive' }))
      }, 4000)
    })

  const press = () => {
    if (status.value === 'listening' || status.value === 'connecting') return
    const id = ++utterance
    const requestCycle = engine.position()
    error.value = ''
    clearTimeout(idleClose)
    // Capture from now. If the last utterance is still finalising, its tail is cut and this one waits its turn.
    streaming = false
    recording = true
    backlog = []
    clip = []
    status.value = 'connecting'
    const previous = finishing
    starting = (async () => {
      let input: Mic
      try {
        ;[input] = await Promise.all([openMicOnce(), connect(), previous])
      } catch (err) {
        if (id === utterance) {
          recording = false
          status.value = 'off'
          error.value = err instanceof Error ? err.message : String(err)
        }
        return undefined
      }
      if (id !== utterance) return undefined
      finals = []
      interim.value = ''
      heard.value = ''
      for (const pcm of backlog) socket?.send(pcm)
      backlog = []
      streaming = true
      if (status.value === 'connecting') {
        status.value = 'listening'
        const tick = () => {
          level.value = input.level()
          if (status.value === 'listening' && id === utterance) meter = requestAnimationFrame(tick)
        }
        tick()
      }
      return requestCycle
    })()
  }

  /** Stop capturing, flush Deepgram and return the utterance's transcript. */
  const finish = async (opts: { id: number; started: Promise<number | undefined> }) => {
    const requestCycle = await opts.started
    if (requestCycle === undefined) return undefined
    // Keep sending briefly so the last syllable isn't clipped, then ask Deepgram to flush.
    await sleep(250)
    if (opts.id === utterance) {
      recording = false
      streaming = false
    }
    const done = new Promise<void>((resolve) => {
      finalised = resolve
      setTimeout(resolve, 1500)
    })
    socket?.send(JSON.stringify({ type: 'Finalize' }))
    await done
    finalised = undefined
    const text = [...finals, interim.value].filter(Boolean).join(' ').trim()
    return { text, requestCycle }
  }

  const release = async () => {
    if (status.value !== 'listening' && status.value !== 'connecting') return
    const id = utterance
    status.value = 'finishing'
    cancelAnimationFrame(meter)
    level.value = 0
    const result = finish({ id, started: starting })
    finishing = result
    const said = await result
    if (id === utterance) {
      status.value = 'off'
      interim.value = ''
      if (said) heard.value = said.text
      idleClose = setTimeout(() => {
        socket?.close()
        void mic?.then((m) => m.stop())
        mic = undefined
      }, 60_000)
    }
    if (said?.text) await director.direct(said.text, { requestCycle: said.requestCycle })
  }

  /** Dev aid: play back exactly what Deepgram was sent for the last utterance. */
  const replay = async () => {
    const samples = new Float32Array(clip.reduce((n, pcm) => n + pcm.length, 0))
    let offset = 0
    for (const pcm of clip) for (const sample of pcm) samples[offset++] = sample / 0x8000
    const context = new AudioContext({ sampleRate: SAMPLE_RATE })
    const buffer = context.createBuffer(1, samples.length, SAMPLE_RATE)
    buffer.copyToChannel(samples, 0)
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    source.onended = () => void context.close()
    source.start()
    return { seconds: samples.length / SAMPLE_RATE }
  }

  return { status, interim, heard, error, level, press, release, replay }
})
