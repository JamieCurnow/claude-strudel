import { handleDirect } from './claude'
import { handleVoice } from './voice'

/** Optional shared-password gate (set APP_PASSWORD on deployed envs so nobody else spends your tokens). */
const authorised = (request: Request, env: Env) => {
  if (!env.APP_PASSWORD) return true
  const url = new URL(request.url)
  const given = request.headers.get('x-app-password') ?? url.searchParams.get('pw')
  return given === env.APP_PASSWORD
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/health') {
      return Response.json({
        ok: true,
        claude: !!env.ANTHROPIC_API_KEY,
        voice: !!env.DEEPGRAM_API_KEY,
        passwordRequired: !!env.APP_PASSWORD,
        authorised: authorised(request, env)
      })
    }
    if (url.pathname.startsWith('/api/') && !authorised(request, env)) {
      return Response.json({ error: 'Password required' }, { status: 401 })
    }
    if (url.pathname === '/api/direct' && request.method === 'POST') return handleDirect(request, env)
    if (url.pathname === '/api/voice') return handleVoice(request, env)
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
} satisfies ExportedHandler<Env>
