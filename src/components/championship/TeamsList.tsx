import { Team } from '@/types/championship';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface TeamsListProps {
  teams: Team[];
  onRemove: (teamId: string) => void;
  onUpdate: (id: string, data: Partial<Team>) => void;
}

const TeamsList = ({ teams, onRemove, onUpdate }: TeamsListProps) => {
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({ name: '', logo: '' });

  const handleEdit = () => {
    if (!formData.name.trim() || !editingTeam) {
      toast.error('O nome do time é obrigatório');
      return;
    }
    onUpdate(editingTeam.id, {
      name: formData.name,
      logo: formData.logo || undefined,
    });
    setEditingTeam(null);
    setFormData({ name: '', logo: '' });
    toast.success('Time atualizado com sucesso!');
  };

  const openEditDialog = (team: Team) => {
    setFormData({
      name: team.name,
      logo: team.logo || '',
    });
    setEditingTeam(team);
  };

  if (teams.length === 0) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardContent className="py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 animate-float">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            Nenhum time cadastrado neste campeonato
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <Card key={team.id} className="bg-gradient-card border-border/50 group">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {team.logo ? (
                  <img
                    src={team.logo}
                    alt={team.name}
                    className="h-12 w-12 rounded-xl object-cover shadow-sm"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-gradient-primary/10 flex items-center justify-center text-lg font-bold text-primary shadow-sm">
                    {team.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{team.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Criado em {new Date(team.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Dialog open={editingTeam?.id === team.id} onOpenChange={(open) => !open && setEditingTeam(null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(team)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Editar Time</DialogTitle>
                        <DialogDescription>
                          Atualize as informações do time
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="team-name">Nome do Time *</Label>
                          <Input
                            id="team-name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="h-11"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="team-logo">URL do Logo</Label>
                          <Input
                            id="team-logo"
                            value={formData.logo}
                            onChange={(e) => setFormData(prev => ({ ...prev, logo: e.target.value }))}
                            placeholder="https://exemplo.com/logo.png"
                            className="h-11"
                          />
                        </div>
                      </div>
                      <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setEditingTeam(null)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleEdit} className="bg-gradient-primary hover:opacity-90">
                          Salvar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover time?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O time será removido deste campeonato. Todas as partidas com este time também serão excluídas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            onRemove(team.id);
                            toast.success('Time removido do campeonato!');
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
};

export default TeamsList;
