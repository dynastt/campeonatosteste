import { useState, useMemo } from 'react';
import { KnockoutMatch, KnockoutPhase, Team, Match } from '@/types/championship';
import { calculateStandings } from '@/utils/standings';
import StandingsTable from './StandingsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit2, Trophy, AlertTriangle, Swords, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface KnockoutBracketProps {
  knockoutMatches: KnockoutMatch[];
  teams: Team[];
  championshipId: string;
  enabledPhases: KnockoutPhase[];
  allRegularMatches: Match[]; // game day + general round matches
  onCreateMatch: (data: Omit<KnockoutMatch, 'id' | 'createdAt'>) => void;
  onUpdateMatch: (id: string, data: Partial<KnockoutMatch>) => void;
  onDeleteMatch: (id: string) => void;
}

const ALL_PHASES: { key: KnockoutPhase; label: string; baseCount: number; doubledCount: number }[] = [
  { key: 'round-of-16', label: 'Oitavas de Final', baseCount: 8, doubledCount: 16 },
  { key: 'quarter-finals', label: 'Quartas de Final', baseCount: 4, doubledCount: 8 },
  { key: 'semi-finals', label: 'Semifinais', baseCount: 2, doubledCount: 4 },
  { key: 'final', label: 'Final', baseCount: 1, doubledCount: 1 },
];

