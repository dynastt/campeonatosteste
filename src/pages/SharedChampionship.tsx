import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Championship, Team, Match, Round, GameDay, KnockoutMatch, KnockoutPhase } from '@/types/championship';
import { calculateStandings } from '@/utils/standings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Users, Calendar, LayoutGrid, Swords, Loader2, LinkIcon, Shield } from 'lucide-react';
import StandingsTable from '@/components/championship/StandingsTable';
import logoLffc from '@/assets/logo-lffc.png';

const PHASE_LABELS: Record<string, string> = {
  'round-of-16': 'Oitavas de Final',
  'quarter-finals': 'Quartas de Final',
  'semi-finals': 'Semifinais',
  'final': 'Final',
};

// Map raw DB rows to client types
function mapChampionship(row: any): Championship {
  return {
    id: row.id, name: row.name, startDate: row.start_date || undefined,
    description: row.description || undefined, teamIds: row.team_ids || [],
    gameDays: row.game_days || [], knockoutPhases: (row.knockout_phases || []) as KnockoutPhase[],
    gameDayNames: row.game_day_names || [], qualifyingTeams: row.qualifying_teams || {},
    logo: row.logo || undefined, deletedAt: row.deleted_at || undefined,
    createdAt: row.created_at,
  };
}
function mapTeam(row: any): Team { return { id: row.id, name: row.name, logo: row.logo || undefined, createdAt: row.created_at }; }
function mapMatch(row: any): Match {
  return {
    id: row.id, championshipId: row.championship_id, gameDayId: row.game_day_id || undefined,
    homeTeamId: row.home_team_id, awayTeamId: row.away_team_id,
    homeGoals: row.home_goals, awayGoals: row.away_goals,
    homeWO: row.home_wo, awayWO: row.away_wo,
    round: row.round, played: row.played, matchTime: row.match_time || undefined,
    createdAt: row.created_at,
  };
}
function mapRound(row: any): Round {
  return { id: row.id, championshipId: row.championship_id, gameDayId: row.game_day_id || undefined, number: row.number, name: row.name || undefined, date: row.date || undefined, createdAt: row.created_at };
}
function mapGameDay(row: any): GameDay {
  return { id: row.id, championshipId: row.championship_id, name: row.name, teamIds: row.team_ids || [], createdAt: row.created_at };
}
function mapKnockoutMatch(row: any): KnockoutMatch {
  return {
    id: row.id, championshipId: row.championship_id, phase: row.phase as KnockoutPhase,
    position: row.position, homeTeamId: row.home_team_id, awayTeamId: row.away_team_id,
    homeGoals: row.home_goals, awayGoals: row.away_goals,
    homeWO: row.home_wo, awayWO: row.away_wo, winnerId: row.winner_id, createdAt: row.created_at,
  };
}

