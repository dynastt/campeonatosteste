import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useChampionships } from '@/hooks/useChampionships';
import { calculateStandings } from '@/utils/standings';
import { KnockoutPhase, Match } from '@/types/championship';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Trophy, Users, Calendar, Plus, LayoutGrid, Settings, Swords, Percent, Hash, Share2, Copy, Check, Loader2 } from 'lucide-react';
import StandingsTable from '@/components/championship/StandingsTable';
import TeamsList from '@/components/championship/TeamsList';
import RoundsList from '@/components/championship/RoundsList';
import AddTeamDialog from '@/components/championship/AddTeamDialog';
import KnockoutBracket from '@/components/championship/KnockoutBracket';
import GameDayManager from '@/components/championship/GameDayManager';
import SponsorsBar from '@/components/championship/SponsorsBar';
import SponsorsManager from '@/components/championship/SponsorsManager';
import AnnouncementManager from '@/components/championship/AnnouncementManager';
import { toast } from 'sonner';

const PHASE_LABELS: Record<string, string> = {
  'round-of-16': 'Oitavas de Final',
  'quarter-finals': 'Quartas de Final',
  'semi-finals': 'Semifinais',
  'final': 'Final',
};

const ShareLinkButton = ({ championshipId, userId }: { championshipId: string; userId?: string }) => {
  const [shareData, setShareData] = useState<{ token: string; short_code: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.from('championship_shares').select('token, short_code').eq('championship_id', championshipId).single()
      .then(({ data }) => { if (data) setShareData(data as any); });
  }, [championshipId, userId]);

  const generateLink = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('championship_shares')
        .insert({ championship_id: championshipId, user_id: userId })
        .select('token, short_code').single();
      if (error) { toast.error('Erro ao gerar link'); return; }
      setShareData(data as any);
      toast.success('Link gerado!');
    } finally { setLoading(false); }
  };

  const copyLink = () => {
    if (!shareData) return;
    const appUrl = import.meta.env.PROD 
      ? 'https://campeonatofranca.lovable.app' 
      : window.location.origin;
    const url = `${appUrl}/share/${shareData.short_code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteLink = async () => {
    if (!shareData) return;
    await supabase.from('championship_shares').delete().eq('championship_id', championshipId);
    setShareData(null);
    toast.success('Link removido!');
  };

  if (!shareData) {
    return (
      <Button variant="outline" className="w-full gap-2" onClick={generateLink} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
        Gerar Link Público
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 gap-2" onClick={copyLink}>
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copiado!' : 'Copiar Link'}
        </Button>
        <Button variant="destructive" size="icon" onClick={deleteLink} title="Remover link">
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center">Link público ativo • Somente leitura</p>
    </div>
  );
};

const ChampionshipDetail = () => {
  const { id } = useParams<{ id: string }>();
  const {
    getChampionship,
    getChampionshipTeams,
    getChampionshipMatches,
    getChampionshipRounds,
    getChampionshipGameDays,
    getChampionshipKnockoutMatches,
    createTeam,
    addTeamToChampionship,
    removeTeamFromChampionship,
    updateTeam,
    getTeamsNotInChampionship,
    createRound,
    updateRound,
    deleteRound,
    createMatch,
    updateMatch,
    deleteMatch,
    createGameDay,
    deleteGameDay,
    addTeamToGameDay,
    removeTeamFromGameDay,
    updateGameDay,
    createKnockoutMatch,
    updateKnockoutMatch,
    deleteKnockoutMatch,
    updateChampionship,
    getGlobalAnnouncement,
    getChampionshipAnnouncement,
    upsertAnnouncement,
    deleteAnnouncement,
  } = useChampionships();

  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<string>('overview');
  const [standingsMode, setStandingsMode] = useState<string>('points');
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();

  const championship = getChampionship(id || '');
  const teams = getChampionshipTeams(id || '');
  const matches = getChampionshipMatches(id || '');
  const rounds = getChampionshipRounds(id || '');
  const gameDays = getChampionshipGameDays(id || '');
  const knockoutMatches = getChampionshipKnockoutMatches(id || '');
  const availableTeams = getTeamsNotInChampionship(id || '');

  const generalMatches = useMemo(() => {
    return matches.filter(m => !m.gameDayId);
  }, [matches]);

  const generalRounds = useMemo(() => {
    return rounds.filter(r => !r.gameDayId).sort((a, b) => a.number - b.number);
  }, [rounds]);

  // All game day matches combined
  const allGameDayMatches = useMemo(() => {
    return matches.filter(m => m.gameDayId);
  }, [matches]);

  // All regular matches = game day + general (no knockout)
  const allRegularMatches = useMemo(() => {
    return [...allGameDayMatches, ...generalMatches];
  }, [allGameDayMatches, generalMatches]);

  // Overview standings: game days + general rounds ONLY (no knockout)
  const standings = useMemo(() => {
    if (allRegularMatches.length === 0) {
      return calculateStandings(teams, []);
    }

    const teamIds = new Set<string>();
    allRegularMatches.forEach(m => {
      if (m.homeTeamId) teamIds.add(m.homeTeamId);
      if (m.awayTeamId) teamIds.add(m.awayTeamId);
    });

    const relevantTeams = teams.filter(t => teamIds.has(t.id));
    return calculateStandings(relevantTeams.length > 0 ? relevantTeams : teams, allRegularMatches);
  }, [teams, allRegularMatches]);

  const playedMatchesCount = matches.filter(m => m.homeGoals !== null && m.awayGoals !== null || m.homeWO || m.awayWO).length;

  const handleUpdateGameDayTeams = async (gameDayId: string, teamIds: string[]) => {
    await updateGameDay(gameDayId, { teamIds });
  };

  if (!championship) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6 h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Trophy className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-4">Campeonato não encontrado</h2>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar para campeonatos
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-3 sm:mb-4 transition-colors text-sm">
            <ArrowLeft className="h-4 w-4" />
            Voltar para campeonatos
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              {championship.logo ? (
                <img src={championship.logo} alt="" className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl object-cover shadow-lg" />
              ) : (
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-lg glow-primary">
                  <Trophy className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{championship.name}</h1>
                {championship.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">{championship.description}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-2 rounded-lg">
                <Users className="h-4 w-4" />
                <span className="font-medium">{teams.length} times</span>
              </div>
              <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-2 rounded-lg">
                <LayoutGrid className="h-4 w-4" />
                <span className="font-medium">{rounds.length} rodadas</span>
              </div>
              <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-2 rounded-lg">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">{playedMatchesCount} jogos</span>
              </div>
              {championship.startDate && (
                <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-2 rounded-lg">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">{new Date(championship.startDate).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 h-auto p-1 bg-muted/50">
              <TabsTrigger value="overview" className="gap-2 px-3 sm:px-4 py-2.5 text-sm">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Visão Geral</span>
                <span className="sm:hidden">Geral</span>
              </TabsTrigger>
              <TabsTrigger value="game-days" className="gap-2 px-3 sm:px-4 py-2.5 text-sm">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Dias de Jogo</span>
                <span className="sm:hidden">Dias</span>
              </TabsTrigger>
              <TabsTrigger value="knockout" className="gap-2 px-3 sm:px-4 py-2.5 text-sm">
                <Swords className="h-4 w-4" />
                <span className="hidden sm:inline">Eliminatórias</span>
                <span className="sm:hidden">Mata-mata</span>
              </TabsTrigger>
              <TabsTrigger value="teams" className="gap-2 px-3 sm:px-4 py-2.5 text-sm">
                <Users className="h-4 w-4" />
                <span>Times</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-gradient-card border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-primary" />
                        Classificação Geral
                      </CardTitle>
                      <CardDescription>
                        Dias de jogo + Rodadas gerais
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
                      <button onClick={() => setStandingsMode('points')} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${standingsMode === 'points' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                        <Hash className="h-3 w-3" />P
                      </button>
                      <button onClick={() => setStandingsMode('percentage')} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${standingsMode === 'percentage' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                        <Percent className="h-3 w-3" />%
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {teams.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">Adicione times para ver a classificação</p>
                      <Button onClick={() => setIsAddTeamOpen(true)} variant="outline" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Adicionar Time
                      </Button>
                    </div>
                  ) : (
                    <StandingsTable
                      standings={standings}
                      title={`Classificação - ${championship.name}`}
                      championshipName={championship.name}
                      sortByPercentage={standingsMode === 'percentage'}
                      championshipLogo={championship.logo}
                    />
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gradient-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Ações Rápidas
                  </CardTitle>
                  <CardDescription>Gerencie seu campeonato</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={() => setIsAddTeamOpen(true)} className="w-full gap-2 bg-gradient-primary hover:opacity-90">
                    <Plus className="h-4 w-4" />
                    Adicionar Time
                  </Button>
                  <Button variant="outline" className="w-full gap-2" onClick={() => setActiveMainTab('game-days')}>
                    <Calendar className="h-4 w-4" />
                    Gerenciar Dias de Jogo
                  </Button>
                  <Button variant="outline" className="w-full gap-2" onClick={() => setActiveMainTab('knockout')}>
                    <Swords className="h-4 w-4" />
                    Gerenciar Eliminatórias
                  </Button>
                  <ShareLinkButton championshipId={championship.id} userId={user?.id} />
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-primary" />
                  Rodadas Gerais
                </CardTitle>
                <CardDescription>Partidas que não estão vinculadas a um dia de jogo específico</CardDescription>
              </CardHeader>
              <CardContent>
                <RoundsList
                  rounds={generalRounds}
                  matches={generalMatches}
                  teams={teams}
                  championshipId={championship.id}
                  onCreateRound={(name) => createRound(championship.id, name)}
                  onDeleteRound={deleteRound}
                  onUpdateRound={updateRound}
                  onCreateMatch={createMatch}
                  onUpdateMatch={updateMatch}
                  onDeleteMatch={deleteMatch}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Game Days Tab */}
          <TabsContent value="game-days" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Dias de Jogo
                </h2>
                <p className="text-sm text-muted-foreground">
                  Organize partidas por dias. Cada dia tem sua própria classificação.
                </p>
              </div>
            </div>

            <GameDayManager
              qualifyingTeams={championship.qualifyingTeams}
              championshipLogo={championship.logo}
              gameDays={gameDays}
              allTeams={teams}
              matches={matches}
              rounds={rounds}
              championshipId={championship.id}
              championshipName={championship.name}
              onCreateGameDay={(name) => createGameDay(championship.id, name)}
              onDeleteGameDay={deleteGameDay}
              onAddTeamToGameDay={addTeamToGameDay}
              onRemoveTeamFromGameDay={removeTeamFromGameDay}
              onUpdateGameDayTeams={handleUpdateGameDayTeams}
              onCreateRound={(name, gameDayId) => createRound(championship.id, name, gameDayId)}
              onDeleteRound={deleteRound}
              onUpdateRound={updateRound}
              onCreateMatch={createMatch}
              onUpdateMatch={updateMatch}
              onDeleteMatch={deleteMatch}
            />
          </TabsContent>

          {/* Knockout Tab */}
          <TabsContent value="knockout" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Swords className="h-5 w-5 text-primary" />
                Fases Eliminatórias
              </h2>
              <p className="text-sm text-muted-foreground">
                Defina os confrontos de oitavas, quartas, semifinais e final.
              </p>
            </div>

            <KnockoutBracket
              knockoutMatches={knockoutMatches}
              teams={teams}
              championshipId={championship.id}
              enabledPhases={championship.knockoutPhases || ['round-of-16', 'quarter-finals', 'semi-finals', 'final']}
              allRegularMatches={allRegularMatches}
              onCreateMatch={createKnockoutMatch}
              onUpdateMatch={updateKnockoutMatch}
              onDeleteMatch={deleteKnockoutMatch}
            />
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h2 className="text-lg font-semibold">Times Participantes</h2>
                <p className="text-sm text-muted-foreground">Gerencie os times do campeonato</p>
              </div>
              <Button onClick={() => setIsAddTeamOpen(true)} className="gap-2 bg-gradient-primary hover:opacity-90 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Adicionar Time
              </Button>
            </div>

            <TeamsList
              teams={teams}
              onRemove={(teamId) => removeTeamFromChampionship(championship.id, teamId)}
              onUpdate={updateTeam}
            />
          </TabsContent>
        </Tabs>
      </main>

      <AddTeamDialog
        open={isAddTeamOpen}
        onOpenChange={setIsAddTeamOpen}
        availableTeams={availableTeams}
        onCreateTeam={async (name, logo) => {
          const team = await createTeam({ name, logo });
          if (team) await addTeamToChampionship(championship.id, team.id);
        }}
        onAddExistingTeam={(teamId) => {
          addTeamToChampionship(championship.id, teamId);
        }}
      />
    </div>
  );
};

export default ChampionshipDetail;
