export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/health') return Response.json({ ok: true, claude: !!env.ANTHROPIC_API_KEY })
    return new Response('Not found', { status: 404 })
  }
} satisfies ExportedHandler<Env>
