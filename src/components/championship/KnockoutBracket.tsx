import { useState, useMemo } from 'react';
import { KnockoutMatch, KnockoutPhase, Team, TeamStats } from '@/types/championship';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trophy, AlertTriangle, Swords, Trash2, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';
import { calculateStandings } from '@/utils/standings';
import StandingsTable from './StandingsTable';

interface KnockoutBracketProps {
  knockoutMatches: KnockoutMatch[];
  teams: Team[];
  championshipId: string;
  onCreateMatch: (data: Omit<KnockoutMatch, 'id' | 'createdAt'>) => void;
  onUpdateMatch: (id: string, data: Partial<KnockoutMatch>) => void;
  onDeleteMatch: (id: string) => void;
}

// Phases with IDA E VOLTA (doubled except final)
const PHASES: { key: KnockoutPhase; label: string; count: number }[] = [
  { key: 'round-of-16', label: 'Oitavas de Final', count: 16 },
  { key: 'quarter-finals', label: 'Quartas de Final', count: 8 },
  { key: 'semi-finals', label: 'Semifinais', count: 4 },
  { key: 'final', label: 'Final', count: 1 },
];

// Helper to group matches into pairs (ida/volta)
const getMatchPairs = (matches: KnockoutMatch[], phaseCount: number): (KnockoutMatch | undefined)[][] => {
  const pairs: (KnockoutMatch | undefined)[][] = [];
  const numPairs = phaseCount === 1 ? 1 : phaseCount / 2;
  
  for (let i = 0; i < numPairs; i++) {
    const idaPosition = i * 2 + 1;
    const voltaPosition = i * 2 + 2;
    
    if (phaseCount === 1) {
      // Final has only 1 match
      pairs.push([matches.find(m => m.position === 1)]);
    } else {
      pairs.push([
        matches.find(m => m.position === idaPosition),
        matches.find(m => m.position === voltaPosition),
      ]);
    }
  }
  return pairs;
};

// Calculate aggregate score for a pair
const calculateAggregateWinner = (ida: KnockoutMatch | undefined, volta: KnockoutMatch | undefined): string | null => {
  if (!ida || !volta) return null;
  
  // If both have same teams
  const team1 = ida.homeTeamId;
  const team2 = ida.awayTeamId;
  
  if (!team1 || !team2) return null;
  
  let team1Goals = 0;
  let team2Goals = 0;
  
  // Count WO as 3-0
  if (ida.homeWO) {
    team2Goals += 3;
  } else if (ida.awayWO) {
    team1Goals += 3;
  } else if (ida.homeGoals !== null && ida.awayGoals !== null) {
    team1Goals += ida.homeGoals;
    team2Goals += ida.awayGoals;
  } else {
    return null; // First game not finished
  }
  
  if (volta.homeWO) {
    team1Goals += 3; // In volta, home is team2, away is team1
  } else if (volta.awayWO) {
    team2Goals += 3;
  } else if (volta.homeGoals !== null && volta.awayGoals !== null) {
    // In volta, teams are swapped: team2 is home, team1 is away
    team2Goals += volta.homeGoals;
    team1Goals += volta.awayGoals;
  } else {
    return null; // Second game not finished
  }
  
  if (team1Goals > team2Goals) return team1;
  if (team2Goals > team1Goals) return team2;
  
  // Tie: use away goals rule (team with more away goals wins)
  const team1AwayGoals = ida.awayWO ? 0 : (ida.awayGoals ?? 0);
  const team2AwayGoals = volta.awayWO ? 0 : (volta.awayGoals ?? 0);
  
  if (team1AwayGoals > team2AwayGoals) return team1;
  if (team2AwayGoals > team1AwayGoals) return team2;
  
  return null; // Still tied
};

