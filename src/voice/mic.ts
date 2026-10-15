// Microphone capture as 16 kHz mono 16-bit PCM chunks (what Deepgram's linear16 encoding expects).
// A dedicated AudioContext at 16 kHz makes the browser resample for us; an inline AudioWorklet taps frames
// and batches them into 40 ms chunks (Deepgram wants 20-250 ms, and 128-sample frames meant 125 socket sends/s).

const WORKLET = `
class Tap extends AudioWorkletProcessor {
  buffer = new Float32Array(640)
  filled = 0
  process(inputs) {
    const channel = inputs[0] && inputs[0][0]
    if (!channel) return true
    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.filled++] = channel[i]
      if (this.filled === this.buffer.length) {
        this.port.postMessage(this.buffer.slice(0))
        this.filled = 0
      }
    }
    return true
  }
}
registerProcessor('claude-strudel-tap', Tap)
`

export const SAMPLE_RATE = 16000

export interface Mic {
  stop(): void
  /** Latest input level 0..1 (for the meter). */
  level(): number
}

export const openMic = async (onChunk: (pcm: Int16Array<ArrayBuffer>) => void): Promise<Mic> => {
  // No browser noise suppression: it chews up speech over loud music, and Deepgram does better on raw audio.
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true, channelCount: 1 }
  })
  const context = new AudioContext({ sampleRate: SAMPLE_RATE })
  const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }))
  await context.audioWorklet.addModule(url)
  URL.revokeObjectURL(url)
  const source = context.createMediaStreamSource(stream)
  const tap = new AudioWorkletNode(context, 'claude-strudel-tap')
  let level = 0
  tap.port.onmessage = (event: MessageEvent<Float32Array>) => {
    const input = event.data
    const pcm = new Int16Array(input.length)
    let peak = 0
    for (let i = 0; i < input.length; i++) {
      const sample = Math.max(-1, Math.min(1, input[i]!))
      peak = Math.max(peak, Math.abs(sample))
      pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
    }
    level = level * 0.8 + peak * 0.2
    onChunk(pcm)
  }
  source.connect(tap)
  return {
    stop() {
      tap.disconnect()
      source.disconnect()
      for (const track of stream.getTracks()) track.stop()
      void context.close()
    },
    level: () => level
  }
}
