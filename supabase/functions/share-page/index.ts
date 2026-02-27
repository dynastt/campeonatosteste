import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('c')

    if (!code || !/^[a-z0-9]{6,8}$/i.test(code)) {
      return new Response('<html><body><h1>Link inválido</h1></body></html>', {
        status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Look up by short_code
    const { data: share, error: shareError } = await supabase
      .from('championship_shares')
      .select('championship_id, token, short_code')
      .eq('short_code', code)
      .single()

    if (shareError || !share) {
      return new Response('<html><body><h1>Link inválido ou expirado</h1></body></html>', {
        status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }

    // Fetch championship info
    const { data: champ } = await supabase
      .from('championships')
      .select('name, description, logo, team_ids')
      .eq('id', share.championship_id)
      .single()

    if (!champ) {
      return new Response('<html><body><h1>Campeonato não encontrado</h1></body></html>', {
        status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }

    // Count teams and get match count
    const teamCount = (champ.team_ids || []).length
    const { count: matchCount } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('championship_id', share.championship_id)

    const title = champ.name || 'Campeonato'
    const description = champ.description || `${teamCount} times • ${matchCount || 0} jogos`
    const ogImage = champ.logo || ''
    
    // Build the SPA URL for redirect
    const appUrl = Deno.env.get('APP_URL') || 'https://campeonatofranca.lovable.app'
    const spaUrl = `${appUrl}/share/${share.short_code}`

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  
  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="⚽ ${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:site_name" content="${escapeHtml(title)}">
  ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}">` : ''}
  <meta property="og:url" content="${escapeHtml(spaUrl)}">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="⚽ ${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  ${ogImage ? `<meta name="twitter:image" content="${escapeHtml(ogImage)}">` : ''}
  
  <!-- Redirect to SPA -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(spaUrl)}">
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0a0a0a; color: #fff; }
    .container { text-align: center; padding: 2rem; }
    a { color: #22c55e; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚽ ${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <p>Redirecionando... <a href="${escapeHtml(spaUrl)}">Clique aqui</a> se não for redirecionado.</p>
  </div>
  <script>window.location.href = "${spaUrl.replace(/"/g, '\\"')}";</script>
</body>
</html>`

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  } catch (_err) {
    return new Response('<html><body><h1>Erro interno</h1></body></html>', {
      status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }
})

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
