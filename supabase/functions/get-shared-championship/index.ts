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
    const token = url.searchParams.get('token')

    // Validate token format: must be exactly 64 hex characters
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      return new Response(JSON.stringify({ error: 'Invalid token format' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Validate token
    const { data: share, error: shareError } = await supabase
      .from('championship_shares')
      .select('championship_id')
      .eq('token', token)
      .single()

    if (shareError || !share) {
      return new Response(JSON.stringify({ error: 'Invalid or expired link' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const champId = share.championship_id

    // Fetch all championship data in parallel
    const [champRes, matchesRes, roundsRes, gameDaysRes, knockoutRes] = await Promise.all([
      supabase.from('championships').select('*').eq('id', champId).single(),
      supabase.from('matches').select('*').eq('championship_id', champId),
      supabase.from('rounds').select('*').eq('championship_id', champId).order('number'),
      supabase.from('game_days').select('*').eq('championship_id', champId),
      supabase.from('knockout_matches').select('*').eq('championship_id', champId).order('position'),
    ])

    if (champRes.error || !champRes.data) {
      return new Response(JSON.stringify({ error: 'Championship not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get team IDs from championship
    const teamIds: string[] = champRes.data.team_ids || []

    // Fetch teams
    let teams: any[] = []
    if (teamIds.length > 0) {
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds)
        .order('name')
      teams = teamsData || []
    }

    return new Response(JSON.stringify({
      championship: champRes.data,
      teams,
      matches: matchesRes.data || [],
      rounds: roundsRes.data || [],
      gameDays: gameDaysRes.data || [],
      knockoutMatches: knockoutRes.data || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
