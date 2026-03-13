import { useState } from 'react';
import { Match, Team, Round } from '@/types/championship';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Check, Clock, AlertTriangle, Plus, Trash2, Edit2, LayoutGrid, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

interface RoundsListProps {
  rounds: Round[];
  matches: Match[];
  teams: Team[];
  championshipId: string;
  gameDayId?: string;
  onCreateRound: (name?: string) => void;
  onDeleteRound: (id: string) => void;
  onUpdateRound?: (id: string, data: Partial<Round>) => void;
  onCreateMatch: (data: Omit<Match, 'id' | 'createdAt'>) => void;
  onUpdateMatch: (id: string, data: Partial<Match>) => void;
  onDeleteMatch: (id: string) => void;
}

interface MatchFormData {
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  homeWO: boolean;
  awayWO: boolean;
  matchTime: string;
}

const formatDateBR = (dateStr?: string) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const RoundsList = ({
  rounds,
  matches,
  teams,
  championshipId,
  gameDayId,
  onCreateRound,
  onDeleteRound,
  onUpdateRound,
  onCreateMatch,
  onUpdateMatch,
  onDeleteMatch,
}: RoundsListProps) => {
  const [isAddRoundOpen, setIsAddRoundOpen] = useState(false);
  const [newRoundName, setNewRoundName] = useState('');

  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [isAddMatchOpen, setIsAddMatchOpen] = useState(false);

  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  // Edit round dialog
  const [isEditRoundOpen, setIsEditRoundOpen] = useState(false);
  const [editRoundName, setEditRoundName] = useState('');
  const [editRoundDate, setEditRoundDate] = useState('');
  const [editingRound, setEditingRound] = useState<Round | null>(null);

  const [matchForm, setMatchForm] = useState<MatchFormData>({
    homeTeamId: '',
    awayTeamId: '',
    homeGoals: null,
    awayGoals: null,
    homeWO: false,
    awayWO: false,
    matchTime: '',
  });

  const getTeam = (id: string) => teams.find(t => t.id === id);

  const getRoundMatches = (roundNumber: number) =>
    matches.filter(m => m.championshipId === championshipId && m.round === roundNumber && 
      (gameDayId ? m.gameDayId === gameDayId : !m.gameDayId));

  const handleCreateRound = () => {
    onCreateRound(newRoundName || undefined);
    setNewRoundName('');
    setIsAddRoundOpen(false);
    toast.success('Rodada criada!');
  };

  const handleDeleteRound = (round: Round) => {
    if (confirm(`Tem certeza que deseja excluir a Rodada ${round.number}? Todas as partidas desta rodada serão excluídas.`)) {
      onDeleteRound(round.id);
      toast.success('Rodada excluída!');
    }
  };

  const openEditRoundDialog = (round: Round) => {
    setEditingRound(round);
    setEditRoundName(round.name || '');
    setEditRoundDate(round.date || '');
    setIsEditRoundOpen(true);
  };

  const handleEditRound = () => {
    if (!editingRound || !onUpdateRound) return;
    onUpdateRound(editingRound.id, {
      name: editRoundName || undefined,
      date: editRoundDate || undefined,
    });
    setIsEditRoundOpen(false);
    toast.success('Rodada atualizada!');
  };

  const openAddMatchDialog = (round: Round) => {
    setSelectedRound(round);
    setMatchForm({
      homeTeamId: '',
      awayTeamId: '',
      homeGoals: null,
      awayGoals: null,
      homeWO: false,
      awayWO: false,
      matchTime: '',
    });
    setEditingMatch(null);
    setIsAddMatchOpen(true);
  };

  const openEditMatchDialog = (match: Match, round: Round) => {
    setSelectedRound(round);
    setMatchForm({
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
      homeWO: match.homeWO,
      awayWO: match.awayWO,
      matchTime: match.matchTime || '',
    });
    setEditingMatch(match);
    setIsAddMatchOpen(true);
  };

  const handleSubmitMatch = () => {
    if (!selectedRound) return;

    if (!matchForm.homeTeamId || !matchForm.awayTeamId) {
      toast.error('Selecione os dois times');
      return;
    }

    if (matchForm.homeTeamId === matchForm.awayTeamId) {
      toast.error('Selecione times diferentes');
      return;
    }

    const hasScore = matchForm.homeGoals !== null && matchForm.awayGoals !== null;
    const hasWO = matchForm.homeWO || matchForm.awayWO;
    const played = hasScore || hasWO;

    if (editingMatch) {
      onUpdateMatch(editingMatch.id, {
        homeTeamId: matchForm.homeTeamId,
        awayTeamId: matchForm.awayTeamId,
        homeGoals: matchForm.homeWO || matchForm.awayWO ? null : matchForm.homeGoals,
        awayGoals: matchForm.homeWO || matchForm.awayWO ? null : matchForm.awayGoals,
        homeWO: matchForm.homeWO,
        awayWO: matchForm.awayWO,
        played,
        matchTime: matchForm.matchTime || undefined,
      });
      toast.success('Partida atualizada!');
    } else {
      onCreateMatch({
        homeTeamId: matchForm.homeTeamId,
        awayTeamId: matchForm.awayTeamId,
        homeGoals: matchForm.homeWO || matchForm.awayWO ? null : matchForm.homeGoals,
        awayGoals: matchForm.homeWO || matchForm.awayWO ? null : matchForm.awayGoals,
        homeWO: matchForm.homeWO,
        awayWO: matchForm.awayWO,
        round: selectedRound.number,
        championshipId,
        gameDayId,
        played,
        matchTime: matchForm.matchTime || undefined,
      });
      toast.success('Partida adicionada!');
    }

    setIsAddMatchOpen(false);
  };

  const handleDeleteMatch = (match: Match) => {
    if (confirm('Tem certeza que deseja excluir esta partida?')) {
      onDeleteMatch(match.id);
      toast.success('Partida excluída!');
    }
  };

  const getDisplayScore = (match: Match) => {
    if (match.homeWO) return { home: '0', away: '3', isWO: true };
    if (match.awayWO) return { home: '3', away: '0', isWO: true };
    if (match.homeGoals === null || match.awayGoals === null) {
      return { home: '-', away: '-', isWO: false, notPlayed: true };
    }
    return { home: match.homeGoals.toString(), away: match.awayGoals.toString(), isWO: false };
  };

  const defaultOpenRound = rounds[0]?.id || '';

  if (teams.length < 2) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardContent className="py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <LayoutGrid className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            Adicione pelo menos 2 times para criar rodadas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Add Round Button */}
      <div className="flex justify-end mb-4">
        <Button onClick={() => setIsAddRoundOpen(true)} className="gap-2 bg-gradient-primary hover:opacity-90">
          <Plus className="h-4 w-4" />
          Nova Rodada
        </Button>
      </div>

      {rounds.length === 0 ? (
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 animate-float">
              <LayoutGrid className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">
              Nenhuma rodada criada ainda
            </p>
            <Button onClick={() => setIsAddRoundOpen(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeira Rodada
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible defaultValue={defaultOpenRound} className="space-y-3">
          {rounds.map((round) => {
            const roundMatches = getRoundMatches(round.number);
            const playedCount = roundMatches.filter(m => m.played || m.homeGoals !== null || m.homeWO || m.awayWO).length;

            return (
              <AccordionItem
                key={round.id}
                value={round.id}
                className="border rounded-xl bg-gradient-card overflow-hidden border-border/50"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex items-center gap-2">
                      {roundMatches.length > 0 && playedCount === roundMatches.length ? (
                        <div className="h-7 w-7 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-amber-600" />
                        </div>
                      )}
                      <div className="flex flex-col items-start">
                        <span className="font-semibold">
                          Rodada {round.number}
                          {round.name && <span className="font-normal text-muted-foreground ml-2">- {round.name}</span>}
                        </span>
                        {round.date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {formatDateBR(round.date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-auto mr-4 bg-muted/50">
                      {playedCount}/{roundMatches.length} jogos
                    </Badge>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {roundMatches.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma partida nesta rodada
                      </p>
                    ) : (
                      roundMatches.map((match) => {
                        const homeTeam = getTeam(match.homeTeamId);
                        const awayTeam = getTeam(match.awayTeamId);

                        if (!homeTeam || !awayTeam) return null;

                        const score = getDisplayScore(match);
                        const isNotPlayed = score.notPlayed;

                        return (
                          <div
                            key={match.id}
                            className={`flex items-center gap-2 sm:gap-3 p-3 rounded-xl border transition-colors ${isNotPlayed ? 'bg-muted/30 border-dashed' : 'bg-muted/50 border-border/50'}`}
                          >
                            {/* Match Time */}
                            {match.matchTime && (
                              <span className="text-xs text-muted-foreground font-medium min-w-[40px] text-center flex-shrink-0">
                                {match.matchTime}
                              </span>
                            )}

                            {/* Home Team */}
                            <div className="flex-1 text-right min-w-0">
                              <div className="flex items-center justify-end gap-2">
                                <span className="font-medium text-xs sm:text-sm truncate">
                                  {homeTeam.name}
                                </span>
                                {homeTeam.logo ? (
                                  <img
                                    src={homeTeam.logo}
                                    alt={homeTeam.name}
                                    className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                    {homeTeam.name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              {match.homeWO && (
                                <span className="text-xs text-destructive flex items-center justify-end gap-1 mt-0.5">
                                  <AlertTriangle className="h-3 w-3" /> W.O.
                                </span>
                              )}
                            </div>

                            {/* Score */}
                            <div className="flex items-center justify-center min-w-[60px] sm:min-w-[80px]">
                              {isNotPlayed ? (
                                <span className="text-xs sm:text-sm text-muted-foreground italic">vs</span>
                              ) : (
                                <div className="flex items-center gap-1 sm:gap-1.5">
                                  <span className="text-base sm:text-lg font-bold tabular-nums">
                                    {score.home}
                                  </span>
                                  <span className="text-muted-foreground text-xs sm:text-sm">x</span>
                                  <span className="text-base sm:text-lg font-bold tabular-nums">
                                    {score.away}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Away Team */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {awayTeam.logo ? (
                                  <img
                                    src={awayTeam.logo}
                                    alt={awayTeam.name}
                                    className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                    {awayTeam.name.charAt(0)}
                                  </div>
                                )}
                                <span className="font-medium text-xs sm:text-sm truncate">
                                  {awayTeam.name}
                                </span>
                              </div>
                              {match.awayWO && (
                                <span className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                                  <AlertTriangle className="h-3 w-3" /> W.O.
                                </span>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                onClick={() => openEditMatchDialog(match, round)}
                              >
                                <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteMatch(match)}
                              >
                                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Round Actions */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-4 pt-3 border-t">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => openAddMatchDialog(round)}
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar Jogo
                      </Button>
                      {onUpdateRound && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => openEditRoundDialog(round)}
                        >
                          <Edit2 className="h-4 w-4" />
                          Editar Rodada
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteRound(round)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir Rodada
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Add Round Dialog */}
      <Dialog open={isAddRoundOpen} onOpenChange={setIsAddRoundOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              Nova Rodada
            </DialogTitle>
            <DialogDescription>
              Crie uma nova rodada para adicionar partidas
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="round-name">Nome (opcional)</Label>
              <Input
                id="round-name"
                placeholder="Ex: Semifinal, Fase de grupos..."
                value={newRoundName}
                onChange={(e) => setNewRoundName(e.target.value)}
                className="h-11"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateRound()}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddRoundOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateRound} className="bg-gradient-primary hover:opacity-90">
              Criar Rodada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Round Dialog */}
      <Dialog open={isEditRoundOpen} onOpenChange={setIsEditRoundOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" />
              Editar Rodada {editingRound?.number}
            </DialogTitle>
            <DialogDescription>
              Altere o nome e a data da rodada
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-round-name">Nome (opcional)</Label>
              <Input
                id="edit-round-name"
                placeholder="Ex: Semifinal, Fase de grupos..."
                value={editRoundName}
                onChange={(e) => setEditRoundName(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-round-date">Data (opcional)</Label>
              <Input
                id="edit-round-date"
                type="date"
                value={editRoundDate}
                onChange={(e) => setEditRoundDate(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditRoundOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditRound} className="bg-gradient-primary hover:opacity-90">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Match Dialog */}
      <Dialog open={isAddMatchOpen} onOpenChange={setIsAddMatchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMatch ? 'Editar Partida' : 'Adicionar Partida'}
            </DialogTitle>
            <DialogDescription>
              {selectedRound && `Rodada ${selectedRound.number}${selectedRound.name ? ` - ${selectedRound.name}` : ''}`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Time Casa</Label>
                <Select
                  value={matchForm.homeTeamId}
                  onValueChange={(value) => setMatchForm(prev => ({ ...prev, homeTeamId: value }))}
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
                <Label>Time Visitante</Label>
                <Select
                  value={matchForm.awayTeamId}
                  onValueChange={(value) => setMatchForm(prev => ({ ...prev, awayTeamId: value }))}
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

            {/* Match Time */}
            <div className="grid gap-2">
              <Label htmlFor="match-time">Horário (opcional)</Label>
              <Input
                id="match-time"
                type="time"
                value={matchForm.matchTime}
                onChange={(e) => setMatchForm(prev => ({ ...prev, matchTime: e.target.value }))}
                className="h-11"
                placeholder="Ex: 15:30"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Gols Casa</Label>
                <Input
                  type="number"
                  min="0"
                  value={matchForm.homeGoals ?? ''}
                  placeholder="Não jogou"
                  onChange={(e) => setMatchForm(prev => ({
                    ...prev,
                    homeGoals: e.target.value === '' ? null : parseInt(e.target.value)
                  }))}
                  disabled={matchForm.homeWO || matchForm.awayWO}
                  className="h-11"
                />
              </div>
              <div className="grid gap-2">
                <Label>Gols Visitante</Label>
                <Input
                  type="number"
                  min="0"
                  value={matchForm.awayGoals ?? ''}
                  placeholder="Não jogou"
                  onChange={(e) => setMatchForm(prev => ({
                    ...prev,
                    awayGoals: e.target.value === '' ? null : parseInt(e.target.value)
                  }))}
                  disabled={matchForm.homeWO || matchForm.awayWO}
                  className="h-11"
                />
              </div>
            </div>

            <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-medium">W.O. (Walk Over)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="home-wo"
                    checked={matchForm.homeWO}
                    onCheckedChange={(checked) => setMatchForm(prev => ({
                      ...prev,
                      homeWO: !!checked,
                      awayWO: checked ? false : prev.awayWO
                    }))}
                  />
                  <Label htmlFor="home-wo" className="text-sm cursor-pointer">Casa deu W.O.</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="away-wo"
                    checked={matchForm.awayWO}
                    onCheckedChange={(checked) => setMatchForm(prev => ({
                      ...prev,
                      awayWO: !!checked,
                      homeWO: checked ? false : prev.homeWO
                    }))}
                  />
                  <Label htmlFor="away-wo" className="text-sm cursor-pointer">Visitante deu W.O.</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddMatchOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitMatch} className="bg-gradient-primary hover:opacity-90">
              {editingMatch ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RoundsList;