const KnockoutBracket = ({
  knockoutMatches,
  teams,
  championshipId,
  onCreateMatch,
  onUpdateMatch,
  onDeleteMatch,
}: KnockoutBracketProps) => {
  const [selectedPhase, setSelectedPhase] = useState<KnockoutPhase | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<number>(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<KnockoutMatch | null>(null);
  const [isPairDialog, setIsPairDialog] = useState(false);
  const [pairIndex, setPairIndex] = useState(0);

  const [formData, setFormData] = useState({
    homeTeamId: '',
    awayTeamId: '',
    homeGoals: null as number | null,
    awayGoals: null as number | null,
    homeWO: false,
    awayWO: false,
  });

  const getTeam = (id: string | null) => teams.find(t => t.id === id);

  const getPhaseMatches = (phase: KnockoutPhase) =>
    knockoutMatches.filter(m => m.phase === phase).sort((a, b) => a.position - b.position);

  // Get current active phase (first phase with incomplete matches)
  const currentPhase = useMemo(() => {
    for (const phase of PHASES) {
      const phaseMatches = getPhaseMatches(phase.key);
      const pairs = getMatchPairs(phaseMatches, phase.count);
      
      for (const pair of pairs) {
        if (phase.count === 1) {
          // Final
          const match = pair[0];
          if (!match || match.winnerId === null) {
            return phase.key;
          }
        } else {
          // Check if pair is complete
          const [ida, volta] = pair;
          if (!ida || !volta) return phase.key;
          const winner = calculateAggregateWinner(ida, volta);
          if (!winner) return phase.key;
        }
      }
    }
    return 'final';
  }, [knockoutMatches]);

  // Calculate standings for current phase
  const phaseStandings = useMemo(() => {
    const phaseMatches = getPhaseMatches(currentPhase);
    const teamIds = new Set<string>();
    
    phaseMatches.forEach(m => {
      if (m.homeTeamId) teamIds.add(m.homeTeamId);
      if (m.awayTeamId) teamIds.add(m.awayTeamId);
    });
    
    const phaseTeams = teams.filter(t => teamIds.has(t.id));
    
    // Convert knockout matches to regular matches for standings calculation
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
  }, [knockoutMatches, currentPhase, teams]);

  const openCreatePairDialog = (phase: KnockoutPhase, pairIdx: number) => {
    setSelectedPhase(phase);
    setPairIndex(pairIdx);
    setFormData({
      homeTeamId: '',
      awayTeamId: '',
      homeGoals: null,
      awayGoals: null,
      homeWO: false,
      awayWO: false,
    });
    setEditingMatch(null);
    setIsPairDialog(true);
    setIsDialogOpen(true);
  };

  const openCreateDialog = (phase: KnockoutPhase, position: number) => {
    setSelectedPhase(phase);
    setSelectedPosition(position);
    setFormData({
      homeTeamId: '',
      awayTeamId: '',
      homeGoals: null,
      awayGoals: null,
      homeWO: false,
      awayWO: false,
    });
    setEditingMatch(null);
    setIsPairDialog(false);
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
    setIsPairDialog(false);
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

    if (!formData.homeTeamId || !formData.awayTeamId) {
      toast.error('Selecione os dois times');
      return;
    }

    if (formData.homeTeamId === formData.awayTeamId) {
      toast.error('Selecione times diferentes');
      return;
    }

    const winnerId = calculateWinner(
      formData.homeGoals,
      formData.awayGoals,
      formData.homeWO,
      formData.awayWO,
      formData.homeTeamId,
      formData.awayTeamId
    );

    if (isPairDialog) {
      // Create both ida and volta matches
      const idaPosition = pairIndex * 2 + 1;
      const voltaPosition = pairIndex * 2 + 2;

      // Create IDA (Team A home, Team B away)
      onCreateMatch({
        championshipId,
        phase: selectedPhase,
        position: idaPosition,
        homeTeamId: formData.homeTeamId,
        awayTeamId: formData.awayTeamId,
        homeGoals: null,
        awayGoals: null,
        homeWO: false,
        awayWO: false,
        winnerId: null,
      });

      // Create VOLTA (Team B home, Team A away)
      onCreateMatch({
        championshipId,
        phase: selectedPhase,
        position: voltaPosition,
        homeTeamId: formData.awayTeamId,
        awayTeamId: formData.homeTeamId,
        homeGoals: null,
        awayGoals: null,
        homeWO: false,
        awayWO: false,
        winnerId: null,
      });

      toast.success('Confronto (ida e volta) criado!');
    } else if (editingMatch) {
      onUpdateMatch(editingMatch.id, {
        homeTeamId: formData.homeTeamId,
        awayTeamId: formData.awayTeamId,
        homeGoals: formData.homeWO || formData.awayWO ? null : formData.homeGoals,
        awayGoals: formData.homeWO || formData.awayWO ? null : formData.awayGoals,
        homeWO: formData.homeWO,
        awayWO: formData.awayWO,
        winnerId,
      });
      toast.success('Partida atualizada!');
    } else {
      onCreateMatch({
        championshipId,
        phase: selectedPhase,
        position: selectedPosition,
        homeTeamId: formData.homeTeamId,
        awayTeamId: formData.awayTeamId,
        homeGoals: formData.homeWO || formData.awayWO ? null : formData.homeGoals,
        awayGoals: formData.homeWO || formData.awayWO ? null : formData.awayGoals,
        homeWO: formData.homeWO,
        awayWO: formData.awayWO,
        winnerId,
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

  const handleDeletePair = (ida: KnockoutMatch | undefined, volta: KnockoutMatch | undefined) => {
    if (confirm('Tem certeza que deseja excluir este confronto (ida e volta)?')) {
      if (ida) onDeleteMatch(ida.id);
      if (volta) onDeleteMatch(volta.id);
      toast.success('Confronto excluído!');
    }
  };

  const getDisplayScore = (match: KnockoutMatch) => {
    if (match.homeWO) return { home: 'W.O.', away: '3' };
    if (match.awayWO) return { home: '3', away: 'W.O.' };
    if (match.homeGoals === null || match.awayGoals === null) return { home: '-', away: '-' };
    return { home: match.homeGoals.toString(), away: match.awayGoals.toString() };
  };

  const renderMatchCard = (match: KnockoutMatch | undefined, phase: KnockoutPhase, position: number, isVolta: boolean = false) => {
    if (!match) {
      return (
        <div
          className="border-2 border-dashed rounded-xl p-3 text-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-all"
          onClick={() => openCreateDialog(phase, position)}
        >
          <Plus className="h-5 w-5 mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-1">{isVolta ? 'Volta' : 'Ida'}</p>
        </div>
      );
    }

    const homeTeam = getTeam(match.homeTeamId);
    const awayTeam = getTeam(match.awayTeamId);
    const score = getDisplayScore(match);

    return (
      <div
        className="border rounded-xl p-2 cursor-pointer hover:bg-muted/50 transition-all relative bg-gradient-card border-border/50"
        onClick={() => openEditDialog(match)}
      >
        <div className="absolute right-1 top-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => { e.stopPropagation(); openEditDialog(match); }}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground mb-1">{isVolta ? 'Volta' : 'Ida'}</p>

        <div className="space-y-1">
          <div className={`flex items-center justify-between text-xs ${match.winnerId === match.homeTeamId ? 'font-bold text-primary' : ''}`}>
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {homeTeam?.logo ? (
                <img src={homeTeam.logo} alt={homeTeam.name} className="h-4 w-4 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary flex-shrink-0">
                  {homeTeam?.name?.charAt(0) || '?'}
                </div>
              )}
              <span className="truncate">{homeTeam?.name || 'A definir'}</span>
              {match.homeWO && <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />}
            </div>
            <span className="font-mono ml-1">{score.home}</span>
          </div>

          <div className={`flex items-center justify-between text-xs ${match.winnerId === match.awayTeamId ? 'font-bold text-primary' : ''}`}>
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {awayTeam?.logo ? (
                <img src={awayTeam.logo} alt={awayTeam.name} className="h-4 w-4 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary flex-shrink-0">
                  {awayTeam?.name?.charAt(0) || '?'}
                </div>
              )}
              <span className="truncate">{awayTeam?.name || 'A definir'}</span>
              {match.awayWO && <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />}
            </div>
            <span className="font-mono ml-1">{score.away}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderPairCard = (pair: (KnockoutMatch | undefined)[], phase: KnockoutPhase, pairIdx: number) => {
    const [ida, volta] = pair;
    
    if (!ida && !volta) {
      return (
        <div
          className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-all"
          onClick={() => openCreatePairDialog(phase, pairIdx)}
        >
          <ArrowLeftRight className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
          <p className="text-sm text-muted-foreground">Definir confronto</p>
          <p className="text-xs text-muted-foreground">Ida e Volta</p>
        </div>
      );
    }

    const team1 = ida?.homeTeamId ? getTeam(ida.homeTeamId) : null;
    const team2 = ida?.awayTeamId ? getTeam(ida.awayTeamId) : null;
    const aggregateWinner = calculateAggregateWinner(ida, volta);
    const winnerTeam = aggregateWinner ? getTeam(aggregateWinner) : null;

    // Calculate aggregate score
    let team1Total = 0;
    let team2Total = 0;
    
    if (ida) {
      if (ida.homeWO) team2Total += 3;
      else if (ida.awayWO) team1Total += 3;
      else {
        team1Total += ida.homeGoals ?? 0;
        team2Total += ida.awayGoals ?? 0;
      }
    }
    if (volta) {
      if (volta.homeWO) team1Total += 3;
      else if (volta.awayWO) team2Total += 3;
      else {
        team2Total += volta.homeGoals ?? 0;
        team1Total += volta.awayGoals ?? 0;
      }
    }

    return (
      <div className="border rounded-xl p-3 bg-gradient-card border-border/50 relative">
        <div className="absolute right-1 top-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => { e.stopPropagation(); handleDeletePair(ida, volta); }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Teams header */}
        <div className="flex items-center justify-between mb-3 pr-6">
          <div className="flex items-center gap-2">
            {team1?.logo ? (
              <img src={team1.logo} alt={team1.name} className="h-6 w-6 rounded-lg object-cover" />
            ) : (
              <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {team1?.name?.charAt(0) || '?'}
              </div>
            )}
            <span className="font-medium text-sm">{team1?.name || 'A definir'}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {team1Total} x {team2Total}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{team2?.name || 'A definir'}</span>
            {team2?.logo ? (
              <img src={team2.logo} alt={team2.name} className="h-6 w-6 rounded-lg object-cover" />
            ) : (
              <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {team2?.name?.charAt(0) || '?'}
              </div>
            )}
          </div>
        </div>

        {/* Matches */}
        <div className="grid grid-cols-2 gap-2">
          {renderMatchCard(ida, phase, pairIdx * 2 + 1, false)}
          {renderMatchCard(volta, phase, pairIdx * 2 + 2, true)}
        </div>

        {winnerTeam && (
          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <Trophy className="h-3 w-3 text-accent" />
            {winnerTeam.name} avança
          </div>
        )}
      </div>
    );
  };

  const getPhaseLabel = (phase: KnockoutPhase) => {
    return PHASES.find(p => p.key === phase)?.label || '';
  };

  return (
    <>
      <div className="space-y-6">
        {/* Current Phase Standings */}
        {phaseStandings.length > 0 && (
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-accent" />
                Classificação - {getPhaseLabel(currentPhase)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StandingsTable 
                standings={phaseStandings} 
                title={`Classificação - ${getPhaseLabel(currentPhase)}`}
                showExport={true}
              />
            </CardContent>
          </Card>
        )}

        {PHASES.map((phase) => {
          const phaseMatches = getPhaseMatches(phase.key);

          if (phase.count === 1) {
            // Final - single match
            const match = phaseMatches.find(m => m.position === 1);
            return (
              <Card key={phase.key} className="bg-gradient-card border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-accent" />
                    {phase.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-w-md mx-auto">
                    {!match ? (
                      <div
                        className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-all"
                        onClick={() => openCreateDialog(phase.key, 1)}
                      >
                        <Trophy className="h-8 w-8 mx-auto text-accent mb-2" />
                        <p className="text-sm text-muted-foreground">Definir a Final</p>
                      </div>
                    ) : (
                      <div
                        className="border rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition-all relative bg-gradient-card border-border/50"
                        onClick={() => openEditDialog(match)}
                      >
                        <div className="absolute right-2 top-2 flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); openEditDialog(match); }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); handleDeleteMatch(match.id); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="space-y-3 mt-4">
                          <div className={`flex items-center justify-between text-sm ${match.winnerId === match.homeTeamId ? 'font-bold text-primary' : ''}`}>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {getTeam(match.homeTeamId)?.logo ? (
                                <img src={getTeam(match.homeTeamId)!.logo} alt="" className="h-6 w-6 rounded-lg object-cover flex-shrink-0" />
                              ) : (
                                <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                  {getTeam(match.homeTeamId)?.name?.charAt(0) || '?'}
                                </div>
                              )}
                              <span className="truncate">{getTeam(match.homeTeamId)?.name || 'A definir'}</span>
                            </div>
                            <span className="font-mono ml-2 text-lg">{getDisplayScore(match).home}</span>
                          </div>

                          <div className={`flex items-center justify-between text-sm ${match.winnerId === match.awayTeamId ? 'font-bold text-primary' : ''}`}>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {getTeam(match.awayTeamId)?.logo ? (
                                <img src={getTeam(match.awayTeamId)!.logo} alt="" className="h-6 w-6 rounded-lg object-cover flex-shrink-0" />
                              ) : (
                                <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                  {getTeam(match.awayTeamId)?.name?.charAt(0) || '?'}
                                </div>
                              )}
                              <span className="truncate">{getTeam(match.awayTeamId)?.name || 'A definir'}</span>
                            </div>
                            <span className="font-mono ml-2 text-lg">{getDisplayScore(match).away}</span>
                          </div>
                        </div>

                        {match.winnerId && (
                          <div className="mt-3 pt-3 border-t text-sm text-center flex items-center justify-center gap-2">
                            <Trophy className="h-4 w-4 text-accent" />
                            <span className="font-bold text-accent">{getTeam(match.winnerId)?.name} é o Campeão!</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          }

          // Phases with ida/volta
          const pairs = getMatchPairs(phaseMatches, phase.count);

          return (
            <Card key={phase.key} className="bg-gradient-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Swords className="h-5 w-5 text-primary" />
                  {phase.label}
                  <Badge variant="outline" className="text-xs ml-2">
                    {phase.count / 2} confrontos (ida e volta)
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid gap-4 ${
                  phase.count === 4 ? 'grid-cols-1 sm:grid-cols-2' :
                  phase.count === 8 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
                  'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                }`}>
                  {pairs.map((pair, i) => (
                    <div key={i}>
                      {renderPairCard(pair, phase.key, i)}
                    </div>
                  ))}
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
              {isPairDialog ? 'Definir Confronto (Ida e Volta)' : editingMatch ? 'Editar Partida' : 'Definir Partida'}
            </DialogTitle>
            <DialogDescription>
              {selectedPhase && PHASES.find(p => p.key === selectedPhase)?.label}
              {!isPairDialog && ` - Jogo ${selectedPosition}`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Time 1 {isPairDialog && '(Casa na ida)'}</Label>
                <Select
                  value={formData.homeTeamId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, homeTeamId: value }))}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Time 2 {isPairDialog && '(Casa na volta)'}</Label>
                <Select
                  value={formData.awayTeamId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, awayTeamId: value }))}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!isPairDialog && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Gols Time 1</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.homeGoals ?? ''}
                      placeholder="A definir"
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        homeGoals: e.target.value === '' ? null : parseInt(e.target.value)
                      }))}
                      disabled={formData.homeWO || formData.awayWO}
                      className="h-11"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Gols Time 2</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.awayGoals ?? ''}
                      placeholder="A definir"
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        awayGoals: e.target.value === '' ? null : parseInt(e.target.value)
                      }))}
                      disabled={formData.homeWO || formData.awayWO}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
                  <p className="text-sm font-medium">W.O. (Walk Over)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ko-home-wo"
                        checked={formData.homeWO}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          homeWO: !!checked,
                          awayWO: checked ? false : prev.awayWO
                        }))}
                      />
                      <Label htmlFor="ko-home-wo" className="text-sm cursor-pointer">Time 1 deu W.O.</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ko-away-wo"
                        checked={formData.awayWO}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          awayWO: !!checked,
                          homeWO: checked ? false : prev.homeWO
                        }))}
                      />
                      <Label htmlFor="ko-away-wo" className="text-sm cursor-pointer">Time 2 deu W.O.</Label>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="bg-gradient-primary hover:opacity-90">
              {isPairDialog ? 'Criar Confronto' : editingMatch ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default KnockoutBracket;