import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useChampionships } from '@/hooks/useChampionships';
import { calculateStandings } from '@/utils/standings';
import { KnockoutPhase } from '@/types/championship';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Trophy, Users, Calendar, Plus, LayoutGrid, Settings, Swords, Download } from 'lucide-react';
import StandingsTable from '@/components/championship/StandingsTable';
import TeamsList from '@/components/championship/TeamsList';
import RoundsList from '@/components/championship/RoundsList';
import AddTeamDialog from '@/components/championship/AddTeamDialog';
import KnockoutBracket from '@/components/championship/KnockoutBracket';
import GameDayManager from '@/components/championship/GameDayManager';

const PHASE_LABELS: Record<string, string> = {
  'round-of-16': 'Oitavas de Final',
  'quarter-finals': 'Quartas de Final',
  'semi-finals': 'Semifinais',
  'final': 'Final',
};

const getPhaseLabel = (phase: string) => PHASE_LABELS[phase] || phase;

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
    deleteRound,
    createMatch,
    updateMatch,
    deleteMatch,
    createGameDay,
    deleteGameDay,
    addTeamToGameDay,
    removeTeamFromGameDay,
    createKnockoutMatch,
    updateKnockoutMatch,
    deleteKnockoutMatch,
  } = useChampionships();

  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<string>('overview');

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

  // Determine the current active knockout phase (most advanced phase WITH matches)
  const currentKnockoutPhase = useMemo(() => {
    if (knockoutMatches.length === 0) return null;

    const phaseOrder: KnockoutPhase[] = ['round-of-16', 'quarter-finals', 'semi-finals', 'final'];

    // Find the most advanced phase that actually has matches created
    let latestPhaseWithMatches: KnockoutPhase | null = null;
    for (const phase of phaseOrder) {
      const phaseMatches = knockoutMatches.filter(m => m.phase === phase);
      if (phaseMatches.length > 0) {
        latestPhaseWithMatches = phase;
      }
    }

    return latestPhaseWithMatches;
  }, [knockoutMatches]);

  // Calculate standings based on the current knockout phase
  const standings = useMemo(() => {
    if (!currentKnockoutPhase || knockoutMatches.length === 0) {
      // No knockout matches, use general matches
      return calculateStandings(teams, generalMatches);
    }

    // Get teams and matches for the current knockout phase
    const phaseMatches = knockoutMatches.filter(m => m.phase === currentKnockoutPhase);
    const teamIds = new Set<string>();
    phaseMatches.forEach(m => {
      if (m.homeTeamId) teamIds.add(m.homeTeamId);
      if (m.awayTeamId) teamIds.add(m.awayTeamId);
    });

    const phaseTeams = teams.filter(t => teamIds.has(t.id));

    // Convert knockout matches to regular matches for standings
    const matchesForStandings = phaseMatches.map(m => ({
      id: m.id,
      championshipId: m.championshipId,
      homeTeamId: m.homeTeamId || '',
      awayTeamId: m.awayTeamId || '',
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      homeWO: m.homeWO,
      awayWO: m.awayWO,
      round: 0,
      played: m.homeGoals !== null || m.homeWO || m.awayWO,
      createdAt: m.createdAt,
    }));

    return calculateStandings(phaseTeams, matchesForStandings);
  }, [teams, generalMatches, knockoutMatches, currentKnockoutPhase]);

  const playedMatchesCount = matches.filter(m => m.homeGoals !== null && m.awayGoals !== null || m.homeWO || m.awayWO).length;

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
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-lg glow-primary">
                <Trophy className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
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

          {/* Overview Tab - Shows General Rounds and Standings */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Standings Card */}
              <Card className="bg-gradient-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    {currentKnockoutPhase && knockoutMatches.length > 0 
                      ? `Classificação - ${getPhaseLabel(currentKnockoutPhase)}`
                      : 'Classificação Geral'
                    }
                  </CardTitle>
                  <CardDescription>
                    {currentKnockoutPhase && knockoutMatches.length > 0
                      ? `Baseada nas partidas da fase atual (${getPhaseLabel(currentKnockoutPhase)})`
                      : 'Baseada nas partidas gerais (fora dos dias de jogo)'
                    }
                  </CardDescription>
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
                    <StandingsTable standings={standings} title={`Classificação - ${championship.name}`} />
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions Card */}
              <Card className="bg-gradient-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Ações Rápidas
                  </CardTitle>
                  <CardDescription>
                    Gerencie seu campeonato
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={() => setIsAddTeamOpen(true)} 
                    className="w-full gap-2 bg-gradient-primary hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Time
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => setActiveMainTab('game-days')}
                  >
                    <Calendar className="h-4 w-4" />
                    Gerenciar Dias de Jogo
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => setActiveMainTab('knockout')}
                  >
                    <Swords className="h-4 w-4" />
                    Gerenciar Eliminatórias
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* General Rounds Section */}
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-primary" />
                  Rodadas Gerais
                </CardTitle>
                <CardDescription>
                  Partidas que não estão vinculadas a um dia de jogo específico
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RoundsList
                  rounds={generalRounds}
                  matches={generalMatches}
                  teams={teams}
                  championshipId={championship.id}
                  onCreateRound={(name) => createRound(championship.id, name)}
                  onDeleteRound={deleteRound}
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
                  Organize partidas por dias (ex: Sábado, Domingo). Cada dia tem sua própria classificação.
                </p>
              </div>
            </div>
            
            <GameDayManager
              gameDays={gameDays}
              allTeams={teams}
              matches={matches}
              rounds={rounds}
              championshipId={championship.id}
              onCreateGameDay={(name) => createGameDay(championship.id, name)}
              onDeleteGameDay={deleteGameDay}
              onAddTeamToGameDay={addTeamToGameDay}
              onRemoveTeamFromGameDay={removeTeamFromGameDay}
              onCreateRound={(name, gameDayId) => createRound(championship.id, name, gameDayId)}
              onDeleteRound={deleteRound}
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
                Defina os confrontos de oitavas, quartas, semifinais e final. O vencedor é determinado pelos critérios de desempate.
              </p>
            </div>

            <KnockoutBracket
              knockoutMatches={knockoutMatches}
              teams={teams}
              championshipId={championship.id}
              enabledPhases={championship.knockoutPhases || ['round-of-16', 'quarter-finals', 'semi-finals', 'final']}
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

      {/* Dialogs */}
      <AddTeamDialog
        open={isAddTeamOpen}
        onOpenChange={setIsAddTeamOpen}
        availableTeams={availableTeams}
        onCreateTeam={(name, logo) => {
          const team = createTeam({ name, logo });
          addTeamToChampionship(championship.id, team.id);
        }}
        onAddExistingTeam={(teamId) => {
          addTeamToChampionship(championship.id, teamId);
        }}
      />
    </div>
  );
};

export default ChampionshipDetail;
