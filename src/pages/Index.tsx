import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useChampionships } from '@/hooks/useChampionships';
import { useAuth } from '@/hooks/useAuth';
import { KnockoutPhase } from '@/types/championship';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trophy, Plus, Calendar, Users, Pencil, Trash2, Sparkles, Swords, LogOut } from 'lucide-react';
import { toast } from 'sonner';

const AVAILABLE_PHASES: { key: KnockoutPhase; label: string }[] = [
  { key: 'round-of-16', label: 'Oitavas de Final' },
  { key: 'quarter-finals', label: 'Quartas de Final' },
  { key: 'semi-finals', label: 'Semifinais' },
  { key: 'final', label: 'Final' },
];

const AVAILABLE_GAME_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const Index = () => {
  const { championships, createChampionship, updateChampionship, deleteChampionship, getChampionshipTeams, getChampionshipMatches, getChampionshipGameDays, createGameDay, deleteGameDay } = useChampionships();
  const { signOut, user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingChampionship, setEditingChampionship] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    description: '',
    knockoutPhases: ['quarter-finals', 'semi-finals', 'final'] as KnockoutPhase[],
    gameDayNames: ['Sábado', 'Domingo'] as string[],
    qualifyingTeams: {} as Record<string, number>,
  });

  const togglePhase = (phase: KnockoutPhase) => {
    setFormData(prev => {
      const phases = prev.knockoutPhases.includes(phase)
        ? prev.knockoutPhases.filter(p => p !== phase)
        : [...prev.knockoutPhases, phase];
      return { ...prev, knockoutPhases: phases };
    });
  };

  const toggleGameDay = (day: string) => {
    setFormData(prev => {
      const days = prev.gameDayNames.includes(day)
        ? prev.gameDayNames.filter(d => d !== day)
        : [...prev.gameDayNames, day];
      const qt = { ...prev.qualifyingTeams };
      if (!days.includes(day)) delete qt[day];
      else if (!qt[day]) qt[day] = 6;
      return { ...prev, gameDayNames: days, qualifyingTeams: qt };
    });
  };

  const resetForm = () => {
    setFormData({ name: '', startDate: '', description: '', knockoutPhases: ['quarter-finals', 'semi-finals', 'final'], gameDayNames: ['Sábado', 'Domingo'], qualifyingTeams: { 'Sábado': 6, 'Domingo': 6 } });
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('O nome do campeonato é obrigatório');
      return;
    }
    const championship = await createChampionship({ ...formData, gameDays: [] });
    if (!championship) return;
    for (const dayName of formData.gameDayNames) {
      await createGameDay(championship.id, dayName);
    }
    if (Object.keys(formData.qualifyingTeams).length > 0) {
      await updateChampionship(championship.id, { qualifyingTeams: formData.qualifyingTeams });
    }
    resetForm();
    setIsCreateOpen(false);
    toast.success('Campeonato criado com sucesso!');
  };

  const handleEdit = async () => {
    if (!formData.name.trim() || !editingChampionship) {
      toast.error('O nome do campeonato é obrigatório');
      return;
    }

    // Get existing game days for this championship
    const existingGameDays = getChampionshipGameDays(editingChampionship);
    const existingDayNames = new Set(existingGameDays.map(g => g.name));

    // Create new game days
    for (const dayName of formData.gameDayNames) {
      if (!existingDayNames.has(dayName)) {
        await createGameDay(editingChampionship, dayName);
      }
    }

    // Delete removed game days
    for (const gd of existingGameDays) {
      if (!formData.gameDayNames.includes(gd.name)) {
        await deleteGameDay(gd.id);
      }
    }

    await updateChampionship(editingChampionship, {
      name: formData.name,
      startDate: formData.startDate,
      description: formData.description,
      knockoutPhases: formData.knockoutPhases,
      gameDayNames: formData.gameDayNames,
      qualifyingTeams: formData.qualifyingTeams,
    });
    resetForm();
    setEditingChampionship(null);
    toast.success('Campeonato atualizado com sucesso!');
  };

  const handleDelete = async (id: string) => {
    await deleteChampionship(id);
    toast.success('Campeonato excluído com sucesso!');
  };

  const openEditDialog = (championship: typeof championships[0]) => {
    const existingGameDays = getChampionshipGameDays(championship.id);
    const dayNames = existingGameDays.map(g => g.name);
    setFormData({
      name: championship.name,
      startDate: championship.startDate || '',
      description: championship.description || '',
      knockoutPhases: championship.knockoutPhases || ['quarter-finals', 'semi-finals', 'final'],
      gameDayNames: dayNames,
      qualifyingTeams: championship.qualifyingTeams || {},
    });
    setEditingChampionship(championship.id);
  };

  const PhaseSelector = () => (
    <div className="grid gap-2">
      <Label className="flex items-center gap-2">
        <Swords className="h-4 w-4 text-primary" />
        Fases Eliminatórias
      </Label>
      <p className="text-xs text-muted-foreground mb-1">Selecione quais fases terá no mata-mata</p>
      <div className="grid grid-cols-2 gap-2">
        {AVAILABLE_PHASES.map(phase => (
          <div
            key={phase.key}
            className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
              formData.knockoutPhases.includes(phase.key)
                ? 'bg-primary/10 border-primary/30'
                : 'hover:bg-muted/50 border-border'
            }`}
            onClick={() => togglePhase(phase.key)}
          >
            <Checkbox
              checked={formData.knockoutPhases.includes(phase.key)}
              onCheckedChange={() => togglePhase(phase.key)}
              className="pointer-events-none"
            />
            <span className="text-sm font-medium">{phase.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const GameDaySelector = () => (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Dias de Jogo
        </Label>
        <p className="text-xs text-muted-foreground mb-1">Selecione os dias da semana com jogos</p>
        <div className="grid grid-cols-2 gap-2">
          {AVAILABLE_GAME_DAYS.map(day => (
            <div
              key={day}
              className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                formData.gameDayNames.includes(day)
                  ? 'bg-primary/10 border-primary/30'
                  : 'hover:bg-muted/50 border-border'
              }`}
              onClick={() => toggleGameDay(day)}
            >
              <Checkbox
                checked={formData.gameDayNames.includes(day)}
                onCheckedChange={() => toggleGameDay(day)}
                className="pointer-events-none"
              />
              <span className="text-sm font-medium">{day}</span>
            </div>
          ))}
        </div>
      </div>
      {formData.gameDayNames.length > 0 && (
        <div className="grid gap-2 p-3 rounded-lg border border-border bg-muted/30">
          <Label className="text-sm font-medium">Quantos times classificam por dia?</Label>
          <p className="text-xs text-muted-foreground mb-1">Os primeiros colocados ficarão destacados em verde</p>
          <div className="grid gap-2">
            {formData.gameDayNames.map(day => (
              <div key={day} className="flex items-center gap-3">
                <span className="text-sm font-medium min-w-[80px]">{day}</span>
                <Input
                  type="number"
                  min="1"
                  value={formData.qualifyingTeams[day] || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    qualifyingTeams: { ...prev.qualifyingTeams, [day]: parseInt(e.target.value) || 0 }
                  }))}
                  placeholder="Ex: 6"
                  className="h-9 w-24"
                />
                <span className="text-xs text-muted-foreground">times</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-lg glow-primary">
                  <Trophy className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gradient-accent flex items-center justify-center">
                  <Sparkles className="h-2.5 w-2.5 text-accent-foreground" />
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  Gerenciador de Campeonatos
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Organize seus torneios de futebol
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="gap-2 bg-gradient-primary hover:opacity-90 transition-opacity shadow-lg glow-primary w-full sm:w-auto">
                    <Plus className="h-5 w-5" />
                    <span>Novo Campeonato</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      Criar Novo Campeonato
                    </DialogTitle>
                    <DialogDescription>Preencha as informações do seu campeonato</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nome do Campeonato *</Label>
                      <Input id="name" value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Campeonato Brasileiro 2024" className="h-11" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="startDate">Data de Início</Label>
                      <Input id="startDate" type="date" value={formData.startDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))} className="h-11" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea id="description" value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descrição opcional do campeonato" className="resize-none" rows={3} />
                    </div>
                    <PhaseSelector />
                    <GameDaySelector />
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreate} className="bg-gradient-primary hover:opacity-90">Criar Campeonato</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="icon" onClick={() => signOut()} title="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 sm:py-10">
        {championships.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center">
            <div className="relative mb-8">
              <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center animate-float">
                <Trophy className="h-14 w-14 sm:h-16 sm:w-16 text-primary" />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-8 w-20 bg-black/5 dark:bg-white/5 rounded-full blur-xl" />
            </div>
            <h2 className="mb-3 text-xl sm:text-2xl font-bold text-foreground">Nenhum campeonato ainda</h2>
            <p className="mb-8 text-muted-foreground max-w-md px-4">
              Crie seu primeiro campeonato e comece a organizar suas partidas de futebol
            </p>
            <Button onClick={() => setIsCreateOpen(true)} size="lg"
              className="gap-2 bg-gradient-primary hover:opacity-90 shadow-lg glow-primary">
              <Plus className="h-5 w-5" />
              Criar Primeiro Campeonato
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {championships.map((championship) => {
              const teams = getChampionshipTeams(championship.id);
              const matches = getChampionshipMatches(championship.id);

              return (
                <Card key={championship.id} className="card-hover group relative overflow-hidden bg-gradient-card border-border/50">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Dialog open={editingChampionship === championship.id} onOpenChange={(open) => !open && setEditingChampionship(null)}>
                      <DialogTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                          onClick={() => openEditDialog(championship)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Editar Campeonato</DialogTitle>
                          <DialogDescription>Atualize as informações do campeonato</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="edit-name">Nome do Campeonato *</Label>
                            <Input id="edit-name" value={formData.name}
                              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className="h-11" />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="edit-startDate">Data de Início</Label>
                            <Input id="edit-startDate" type="date" value={formData.startDate}
                              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))} className="h-11" />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="edit-description">Descrição</Label>
                            <Textarea id="edit-description" value={formData.description}
                              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                              className="resize-none" rows={3} />
                          </div>
                          <PhaseSelector />
                          <GameDaySelector />
                        </div>
                        <DialogFooter className="gap-2">
                          <Button variant="outline" onClick={() => setEditingChampionship(null)}>Cancelar</Button>
                          <Button onClick={handleEdit} className="bg-gradient-primary hover:opacity-90">Salvar</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir campeonato?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Todas as partidas registradas neste campeonato também serão excluídas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(championship.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <Link to={`/championship/${championship.id}`} className="relative z-0">
                    <CardHeader className="pb-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary/10 text-primary mb-1">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <CardTitle className="mt-3 line-clamp-1 text-lg">{championship.name}</CardTitle>
                      {championship.description && (
                        <CardDescription className="line-clamp-2 text-sm">{championship.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1.5 rounded-lg">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">{teams.length}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1.5 rounded-lg">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">{matches.length}</span>
                        </div>
                      </div>
                      {championship.startDate && (
                        <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          Início: {new Date(championship.startDate).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
