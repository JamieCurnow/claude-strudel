import { defineStore } from 'pinia'
import { ref } from 'vue'
import { parseProgram } from '@/engine/program'
import { openMic, SAMPLE_RATE, type Mic } from '@/voice/mic'
import { useClock } from './clock'
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

/**
 * Hold-to-talk voice input. Press opens the mic + a WebSocket to the Worker's Deepgram proxy, release
 * finalises the transcript and sends it as a direction (timed from the bar you started talking on).
 */
export const useVoice = defineStore('voice', () => {
  const status = ref<Status>('off')
  const interim = ref('')
  const heard = ref('')
  const error = ref('')
  const level = ref(0)
  const clock = useClock()
  const deck = useDeck()
  const director = useDirector()
  const { settings } = useSettings()

  let mic: Mic | undefined
  let socket: WebSocket | undefined
  let finals: string[] = []
  let sending = false
  let pressCycle = 0
  let keepAlive: ReturnType<typeof setInterval> | undefined
  let idleClose: ReturnType<typeof setTimeout> | undefined
  let meter = 0
  let finalised: (() => void) | undefined

  const keyterms = () => {
    const blocks = deck.basis ? parseProgram(deck.basis.code).blocks.map((block) => block.name) : []
    return [...new Set([...BASE_KEYTERMS, ...blocks])]
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
        if (!sending && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'KeepAlive' }))
      }, 4000)
    })

  const press = async () => {
    if (status.value === 'listening' || status.value === 'connecting') return
    error.value = ''
    clearTimeout(idleClose)
    pressCycle = clock.cycle
    finals = []
    interim.value = ''
    heard.value = ''
    status.value = 'connecting'
    try {
      await connect()
      // The mic outlives individual sockets, so always send to the current one.
      mic ??= await openMic((pcm) => {
        if (sending && socket?.readyState === WebSocket.OPEN) socket.send(pcm)
      })
      sending = true
      status.value = 'listening'
      const tick = () => {
        level.value = mic?.level() ?? 0
        if (status.value === 'listening') meter = requestAnimationFrame(tick)
      }
      meter = requestAnimationFrame(tick)
    } catch (err) {
      status.value = 'off'
      error.value = err instanceof Error ? err.message : String(err)
    }
  }

  const release = async () => {
    if (status.value !== 'listening') {
      if (status.value === 'connecting') status.value = 'off'
      return
    }
    status.value = 'finishing'
    cancelAnimationFrame(meter)
    level.value = 0
    // Keep sending briefly so the last syllable isn't clipped, then ask Deepgram to flush.
    await new Promise((resolve) => setTimeout(resolve, 250))
    sending = false
    const done = new Promise<void>((resolve) => {
      finalised = resolve
      setTimeout(resolve, 1500)
    })
    socket?.send(JSON.stringify({ type: 'Finalize' }))
    await done
    finalised = undefined
    const text = [...finals, interim.value].filter(Boolean).join(' ').trim()
    status.value = 'off'
    interim.value = ''
    heard.value = text
    idleClose = setTimeout(() => {
      socket?.close()
      mic?.stop()
      mic = undefined
    }, 60_000)
    if (text) await director.direct(text, { requestCycle: pressCycle })
  }

  return { status, interim, heard, error, level, press, release }
})
