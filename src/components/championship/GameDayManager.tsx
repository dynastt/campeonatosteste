import { useState, useEffect } from 'react';
import { GameDay, Team, Match, Round } from '@/types/championship';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Users, Calendar, Sparkles, Download } from 'lucide-react';
import { toast } from 'sonner';
import RoundsList from './RoundsList';
import StandingsTable from './StandingsTable';
import { calculateStandings } from '@/utils/standings';

interface GameDayManagerProps {
  gameDays: GameDay[];
  allTeams: Team[];
  matches: Match[];
  rounds: Round[];
  championshipId: string;
  onCreateGameDay: (name: string) => GameDay;
  onDeleteGameDay: (id: string) => void;
  onAddTeamToGameDay: (gameDayId: string, teamId: string) => void;
  onRemoveTeamFromGameDay: (gameDayId: string, teamId: string) => void;
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
  onCreateGameDay,
  onDeleteGameDay,
  onAddTeamToGameDay,
  onRemoveTeamFromGameDay,
  onCreateRound,
  onDeleteRound,
  onCreateMatch,
  onUpdateMatch,
  onDeleteMatch,
}: GameDayManagerProps) => {
  const [isCreateDayOpen, setIsCreateDayOpen] = useState(false);
  const [newDayName, setNewDayName] = useState('');
  const [isManageTeamsOpen, setIsManageTeamsOpen] = useState(false);
  const [selectedGameDay, setSelectedGameDay] = useState<GameDay | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [localSelectedTeams, setLocalSelectedTeams] = useState<Set<string>>(new Set());

  // Update activeTab when gameDays change
  useEffect(() => {
    if (gameDays.length > 0 && !activeTab) {
      setActiveTab(gameDays[0].id);
    }
  }, [gameDays, activeTab]);

  // Sync local state with selected game day
  useEffect(() => {
    if (selectedGameDay) {
      const currentGameDay = gameDays.find(g => g.id === selectedGameDay.id);
      if (currentGameDay) {
        setLocalSelectedTeams(new Set(currentGameDay.teamIds));
      }
    }
  }, [selectedGameDay, gameDays]);

  const handleCreateGameDay = () => {
    if (!newDayName.trim()) {
      toast.error('Digite um nome para o dia');
      return;
    }
    const gameDay = onCreateGameDay(newDayName.trim());
    setNewDayName('');
    setIsCreateDayOpen(false);
    setActiveTab(gameDay.id);
    toast.success(`Dia "${newDayName}" criado!`);
  };

  const handleDeleteGameDay = (gameDay: GameDay) => {
    if (confirm(`Tem certeza que deseja excluir "${gameDay.name}"? Todas as rodadas e partidas deste dia serão excluídas.`)) {
      onDeleteGameDay(gameDay.id);
      if (activeTab === gameDay.id) {
        setActiveTab(gameDays.filter(g => g.id !== gameDay.id)[0]?.id || '');
      }
      toast.success('Dia excluído!');
    }
  };

  const openManageTeams = (gameDay: GameDay) => {
    setSelectedGameDay(gameDay);
    setLocalSelectedTeams(new Set(gameDay.teamIds));
    setIsManageTeamsOpen(true);
  };

  const toggleTeamInGameDay = (teamId: string) => {
    setLocalSelectedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  const saveTeamSelection = () => {
    if (!selectedGameDay) return;

    const currentTeamIds = new Set(gameDays.find(g => g.id === selectedGameDay.id)?.teamIds || []);
    
    // Remove teams that were unchecked
    currentTeamIds.forEach(teamId => {
      if (!localSelectedTeams.has(teamId)) {
        onRemoveTeamFromGameDay(selectedGameDay.id, teamId);
      }
    });

    // Add teams that were checked
    localSelectedTeams.forEach(teamId => {
      if (!currentTeamIds.has(teamId)) {
        onAddTeamToGameDay(selectedGameDay.id, teamId);
      }
    });

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
            Crie dias de jogo (ex: Sábado, Domingo) para organizar os times e rodadas separadamente. Cada dia terá sua própria classificação!
          </p>
          <Button onClick={() => setIsCreateDayOpen(true)} className="gap-2 bg-gradient-primary hover:opacity-90">
            <Plus className="h-4 w-4" />
            Criar Dia de Jogo
          </Button>

          {/* Create Day Dialog */}
          <Dialog open={isCreateDayOpen} onOpenChange={setIsCreateDayOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Criar Dia de Jogo
                </DialogTitle>
                <DialogDescription>
                  Ex: Sábado, Domingo, Segunda-feira
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="day-name">Nome do Dia</Label>
                  <Input
                    id="day-name"
                    placeholder="Ex: Sábado"
                    value={newDayName}
                    onChange={(e) => setNewDayName(e.target.value)}
                    className="h-11"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateGameDay()}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsCreateDayOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateGameDay} className="bg-gradient-primary hover:opacity-90">
                  Criar
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
        <Button onClick={() => setIsCreateDayOpen(true)} variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Dia
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
              {/* Day Header */}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteGameDay(day)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Day Content Tabs */}
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
                        showExport={true}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Create Day Dialog */}
      <Dialog open={isCreateDayOpen} onOpenChange={setIsCreateDayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Criar Dia de Jogo
            </DialogTitle>
            <DialogDescription>
              Ex: Sábado, Domingo, Segunda-feira
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="day-name-2">Nome do Dia</Label>
              <Input
                id="day-name-2"
                placeholder="Ex: Sábado"
                value={newDayName}
                onChange={(e) => setNewDayName(e.target.value)}
                className="h-11"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGameDay()}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateDayOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGameDay} className="bg-gradient-primary hover:opacity-90">
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Teams Dialog - FIXED */}
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

                return (
                  <div
                    key={team.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isInGameDay 
                        ? 'bg-primary/10 border-primary/30' 
                        : 'hover:bg-muted/50 border-border'
                    }`}
                    onClick={() => toggleTeamInGameDay(team.id)}
                  >
                    <Checkbox 
                      checked={isInGameDay}
                      onCheckedChange={() => toggleTeamInGameDay(team.id)}
                      className="pointer-events-none"
                    />
                    {team.logo ? (
                      <img src={team.logo} alt={team.name} className="h-8 w-8 rounded-lg object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-gradient-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {team.name.charAt(0)}
                      </div>
                    )}
                    <span className="font-medium">{team.name}</span>
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