const KnockoutBracket = ({
  knockoutMatches,
  teams,
  championshipId,
  enabledPhases,
  allRegularMatches,
  onCreateMatch,
  onUpdateMatch,
  onDeleteMatch,
}: KnockoutBracketProps) => {
  const [selectedPhase, setSelectedPhase] = useState<KnockoutPhase | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<number>(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<KnockoutMatch | null>(null);

  const [formData, setFormData] = useState({
    homeTeamId: '',
    awayTeamId: '',
    homeGoals: null as number | null,
    awayGoals: null as number | null,
    homeWO: false,
    awayWO: false,
  });

  const phases = useMemo(() => {
    return ALL_PHASES.filter(p => enabledPhases.includes(p.key));
  }, [enabledPhases]);

  const getTeam = (id: string | null) => teams.find(t => t.id === id);

  const getPhaseMatches = (phase: KnockoutPhase) =>
    knockoutMatches.filter(m => m.phase === phase).sort((a, b) => a.position - b.position);

  const openCreateDialog = (phase: KnockoutPhase, position: number) => {
    setSelectedPhase(phase);
    setSelectedPosition(position);
    setFormData({ homeTeamId: '', awayTeamId: '', homeGoals: null, awayGoals: null, homeWO: false, awayWO: false });
    setEditingMatch(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (match: KnockoutMatch) => {
    setSelectedPhase(match.phase);
    setSelectedPosition(match.position);
    setFormData({
      homeTeamId: match.homeTeamId || '',
      awayTeamId: match.awayTeamId || '',
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
      homeWO: match.homeWO,
      awayWO: match.awayWO,
    });
    setEditingMatch(match);
    setIsDialogOpen(true);
  };

  const calculateWinner = (homeGoals: number | null, awayGoals: number | null, homeWO: boolean, awayWO: boolean, homeTeamId: string | null, awayTeamId: string | null): string | null => {
    if (homeWO) return awayTeamId;
    if (awayWO) return homeTeamId;
    if (homeGoals === null || awayGoals === null) return null;
    if (homeGoals > awayGoals) return homeTeamId;
    if (awayGoals > homeGoals) return awayTeamId;
    return null;
  };

  const handleSubmit = () => {
    if (!selectedPhase) return;
    if (!formData.homeTeamId || !formData.awayTeamId) { toast.error('Selecione os dois times'); return; }
    if (formData.homeTeamId === formData.awayTeamId) { toast.error('Selecione times diferentes'); return; }

    const winnerId = calculateWinner(formData.homeGoals, formData.awayGoals, formData.homeWO, formData.awayWO, formData.homeTeamId, formData.awayTeamId);

    if (editingMatch) {
      onUpdateMatch(editingMatch.id, {
        homeTeamId: formData.homeTeamId, awayTeamId: formData.awayTeamId,
        homeGoals: formData.homeWO || formData.awayWO ? null : formData.homeGoals,
        awayGoals: formData.homeWO || formData.awayWO ? null : formData.awayGoals,
        homeWO: formData.homeWO, awayWO: formData.awayWO, winnerId,
      });
      toast.success('Partida atualizada!');
    } else {
      onCreateMatch({
        championshipId, phase: selectedPhase, position: selectedPosition,
        homeTeamId: formData.homeTeamId, awayTeamId: formData.awayTeamId,
        homeGoals: formData.homeWO || formData.awayWO ? null : formData.homeGoals,
        awayGoals: formData.homeWO || formData.awayWO ? null : formData.awayGoals,
        homeWO: formData.homeWO, awayWO: formData.awayWO, winnerId,
      });
      toast.success('Partida criada!');
    }
    setIsDialogOpen(false);
  };

  const handleDeleteMatch = (matchId: string) => {
    if (confirm('Tem certeza que deseja excluir esta partida?')) {
      onDeleteMatch(matchId);
      toast.success('Partida excluída!');
    }
  };

  const getDisplayScore = (match: KnockoutMatch) => {
    if (match.homeWO) return { home: 'W.O.', away: '3' };
    if (match.awayWO) return { home: '3', away: 'W.O.' };
    if (match.homeGoals === null || match.awayGoals === null) return { home: '-', away: '-' };
    return { home: match.homeGoals.toString(), away: match.awayGoals.toString() };
  };

  const renderMatchCard = (match: KnockoutMatch | undefined, phase: KnockoutPhase, position: number) => {
    if (!match) {
      return (
        <div
          className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-all"
          onClick={() => openCreateDialog(phase, position)}
        >
          <Plus className="h-6 w-6 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-1">Jogo {position}</p>
        </div>
      );
    }

    const homeTeam = getTeam(match.homeTeamId);
    const awayTeam = getTeam(match.awayTeamId);
    const score = getDisplayScore(match);
    const winner = match.winnerId ? getTeam(match.winnerId) : null;

    return (
      <div
        className="border rounded-xl p-3 cursor-pointer hover:bg-muted/50 transition-all relative bg-gradient-card border-border/50"
        onClick={() => openEditDialog(match)}
      >
        <div className="absolute right-1 top-1 flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); openEditDialog(match); }}>
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => { e.stopPropagation(); handleDeleteMatch(match.id); }}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        <div className="space-y-2 mt-4">
          <div className={`flex items-center justify-between text-sm ${match.winnerId === match.homeTeamId ? 'font-bold text-primary' : ''}`}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {homeTeam?.logo ? (
                <img src={homeTeam.logo} alt={homeTeam.name} className="h-5 w-5 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="h-5 w-5 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                  {homeTeam?.name?.charAt(0) || '?'}
                </div>
              )}
              <span className="truncate">{homeTeam?.name || 'A definir'}</span>
              {match.homeWO && <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />}
            </div>
            <span className="font-mono ml-2">{score.home}</span>
          </div>

          <div className={`flex items-center justify-between text-sm ${match.winnerId === match.awayTeamId ? 'font-bold text-primary' : ''}`}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {awayTeam?.logo ? (
                <img src={awayTeam.logo} alt={awayTeam.name} className="h-5 w-5 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="h-5 w-5 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                  {awayTeam?.name?.charAt(0) || '?'}
                </div>
              )}
              <span className="truncate">{awayTeam?.name || 'A definir'}</span>
              {match.awayWO && <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />}
            </div>
            <span className="font-mono ml-2">{score.away}</span>
          </div>
        </div>

        {winner && (() => {
          const phaseInfo = ALL_PHASES.find(p => p.key === phase);
          const isFinal = phase === 'final';

          if (isFinal) {
            return (
              <div className="mt-2 pt-2 border-t text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                <Trophy className="h-3 w-3 text-accent" />
                {winner.name} Ganhou!
              </div>
            );
          }

          if (!phaseInfo) return null;

          // Determine if this is a "second leg" game
          const weekSize = Math.min(phaseInfo.baseCount, 4);
          const isSecondLeg = Math.floor((position - 1) / weekSize) % 2 === 1;

          if (!isSecondLeg) return null;

          return (
            <div className="mt-2 pt-2 border-t text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
              <Trophy className="h-3 w-3 text-accent" />
              {winner.name} avança
            </div>
          );
        })()}
      </div>
    );
  };

  // Cumulative knockout standings per phase, including game day + general round matches
  const phaseStandings = useMemo(() => {
    const phaseOrder: KnockoutPhase[] = ['round-of-16', 'quarter-finals', 'semi-finals', 'final'];
    const result: { phase: KnockoutPhase; label: string; standings: ReturnType<typeof calculateStandings> }[] = [];

    // Pre-calculate regular match stats for all teams
    const regularStats = new Map<string, { points: number; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; woCount: number; gaveWO: boolean }>();
    const regularStandings = calculateStandings(teams, allRegularMatches);
    regularStandings.forEach(stat => {
      regularStats.set(stat.teamId, {
        points: stat.points, played: stat.played, won: stat.won, drawn: stat.drawn,
        lost: stat.lost, goalsFor: stat.goalsFor, goalsAgainst: stat.goalsAgainst,
        woCount: stat.woCount, gaveWO: stat.gaveWO,
      });
    });

    // Accumulated knockout stats per team (across phases)
    let accumulatedKnockoutStats = new Map<string, { points: number; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; woCount: number; gaveWO: boolean }>();

    for (const phase of phaseOrder) {
      const phaseMatches = knockoutMatches.filter(m => m.phase === phase);
      if (phaseMatches.length === 0) continue;

      const teamIds = new Set<string>();
      phaseMatches.forEach(m => {
        if (m.homeTeamId) teamIds.add(m.homeTeamId);
        if (m.awayTeamId) teamIds.add(m.awayTeamId);
      });
      const phaseTeams = teams.filter(t => teamIds.has(t.id));

      // Calculate this phase's knockout stats
      const matchesForStandings: Match[] = phaseMatches.map(m => ({
        id: m.id, championshipId: m.championshipId,
        homeTeamId: m.homeTeamId || '', awayTeamId: m.awayTeamId || '',
        homeGoals: m.homeGoals, awayGoals: m.awayGoals,
        homeWO: m.homeWO, awayWO: m.awayWO,
        round: 0, played: m.homeGoals !== null || m.homeWO || m.awayWO,
        createdAt: m.createdAt,
      }));

      const currentPhaseStats = calculateStandings(phaseTeams, matchesForStandings);

      // Build cumulative: regular + accumulated knockout + current phase knockout
      const cumulativeStandings = currentPhaseStats.map(stat => {
        const regular = regularStats.get(stat.teamId);
        const prevKnockout = accumulatedKnockoutStats.get(stat.teamId);

        let totalPoints = stat.points;
        let totalPlayed = stat.played;
        let totalWon = stat.won;
        let totalDrawn = stat.drawn;
        let totalLost = stat.lost;
        let totalGF = stat.goalsFor;
        let totalGA = stat.goalsAgainst;
        let totalWO = stat.woCount;
        let totalGaveWO = stat.gaveWO;

        if (regular) {
          totalPoints += regular.points;
          totalPlayed += regular.played;
          totalWon += regular.won;
          totalDrawn += regular.drawn;
          totalLost += regular.lost;
          totalGF += regular.goalsFor;
          totalGA += regular.goalsAgainst;
          totalWO += regular.woCount;
          totalGaveWO = totalGaveWO || regular.gaveWO;
        }

        if (prevKnockout) {
          totalPoints += prevKnockout.points;
          totalPlayed += prevKnockout.played;
          totalWon += prevKnockout.won;
          totalDrawn += prevKnockout.drawn;
          totalLost += prevKnockout.lost;
          totalGF += prevKnockout.goalsFor;
          totalGA += prevKnockout.goalsAgainst;
          totalWO += prevKnockout.woCount;
          totalGaveWO = totalGaveWO || prevKnockout.gaveWO;
        }

        return {
          ...stat,
          points: totalPoints,
          played: totalPlayed,
          won: totalWon,
          drawn: totalDrawn,
          lost: totalLost,
          goalsFor: totalGF,
          goalsAgainst: totalGA,
          goalDifference: totalGF - totalGA,
          gaveWO: totalGaveWO,
          woCount: totalWO,
          pointsPercentage: totalPlayed > 0 ? (totalPoints / (totalPlayed * 3)) * 100 : 0,
        };
      });

      cumulativeStandings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.won !== a.won) return b.won - a.won;
        if (a.gaveWO !== b.gaveWO) return a.gaveWO ? 1 : -1;
        if (a.goalsAgainst !== b.goalsAgainst) return a.goalsAgainst - b.goalsAgainst;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return a.team.name.localeCompare(b.team.name);
      });

      const label = ALL_PHASES.find(p => p.key === phase)?.label || '';
      result.push({ phase, label, standings: cumulativeStandings });

      // Accumulate knockout stats for next phase (only this phase's knockout part)
      const newAccumulated = new Map(accumulatedKnockoutStats);
      currentPhaseStats.forEach(stat => {
        const prev = newAccumulated.get(stat.teamId);
        if (prev) {
          newAccumulated.set(stat.teamId, {
            points: prev.points + stat.points,
            played: prev.played + stat.played,
            won: prev.won + stat.won,
            drawn: prev.drawn + stat.drawn,
            lost: prev.lost + stat.lost,
            goalsFor: prev.goalsFor + stat.goalsFor,
            goalsAgainst: prev.goalsAgainst + stat.goalsAgainst,
            woCount: prev.woCount + stat.woCount,
            gaveWO: prev.gaveWO || stat.gaveWO,
          });
        } else {
          newAccumulated.set(stat.teamId, {
            points: stat.points, played: stat.played, won: stat.won, drawn: stat.drawn,
            lost: stat.lost, goalsFor: stat.goalsFor, goalsAgainst: stat.goalsAgainst,
            woCount: stat.woCount, gaveWO: stat.gaveWO,
          });
        }
      });
      accumulatedKnockoutStats = newAccumulated;
    }

    return result;
  }, [knockoutMatches, teams, allRegularMatches]);

  return (
    <>
      <div className="space-y-6">
        {/* Knockout Standings per phase */}
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
                <StandingsTable
                  standings={phaseStandingsData}
                  title={`Classificação - ${label}`}
                  showPercentageColumn
                />
              </CardContent>
            </Card>
          )
        ))}

        {phases.map((phase) => {
          const phaseMatches = getPhaseMatches(phase.key);
          const count = phase.doubledCount;

          return (
            <Card key={phase.key} className="bg-gradient-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  {phase.key === 'final' ? (
                    <Trophy className="h-5 w-5 text-accent" />
                  ) : (
                    <Swords className="h-5 w-5 text-primary" />
                  )}
                  {phase.label}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({count} {count === 1 ? 'jogo' : 'jogos'})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid gap-3 ${
                  count === 1 ? 'grid-cols-1 max-w-md mx-auto' :
                  count <= 4 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' :
                  count <= 8 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
                  'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                }`}>
                  {Array.from({ length: count }, (_, i) => {
                    const match = phaseMatches.find(m => m.position === i + 1);
                    return (
                      <div key={i}>
                        {renderMatchCard(match, phase.key, i + 1)}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog for creating/editing knockout match */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-primary" />
              {editingMatch ? 'Editar Partida' : 'Definir Partida'}
            </DialogTitle>
            <DialogDescription>
              {selectedPhase && ALL_PHASES.find(p => p.key === selectedPhase)?.label} - Jogo {selectedPosition}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Time 1</Label>
                <Select value={formData.homeTeamId} onValueChange={(value) => setFormData(prev => ({ ...prev, homeTeamId: value }))}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Time 2</Label>
                <Select value={formData.awayTeamId} onValueChange={(value) => setFormData(prev => ({ ...prev, awayTeamId: value }))}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Gols Time 1</Label>
                <Input type="number" min="0" value={formData.homeGoals ?? ''} placeholder="A definir"
                  onChange={(e) => setFormData(prev => ({ ...prev, homeGoals: e.target.value === '' ? null : parseInt(e.target.value) }))}
                  disabled={formData.homeWO || formData.awayWO} className="h-11" />
              </div>
              <div className="grid gap-2">
                <Label>Gols Time 2</Label>
                <Input type="number" min="0" value={formData.awayGoals ?? ''} placeholder="A definir"
                  onChange={(e) => setFormData(prev => ({ ...prev, awayGoals: e.target.value === '' ? null : parseInt(e.target.value) }))}
                  disabled={formData.homeWO || formData.awayWO} className="h-11" />
              </div>
            </div>

            <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-medium">W.O. (Walk Over)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="ko-home-wo" checked={formData.homeWO}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, homeWO: !!checked, awayWO: checked ? false : prev.awayWO }))} />
                  <Label htmlFor="ko-home-wo" className="text-sm cursor-pointer">Time 1 deu W.O.</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="ko-away-wo" checked={formData.awayWO}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, awayWO: !!checked, homeWO: checked ? false : prev.homeWO }))} />
                  <Label htmlFor="ko-away-wo" className="text-sm cursor-pointer">Time 2 deu W.O.</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-gradient-primary hover:opacity-90">
              {editingMatch ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default KnockoutBracket;
