import { useState, useEffect } from 'react';
import { GameDay, Team, Match, Round } from '@/types/championship';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Users, Calendar, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import RoundsList from './RoundsList';
import StandingsTable from './StandingsTable';
import { calculateStandings } from '@/utils/standings';

const AVAILABLE_GAME_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

interface GameDayManagerProps {
  gameDays: GameDay[];
  allTeams: Team[];
  matches: Match[];
  rounds: Round[];
  championshipId: string;
  championshipName?: string;
  qualifyingTeams?: Record<string, number>;
  onCreateGameDay: (name: string) => GameDay | Promise<GameDay | null>;
  onDeleteGameDay: (id: string) => void;
  onAddTeamToGameDay: (gameDayId: string, teamId: string) => void;
  onRemoveTeamFromGameDay: (gameDayId: string, teamId: string) => void;
  onUpdateGameDayTeams: (gameDayId: string, teamIds: string[]) => void;
  onCreateRound: (name?: string, gameDayId?: string) => void;
  onDeleteRound: (id: string) => void;
  onCreateMatch: (data: Omit<Match, 'id' | 'createdAt'>) => void;
  onUpdateMatch: (id: string, data: Partial<Match>) => void;
  onDeleteMatch: (id: string) => void;
}

const GameDayManager = ({
  gameDays,
  allTeams,
  matches,
  rounds,
  championshipId,
  championshipName,
  qualifyingTeams,
  onCreateGameDay,
  onDeleteGameDay,
  onAddTeamToGameDay,
  onRemoveTeamFromGameDay,
  onUpdateGameDayTeams,
  onCreateRound,
  onDeleteRound,
  onCreateMatch,
  onUpdateMatch,
  onDeleteMatch,
}: GameDayManagerProps) => {
  const [isManageDaysOpen, setIsManageDaysOpen] = useState(false);
  const [isManageTeamsOpen, setIsManageTeamsOpen] = useState(false);
  const [selectedGameDay, setSelectedGameDay] = useState<GameDay | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [localSelectedTeams, setLocalSelectedTeams] = useState<Set<string>>(new Set());
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (gameDays.length > 0 && !activeTab) {
      setActiveTab(gameDays[0].id);
    }
  }, [gameDays, activeTab]);

  useEffect(() => {
    if (selectedGameDay) {
      const currentGameDay = gameDays.find(g => g.id === selectedGameDay.id);
      if (currentGameDay) {
        setLocalSelectedTeams(new Set(currentGameDay.teamIds));
      }
    }
  }, [selectedGameDay, gameDays]);

  const openManageDays = () => {
    setSelectedDays(new Set(gameDays.map(g => g.name)));
    setIsManageDaysOpen(true);
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(day)) newSet.delete(day);
      else newSet.add(day);
      return newSet;
    });
  };

  const handleSaveDays = async () => {
    const existingNames = new Set(gameDays.map(g => g.name));

    // Create new days
    for (const day of selectedDays) {
      if (!existingNames.has(day)) {
        const created = await onCreateGameDay(day);
        if (created) {
          toast.success(`Dia "${day}" criado!`);
        }
      }
    }

    // Delete removed days
    for (const gd of gameDays) {
      if (!selectedDays.has(gd.name)) {
        onDeleteGameDay(gd.id);
        toast.success(`Dia "${gd.name}" excluído!`);
        if (activeTab === gd.id) {
          const remaining = gameDays.filter(g => g.id !== gd.id && selectedDays.has(g.name));
          setActiveTab(remaining[0]?.id || '');
        }
      }
    }

    setIsManageDaysOpen(false);
  };

  const openManageTeams = (gameDay: GameDay) => {
    setSelectedGameDay(gameDay);
    setLocalSelectedTeams(new Set(gameDay.teamIds));
    setIsManageTeamsOpen(true);
  };

  const getTeamGameDay = (teamId: string): GameDay | undefined => {
    return gameDays.find(g =>
      g.id !== selectedGameDay?.id && g.teamIds.includes(teamId)
    );
  };

  const toggleTeamInGameDay = (teamId: string) => {
    const otherDay = getTeamGameDay(teamId);
    if (otherDay && !localSelectedTeams.has(teamId)) {
      toast.error(`Este time já está no dia "${otherDay.name}". Remova-o de lá primeiro.`);
      return;
    }

    setLocalSelectedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) newSet.delete(teamId);
      else newSet.add(teamId);
      return newSet;
    });
  };

  const saveTeamSelection = () => {
    if (!selectedGameDay) return;

    const newTeamIds = Array.from(localSelectedTeams);
    onUpdateGameDayTeams(selectedGameDay.id, newTeamIds);

    setIsManageTeamsOpen(false);
    toast.success('Times atualizados!');
  };

  const getGameDayTeams = (gameDayId: string) => {
    const gameDay = gameDays.find(g => g.id === gameDayId);
    if (!gameDay) return [];
    return allTeams.filter(t => gameDay.teamIds.includes(t.id));
  };

  const getGameDayRounds = (gameDayId: string) => {
    return rounds.filter(r => r.gameDayId === gameDayId).sort((a, b) => a.number - b.number);
  };

  const getGameDayMatches = (gameDayId: string) => {
    return matches.filter(m => m.gameDayId === gameDayId);
  };

  if (gameDays.length === 0) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardContent className="py-12 text-center">
          <div className="relative inline-block mb-6">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto animate-float">
              <Calendar className="h-10 w-10 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-gradient-accent flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-accent-foreground" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhum dia de jogo criado</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Crie dias de jogo (ex: Sábado, Domingo) para organizar os times e rodadas separadamente.
          </p>
          <Button onClick={openManageDays} className="gap-2 bg-gradient-primary hover:opacity-90">
            <Plus className="h-4 w-4" />
            Gerenciar Dias de Jogo
          </Button>

          {/* Manage Days Dialog */}
          <Dialog open={isManageDaysOpen} onOpenChange={setIsManageDaysOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Gerenciar Dias de Jogo
                </DialogTitle>
                <DialogDescription>
                  Selecione os dias da semana com jogos
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2 py-4">
                {AVAILABLE_GAME_DAYS.map(day => (
                  <div
                    key={day}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      selectedDays.has(day)
                        ? 'bg-primary/10 border-primary/30'
                        : 'hover:bg-muted/50 border-border'
                    }`}
                    onClick={() => toggleDay(day)}
                  >
                    <Checkbox
                      checked={selectedDays.has(day)}
                      onCheckedChange={() => toggleDay(day)}
                      className="pointer-events-none"
                    />
                    <span className="text-sm font-medium">{day}</span>
                  </div>
                ))}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsManageDaysOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveDays} className="bg-gradient-primary hover:opacity-90">
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={openManageDays} variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Gerenciar Dias
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 mb-4">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 h-auto p-1 bg-muted/50">
            {gameDays.map(day => (
              <TabsTrigger key={day.id} value={day.id} className="gap-2 px-4 py-2.5">
                {day.name}
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {day.teamIds.length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {gameDays.map(day => {
          const dayTeams = getGameDayTeams(day.id);
          const dayRounds = getGameDayRounds(day.id);
          const dayMatches = getGameDayMatches(day.id);
          const standings = calculateStandings(dayTeams, dayMatches);

          return (
            <TabsContent key={day.id} value={day.id} className="space-y-6">
              <Card className="bg-gradient-card border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      {day.name}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => openManageTeams(day)}
                      >
                        <Users className="h-4 w-4" />
                        Times ({dayTeams.length})
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Tabs defaultValue="rounds">
                <TabsList className="grid w-full grid-cols-2 max-w-xs bg-muted/50">
                  <TabsTrigger value="rounds">Rodadas</TabsTrigger>
                  <TabsTrigger value="standings">Classificação</TabsTrigger>
                </TabsList>

                <TabsContent value="rounds" className="mt-4">
                  <RoundsList
                    rounds={dayRounds}
                    matches={dayMatches}
                    teams={dayTeams}
                    championshipId={championshipId}
                    gameDayId={day.id}
                    onCreateRound={(name) => onCreateRound(name, day.id)}
                    onDeleteRound={onDeleteRound}
                    onCreateMatch={onCreateMatch}
                    onUpdateMatch={onUpdateMatch}
                    onDeleteMatch={onDeleteMatch}
                  />
                </TabsContent>

                <TabsContent value="standings" className="mt-4">
                  <Card className="bg-gradient-card border-border/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Classificação - {day.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <StandingsTable
                        standings={standings}
                        title={`Classificação - ${day.name}`}
                        championshipName={championshipName}
                        showExport={true}
                        qualifyingCount={qualifyingTeams?.[day.name]}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Manage Days Dialog */}
      <Dialog open={isManageDaysOpen} onOpenChange={setIsManageDaysOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Gerenciar Dias de Jogo
            </DialogTitle>
            <DialogDescription>
              Selecione os dias da semana com jogos. Remover um dia exclui suas rodadas e partidas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-4">
            {AVAILABLE_GAME_DAYS.map(day => {
              const existingDay = gameDays.find(g => g.name === day);
              const hasData = existingDay && (
                rounds.some(r => r.gameDayId === existingDay.id) ||
                matches.some(m => m.gameDayId === existingDay.id)
              );
              return (
                <div
                  key={day}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    selectedDays.has(day)
                      ? 'bg-primary/10 border-primary/30'
                      : 'hover:bg-muted/50 border-border'
                  }`}
                  onClick={() => toggleDay(day)}
                >
                  <Checkbox
                    checked={selectedDays.has(day)}
                    onCheckedChange={() => toggleDay(day)}
                    className="pointer-events-none"
                  />
                  <div>
                    <span className="text-sm font-medium">{day}</span>
                    {hasData && !selectedDays.has(day) && (
                      <p className="text-xs text-destructive">Tem dados!</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsManageDaysOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveDays} className="bg-gradient-primary hover:opacity-90">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Teams Dialog */}
      <Dialog open={isManageTeamsOpen} onOpenChange={(open) => {
        if (!open) {
          setIsManageTeamsOpen(false);
          setLocalSelectedTeams(new Set());
        }
      }}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Gerenciar Times - {selectedGameDay?.name}
            </DialogTitle>
            <DialogDescription>
              Selecione os times que jogam neste dia
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {allTeams.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum time cadastrado no campeonato
              </p>
            ) : (
              allTeams.map(team => {
                const isInGameDay = localSelectedTeams.has(team.id);
                const otherDay = getTeamGameDay(team.id);
                const isDisabled = !!otherDay && !isInGameDay;

                return (
                  <div
                    key={team.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isDisabled
                        ? 'opacity-50 cursor-not-allowed bg-muted/30 border-border'
                        : isInGameDay
                          ? 'bg-primary/10 border-primary/30 cursor-pointer'
                          : 'hover:bg-muted/50 border-border cursor-pointer'
                    }`}
                    onClick={() => !isDisabled && toggleTeamInGameDay(team.id)}
                  >
                    <Checkbox
                      checked={isInGameDay}
                      onCheckedChange={() => !isDisabled && toggleTeamInGameDay(team.id)}
                      className="pointer-events-none"
                      disabled={isDisabled}
                    />
                    {team.logo ? (
                      <img src={team.logo} alt={team.name} className="h-8 w-8 rounded-lg object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-gradient-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {team.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <span className="font-medium">{team.name}</span>
                      {otherDay && !isInGameDay && (
                        <p className="text-xs text-muted-foreground">Já está no {otherDay.name}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsManageTeamsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveTeamSelection} className="bg-gradient-primary hover:opacity-90">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GameDayManager;