const SharedChampionship = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [championship, setChampionship] = useState<Championship | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [gameDays, setGameDays] = useState<GameDay[]>([]);
  const [knockoutMatches, setKnockoutMatches] = useState<KnockoutMatch[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeGameDay, setActiveGameDay] = useState('');
  const [standingsMode, setStandingsMode] = useState<string>('points');
  const [gameDayStandingsMode, setGameDayStandingsMode] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      // Determine if it's a short code (<=8 chars alphanumeric) or old token (64 hex chars)
      const isShortCode = token.length <= 8;
      const paramName = isShortCode ? 'code' : 'token';
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/get-shared-championship?${paramName}=${encodeURIComponent(token)}`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erro ao carregar'); return; }

      setChampionship(mapChampionship(data.championship));
      setTeams(data.teams.map(mapTeam));
      setMatches(data.matches.map(mapMatch));
      setRounds(data.rounds.map(mapRound));
      setGameDays(data.gameDays.map(mapGameDay));
      setKnockoutMatches(data.knockoutMatches.map(mapKnockoutMatch));
      setError(null);
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Dynamically update meta tags for social sharing (works for Telegram, Discord, etc.)
  useEffect(() => {
    if (!championship) return;
    const title = `⚽ ${championship.name}`;
    const desc = championship.description || `${teams.length} times • Acompanhe ao vivo`;
    document.title = title;
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement;
      if (el) el.content = content;
    };
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:site_name', championship.name);
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', desc);
    setMeta('name', 'description', desc);
    if (championship.logo) {
      setMeta('property', 'og:image', championship.logo);
      setMeta('name', 'twitter:image', championship.logo);
    }
  }, [championship, teams.length]);

  // Realtime: subscribe to broadcast channel for live updates
  useEffect(() => {
    if (!championship) return;

    const channel = supabase
      .channel(`shared:${championship.id}`)
      .on('broadcast', { event: 'data_updated' }, () => {
        fetchData();
      })
      .subscribe();

    // Also poll every 15s as fallback
    const interval = setInterval(fetchData, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [championship?.id, fetchData]);

  const allGameDayMatches = useMemo(() => matches.filter(m => m.gameDayId), [matches]);
  const generalMatches = useMemo(() => matches.filter(m => !m.gameDayId), [matches]);
  const allRegularMatches = useMemo(() => [...allGameDayMatches, ...generalMatches], [allGameDayMatches, generalMatches]);
  const generalRounds = useMemo(() => rounds.filter(r => !r.gameDayId).sort((a, b) => a.number - b.number), [rounds]);

  const standings = useMemo(() => {
    if (allRegularMatches.length === 0) return calculateStandings(teams, []);
    const teamIds = new Set<string>();
    allRegularMatches.forEach(m => { if (m.homeTeamId) teamIds.add(m.homeTeamId); if (m.awayTeamId) teamIds.add(m.awayTeamId); });
    const relevantTeams = teams.filter(t => teamIds.has(t.id));
    return calculateStandings(relevantTeams.length > 0 ? relevantTeams : teams, allRegularMatches);
  }, [teams, allRegularMatches]);

  // Cumulative knockout standings per phase (same logic as KnockoutBracket)
  const phaseStandings = useMemo(() => {
    const phaseOrder: KnockoutPhase[] = ['round-of-16', 'quarter-finals', 'semi-finals', 'final'];
    const result: { phase: KnockoutPhase; label: string; standings: ReturnType<typeof calculateStandings> }[] = [];

    const regularStats = new Map<string, { points: number; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; woCount: number; gaveWO: boolean }>();
    const regularStandings = calculateStandings(teams, allRegularMatches);
    regularStandings.forEach(stat => {
      regularStats.set(stat.teamId, {
        points: stat.points, played: stat.played, won: stat.won, drawn: stat.drawn,
        lost: stat.lost, goalsFor: stat.goalsFor, goalsAgainst: stat.goalsAgainst,
        woCount: stat.woCount, gaveWO: stat.gaveWO,
      });
    });

    let accumulatedKnockoutStats = new Map<string, { points: number; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; woCount: number; gaveWO: boolean }>();

    for (const phase of phaseOrder) {
      const phaseMatches = knockoutMatches.filter(m => m.phase === phase);
      if (phaseMatches.length === 0) continue;

      const pTeamIds = new Set<string>();
      phaseMatches.forEach(m => {
        if (m.homeTeamId) pTeamIds.add(m.homeTeamId);
        if (m.awayTeamId) pTeamIds.add(m.awayTeamId);
      });
      const phaseTeams = teams.filter(t => pTeamIds.has(t.id));

      const matchesForStandings: Match[] = phaseMatches.map(m => ({
        id: m.id, championshipId: m.championshipId,
        homeTeamId: m.homeTeamId || '', awayTeamId: m.awayTeamId || '',
        homeGoals: m.homeGoals, awayGoals: m.awayGoals,
        homeWO: m.homeWO, awayWO: m.awayWO,
        round: 0, played: m.homeGoals !== null || m.homeWO || m.awayWO,
        createdAt: m.createdAt,
      }));

      const currentPhaseStats = calculateStandings(phaseTeams, matchesForStandings);

      const cumulativeStandings = currentPhaseStats.map(stat => {
        const regular = regularStats.get(stat.teamId);
        const prevKnockout = accumulatedKnockoutStats.get(stat.teamId);

        let tp = stat.points, tpl = stat.played, tw = stat.won, td = stat.drawn, tl = stat.lost, tgf = stat.goalsFor, tga = stat.goalsAgainst, two = stat.woCount, tgw = stat.gaveWO;

        if (regular) { tp += regular.points; tpl += regular.played; tw += regular.won; td += regular.drawn; tl += regular.lost; tgf += regular.goalsFor; tga += regular.goalsAgainst; two += regular.woCount; tgw = tgw || regular.gaveWO; }
        if (prevKnockout) { tp += prevKnockout.points; tpl += prevKnockout.played; tw += prevKnockout.won; td += prevKnockout.drawn; tl += prevKnockout.lost; tgf += prevKnockout.goalsFor; tga += prevKnockout.goalsAgainst; two += prevKnockout.woCount; tgw = tgw || prevKnockout.gaveWO; }

        return { ...stat, points: tp, played: tpl, won: tw, drawn: td, lost: tl, goalsFor: tgf, goalsAgainst: tga, goalDifference: tgf - tga, gaveWO: tgw, woCount: two, pointsPercentage: tpl > 0 ? (tp / (tpl * 3)) * 100 : 0 };
      });

      cumulativeStandings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.won !== a.won) return b.won - a.won;
        if (a.gaveWO !== b.gaveWO) return a.gaveWO ? 1 : -1;
        if (a.goalsAgainst !== b.goalsAgainst) return a.goalsAgainst - b.goalsAgainst;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return a.team.name.localeCompare(b.team.name);
      });

      const label = PHASE_LABELS[phase] || '';
      result.push({ phase, label, standings: cumulativeStandings });

      const newAccumulated = new Map(accumulatedKnockoutStats);
      currentPhaseStats.forEach(stat => {
        const prev = newAccumulated.get(stat.teamId);
        if (prev) {
          newAccumulated.set(stat.teamId, { points: prev.points + stat.points, played: prev.played + stat.played, won: prev.won + stat.won, drawn: prev.drawn + stat.drawn, lost: prev.lost + stat.lost, goalsFor: prev.goalsFor + stat.goalsFor, goalsAgainst: prev.goalsAgainst + stat.goalsAgainst, woCount: prev.woCount + stat.woCount, gaveWO: prev.gaveWO || stat.gaveWO });
        } else {
          newAccumulated.set(stat.teamId, { points: stat.points, played: stat.played, won: stat.won, drawn: stat.drawn, lost: stat.lost, goalsFor: stat.goalsFor, goalsAgainst: stat.goalsAgainst, woCount: stat.woCount, gaveWO: stat.gaveWO });
        }
      });
      accumulatedKnockoutStats = newAccumulated;
    }

    return result;
  }, [knockoutMatches, teams, allRegularMatches]);

  useEffect(() => {
    if (gameDays.length > 0 && !activeGameDay) setActiveGameDay(gameDays[0].id);
  }, [gameDays, activeGameDay]);

  if (loading) return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (error || !championship) return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-gradient-card border-border/50">
        <CardContent className="py-12 text-center">
          <LinkIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Link inválido</h2>
          <p className="text-muted-foreground">{error || 'Campeonato não encontrado'}</p>
        </CardContent>
      </Card>
    </div>
  );

  const playedCount = matches.filter(m => m.homeGoals !== null && m.awayGoals !== null || m.homeWO || m.awayWO).length;

  const getTeamName = (id: string | null) => {
    if (!id) return '—';
    return teams.find(t => t.id === id)?.name || '—';
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              {championship.logo ? (
                <img src={championship.logo} alt={championship.name} className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl object-cover shadow-lg" />
              ) : (
                <img src={logoLffc} alt="LFFC" className="h-12 w-12 sm:h-14 sm:w-14 object-contain" />
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{championship.name}</h1>
                {championship.description && <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">{championship.description}</p>}
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <LinkIcon className="h-3 w-3" /> Visualização pública • Somente leitura
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-2 rounded-lg">
                <Users className="h-4 w-4" /><span className="font-medium">{teams.length} times</span>
              </div>
              <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-2 rounded-lg">
                <Calendar className="h-4 w-4" /><span className="font-medium">{playedCount} jogos</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 h-auto p-1 bg-muted/50">
              <TabsTrigger value="overview" className="gap-2 px-3 sm:px-4 py-2.5 text-sm">
                <Trophy className="h-4 w-4" /><span className="hidden sm:inline">Visão Geral</span><span className="sm:hidden">Geral</span>
              </TabsTrigger>
              {gameDays.length > 0 && (
                <TabsTrigger value="game-days" className="gap-2 px-3 sm:px-4 py-2.5 text-sm">
                  <Calendar className="h-4 w-4" /><span className="hidden sm:inline">Dias de Jogo</span><span className="sm:hidden">Dias</span>
                </TabsTrigger>
              )}
              {knockoutMatches.length > 0 && (
                <TabsTrigger value="knockout" className="gap-2 px-3 sm:px-4 py-2.5 text-sm">
                  <Swords className="h-4 w-4" /><span className="hidden sm:inline">Eliminatórias</span><span className="sm:hidden">Mata-mata</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="teams" className="gap-2 px-3 sm:px-4 py-2.5 text-sm">
                <Users className="h-4 w-4" /><span className="hidden sm:inline">Times</span><span className="sm:hidden">Times</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" />Classificação Geral</CardTitle>
                    <CardDescription>Dias de jogo + Rodadas gerais</CardDescription>
                  </div>
                  <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
                    <button onClick={() => setStandingsMode('points')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${standingsMode === 'points' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>P</button>
                    <button onClick={() => setStandingsMode('percentage')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${standingsMode === 'percentage' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>%</button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <StandingsTable standings={standings} title={`Classificação - ${championship.name}`} championshipName={championship.name} sortByPercentage={standingsMode === 'percentage'} showExport={false} championshipLogo={championship.logo} />
              </CardContent>
            </Card>

            {/* General rounds read-only */}
            {generalRounds.length > 0 && (
              <Card className="bg-gradient-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><LayoutGrid className="h-5 w-5 text-primary" />Rodadas Gerais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {generalRounds.map(round => {
                    const roundMatches = matches.filter(m => m.round === round.number && !m.gameDayId);
                    const dateStr = round.date ? (() => { const [y,mo,d] = round.date!.split('-'); return `${d}/${mo}/${y}`; })() : null;
                    return (
                      <div key={round.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-muted-foreground">{round.name || `Rodada ${round.number}`}</h4>
                          {dateStr && <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{dateStr}</span>}
                        </div>
                        {roundMatches.map(match => (
                          <div key={match.id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/30 border border-border/30">
                            {match.matchTime && <span className="text-xs text-muted-foreground font-medium min-w-[40px] text-center flex-shrink-0">{match.matchTime}</span>}
                            <span className="text-xs sm:text-sm font-medium truncate flex-1 text-right">{getTeamName(match.homeTeamId)}</span>
                            <span className="mx-2 sm:mx-3 text-xs sm:text-sm font-bold text-primary min-w-[40px] sm:min-w-[50px] text-center whitespace-nowrap">
                              {match.homeGoals !== null ? `${match.homeGoals} x ${match.awayGoals}` : match.homeWO ? 'W.O.' : match.awayWO ? 'W.O.' : '— x —'}
                            </span>
                            <span className="text-xs sm:text-sm font-medium truncate flex-1">{getTeamName(match.awayTeamId)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Game Days */}
          <TabsContent value="game-days" className="space-y-4">
            {gameDays.length > 0 && (
              <Tabs value={activeGameDay} onValueChange={setActiveGameDay}>
                <div className="overflow-x-auto -mx-4 px-4">
                  <TabsList className="inline-flex w-auto h-auto p-1 bg-muted/50 mb-4">
                    {gameDays.map(day => (
                      <TabsTrigger key={day.id} value={day.id} className="gap-1.5 px-3 sm:px-4 py-2.5 text-sm">
                        {day.name} <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{day.teamIds.length}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                {gameDays.map(day => {
                  const dayTeams = teams.filter(t => day.teamIds.includes(t.id));
                  const dayMatches = matches.filter(m => m.gameDayId === day.id);
                  const dayRounds = rounds.filter(r => r.gameDayId === day.id).sort((a, b) => a.number - b.number);
                  const dayStandings = calculateStandings(dayTeams, dayMatches);
                  return (
                    <TabsContent key={day.id} value={day.id} className="space-y-4">
                      <Card className="bg-gradient-card border-border/50">
                        <CardHeader>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <CardTitle className="text-lg">{day.name} - Classificação</CardTitle>
                            <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
                              <button onClick={() => setGameDayStandingsMode(prev => ({ ...prev, [day.id]: 'points' }))} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${(gameDayStandingsMode[day.id] || 'points') === 'points' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>P</button>
                              <button onClick={() => setGameDayStandingsMode(prev => ({ ...prev, [day.id]: 'percentage' }))} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${(gameDayStandingsMode[day.id] || 'points') === 'percentage' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>%</button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <StandingsTable standings={dayStandings} title={`Classificação - ${day.name}`} championshipName={championship.name} showExport={false} qualifyingCount={championship.qualifyingTeams?.[day.name]} sortByPercentage={(gameDayStandingsMode[day.id] || 'points') === 'percentage'} championshipLogo={championship.logo} />
                        </CardContent>
                      </Card>
                      {dayRounds.length > 0 && (
                        <Card className="bg-gradient-card border-border/50">
                          <CardHeader><CardTitle className="text-lg">Rodadas - {day.name}</CardTitle></CardHeader>
                          <CardContent className="space-y-4">
                            {dayRounds.map(round => {
                              const roundMatches = dayMatches.filter(m => m.round === round.number);
                              const dateStr = round.date ? (() => { const [y,mo,d] = round.date!.split('-'); return `${d}/${mo}/${y}`; })() : null;
                              return (
                                <div key={round.id} className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-semibold text-muted-foreground">{round.name || `Rodada ${round.number}`}</h4>
                                    {dateStr && <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{dateStr}</span>}
                                  </div>
                                  {roundMatches.map(match => (
                                    <div key={match.id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/30 border border-border/30">
                                      {match.matchTime && <span className="text-xs text-muted-foreground font-medium min-w-[40px] text-center flex-shrink-0">{match.matchTime}</span>}
                                      <span className="text-xs sm:text-sm font-medium truncate flex-1 text-right">{getTeamName(match.homeTeamId)}</span>
                                      <span className="mx-2 sm:mx-3 text-xs sm:text-sm font-bold text-primary min-w-[40px] sm:min-w-[50px] text-center whitespace-nowrap">
                                        {match.homeGoals !== null ? `${match.homeGoals} x ${match.awayGoals}` : match.homeWO ? 'W.O.' : match.awayWO ? 'W.O.' : '— x —'}
                                      </span>
                                      <span className="text-xs sm:text-sm font-medium truncate flex-1">{getTeamName(match.awayTeamId)}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </TabsContent>

          {/* Knockout */}
          <TabsContent value="knockout" className="space-y-4">
            {/* Cumulative standings per phase */}
            {phaseStandings.map(({ phase, label, standings: phaseStandingsData }) => (
              phaseStandingsData.length > 0 && (
                <Card key={`standings-${phase}`} className="bg-gradient-card border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      Classificação - {label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StandingsTable standings={phaseStandingsData} title={`Classificação - ${label}`} championshipName={championship.name} showExport={false} championshipLogo={championship.logo} />
                  </CardContent>
                </Card>
              )
            ))}

            {/* Knockout matches per phase */}
            {(championship.knockoutPhases || []).map(phase => {
              const phaseMatches = knockoutMatches.filter(m => m.phase === phase).sort((a, b) => a.position - b.position);
              if (phaseMatches.length === 0) return null;
              return (
                <Card key={phase} className="bg-gradient-card border-border/50">
                  <CardHeader><CardTitle className="flex items-center gap-2"><Swords className="h-5 w-5 text-primary" />{PHASE_LABELS[phase]}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {(() => {
                      const half = Math.ceil(phaseMatches.length / 2);
                      const showSeparator = phaseMatches.length > 1;
                      const renderMatch = (match: KnockoutMatch) => (
                        <div key={match.id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/30 border border-border/30">
                          <span className={`text-xs sm:text-sm font-medium truncate flex-1 text-right ${match.winnerId === match.homeTeamId ? 'text-primary font-bold' : ''}`}>
                            {getTeamName(match.homeTeamId)}
                          </span>
                          <span className="mx-2 sm:mx-3 text-xs sm:text-sm font-bold text-primary min-w-[40px] sm:min-w-[50px] text-center whitespace-nowrap">
                            {match.homeGoals !== null ? `${match.homeGoals} x ${match.awayGoals}` : '— x —'}
                          </span>
                          <span className={`text-xs sm:text-sm font-medium truncate flex-1 ${match.winnerId === match.awayTeamId ? 'text-primary font-bold' : ''}`}>
                            {getTeamName(match.awayTeamId)}
                          </span>
                        </div>
                      );
                      return (
                        <>
                          {phaseMatches.slice(0, half).map(renderMatch)}
                          {showSeparator && <div className="border-t border-border/50 my-1" />}
                          {phaseMatches.slice(half).map(renderMatch)}
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Teams */}
          <TabsContent value="teams" className="space-y-4">
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Times ({teams.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {teams.map(team => (
                    <div key={team.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                      {team.logo ? (
                        <img src={team.logo} alt={team.name} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <Shield className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <span className="text-sm font-medium">{team.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SharedChampionship;
