import Anthropic from '@anthropic-ai/sdk'
import type { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import { directorSchema, EFFORTS, isModelId, MODELS, type DirectRequest } from '#shared/director'
import { SYSTEM_PROMPT } from './prompt/system'

const MAX_MESSAGES = 2000

const bad = (message: string) => Response.json({ error: message }, { status: 400 })

/**
 * POST /api/direct - stream Claude's reply to a direction.
 * The browser owns the conversation (append-only) and sends it whole; the Worker owns the system prompt,
 * the output schema and the model settings allow-list. The response is newline-delimited JSON: the raw
 * stream events (which the browser rebuilds into a message with the SDK), plus our own `app_notice` and
 * `app_error` lines.
 */
export const handleDirect = async (request: Request, env: Env) => {
  if (!env.ANTHROPIC_API_KEY) return Response.json({ error: 'ANTHROPIC_API_KEY is not set' }, { status: 500 })
  let body: DirectRequest
  try {
    body = await request.json()
  } catch {
    return bad('Invalid JSON')
  }
  const { messages, mode, model, effort, fast } = body
  if (!Array.isArray(messages) || !messages.length || messages.length > MAX_MESSAGES)
    return bad('Bad messages')
  if (mode !== 'full' && mode !== 'blocks') return bad('Bad mode')
  if (!isModelId(model)) return bad('Bad model')
  if (!EFFORTS.includes(effort)) return bad('Bad effort')
  const fastMode = !!fast && MODELS.find((m) => m.id === model)?.fast === true

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  const open = (fastMode: boolean) =>
    client.beta.messages.stream(
      {
        model,
        max_tokens: 32000,
        betas: [
          'server-side-fallback-2026-07-01',
          'thinking-binding-controls-2026-08-01',
          ...(fastMode ? ['fast-mode-2026-02-01'] : [])
        ],
        // Refusals are re-run on Anthropic's recommended fallback model server-side.
        fallbacks: 'default',
        ...(fastMode ? { speed: 'fast' as const } : {}),
        // Frozen for the whole set: anything per-request goes in the user turn (see EDIT_MODE_LINE).
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral', ttl: '1h' } }],
        // Thinking blocks are bound to the exact prefix that produced them. If that prefix changed (a deploy
        // changed the prompt, a model switch), drop the stale reasoning instead of failing the request.
        thinking: { type: 'adaptive', block_binding: { prefix_mismatch_behavior: 'drop_block' } },
        // Caches the whole conversation prefix too (the conversation is append-only).
        cache_control: { type: 'ephemeral', ttl: '1h' },
        messages: messages as BetaMessageParam[],
        output_config: { effort, format: { type: 'json_schema', schema: directorSchema(mode) } }
      },
      { signal: request.signal }
    )

  const encoder = new TextEncoder()
  const output = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (line: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`))
      let useFast = fastMode
      for (let attempt = 0; attempt < 2; attempt++) {
        let sent = 0
        try {
          for await (const event of open(useFast)) {
            send(event)
            sent++
          }
          break
        } catch (err) {
          const status = (err as { status?: number }).status
          // Fast mode has its own (sometimes zero) rate limit: fall back to standard speed once.
          if (useFast && status === 429 && sent === 0) {
            useFast = false
            send({
              type: 'app_notice',
              message: 'Fast mode unavailable (rate limited), using standard speed'
            })
            continue
          }
          if (request.signal.aborted) break
          send({ type: 'app_error', status: status ?? 500, message: errorMessage(err) })
          break
        }
      }
      controller.close()
    }
  })
  return new Response(output, {
    headers: { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' }
  })
}

const errorMessage = (err: unknown) => {
  const apiError = (err as { error?: { error?: { message?: string } } }).error?.error?.message
  return apiError ?? (err instanceof Error ? err.message : String(err))
}
