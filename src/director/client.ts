import { BetaMessageStream } from '@anthropic-ai/sdk/lib/BetaMessageStream'
import type { BetaMessage } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import type { DirectRequest, DirectorOutput } from '#shared/director'

export class DirectorError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message)
  }
}

export interface StreamResult {
  message: BetaMessage
  output: DirectorOutput
  ttftMs?: number
  totalMs: number
}

/** Split a text stream into lines. */
const lines = () => {
  let buffer = ''
  return new TransformStream<string, string>({
    transform(chunk, controller) {
      buffer += chunk
      let index
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index)
        buffer = buffer.slice(index + 1)
        if (line.trim()) controller.enqueue(line)
      }
    },
    flush(controller) {
      if (buffer.trim()) controller.enqueue(buffer)
    }
  })
}

/**
 * POST a direction to the Worker and stream Claude's reply. The Worker sends raw stream events as NDJSON
 * (plus our own app_notice / app_error lines); the SDK's BetaMessageStream rebuilds the full message, so
 * thinking blocks etc. can be appended to the conversation exactly as returned.
 */
export const streamDirect = async (opts: {
  request: DirectRequest
  password?: string
  signal?: AbortSignal
  onText?: (snapshot: string) => void
  onNotice?: (message: string) => void
}): Promise<StreamResult> => {
  const { request, password, signal, onText, onNotice } = opts
  const started = performance.now()
  const res = await fetch('/api/direct', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(password ? { 'x-app-password': password } : {}) },
    body: JSON.stringify(request),
    signal
  })
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new DirectorError(body.error ?? `Request failed (${res.status})`, res.status)
  }

  let appError: { status: number; message: string } | undefined
  const events = res.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(lines())
    .pipeThrough(
      new TransformStream<string, string>({
        transform(line, controller) {
          const event = JSON.parse(line) as { type: string; status?: number; message?: string }
          if (event.type === 'app_error')
            appError = { status: event.status ?? 500, message: event.message ?? 'Error' }
          else if (event.type === 'app_notice') onNotice?.(event.message ?? '')
          else controller.enqueue(`${line}\n`)
        }
      })
    )
    .pipeThrough(new TextEncoderStream())

  const stream = BetaMessageStream.fromReadableStream(events)
  let ttftMs: number | undefined
  stream.on('text', (_delta, snapshot) => {
    ttftMs ??= performance.now() - started
    onText?.(snapshot)
  })
  signal?.addEventListener('abort', () => stream.abort())

  let message: BetaMessage
  try {
    message = await stream.finalMessage()
  } catch (err) {
    if (appError) throw new DirectorError(appError.message, appError.status)
    throw err
  }
  if (message.stop_reason === 'refusal') throw new DirectorError('Claude declined this direction')
  if (message.stop_reason === 'max_tokens') throw new DirectorError('Reply was cut off (max tokens)')
  const text = message.content.find((block) => block.type === 'text')?.text
  if (!text) throw new DirectorError('Empty reply')
  let output: DirectorOutput
  try {
    output = JSON.parse(text) as DirectorOutput
  } catch {
    throw new DirectorError('Reply was not valid JSON')
  }
  return { message, output, ttftMs, totalMs: performance.now() - started }
}
