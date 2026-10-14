const DEEPGRAM_LISTEN = 'https://api.deepgram.com/v1/listen'

/** Keep keyterms to short plain words/phrases (they are forwarded to Deepgram as query params). */
const cleanKeyterms = (terms: string[]) =>
  [...new Set(terms.map((t) => t.trim().slice(0, 40)).filter((t) => /^[\w\s'-]+$/.test(t)))].slice(0, 80)

/**
 * GET /api/voice (WebSocket) - proxy the browser's microphone stream to Deepgram's streaming API so the
 * Deepgram key never reaches the browser. Audio frames go up, transcript JSON comes back down, untouched.
 */
export const handleVoice = async (request: Request, env: Env) => {
  if (request.headers.get('Upgrade') !== 'websocket')
    return new Response('Expected WebSocket', { status: 426 })
  if (!env.DEEPGRAM_API_KEY) return new Response('DEEPGRAM_API_KEY is not set', { status: 501 })

  const url = new URL(request.url)
  const params = new URLSearchParams({
    model: 'nova-3',
    language: 'en',
    encoding: 'linear16',
    sample_rate: url.searchParams.get('sample_rate') ?? '16000',
    channels: '1',
    interim_results: 'true',
    smart_format: 'true',
    endpointing: '400'
  })
  for (const term of cleanKeyterms(url.searchParams.getAll('keyterm'))) params.append('keyterm', term)

  const upstreamResponse = await fetch(`${DEEPGRAM_LISTEN}?${params.toString()}`, {
    headers: { Upgrade: 'websocket', Authorization: `Token ${env.DEEPGRAM_API_KEY}` }
  })
  const upstream = upstreamResponse.webSocket
  if (!upstream)
    return new Response(`Deepgram refused the connection (${upstreamResponse.status})`, { status: 502 })
  upstream.accept()

  const pair = new WebSocketPair()
  const [client, server] = [pair[0], pair[1]]
  server.accept()

  // Binary frames can arrive as a Blob (local dev runtime); convert, keeping frame order.
  let forward = Promise.resolve()
  server.addEventListener('message', (event) => {
    const data = event.data as string | ArrayBuffer | Blob
    forward = forward
      .then(async () => upstream.send(data instanceof Blob ? await data.arrayBuffer() : data))
      .catch(() => server.close(1011, 'upstream closed'))
  })
  upstream.addEventListener('message', (event) => {
    try {
      server.send(event.data)
    } catch {
      upstream.close(1000)
    }
  })
  const closeBoth = (code = 1000, reason = '') => {
    try {
      upstream.close(code, reason)
    } catch {}
    try {
      server.close(code, reason)
    } catch {}
  }
  server.addEventListener('close', (event) => closeBoth(1000, event.reason))
  upstream.addEventListener('close', (event) =>
    closeBoth(event.code === 1005 ? 1000 : event.code, event.reason)
  )
  server.addEventListener('error', () => closeBoth(1011))
  upstream.addEventListener('error', () => closeBoth(1011))

  return new Response(null, { status: 101, webSocket: client })
}
