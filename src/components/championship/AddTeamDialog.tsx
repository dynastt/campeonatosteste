import { useState } from 'react';
import { Team } from '@/types/championship';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface AddTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableTeams: Team[];
  onCreateTeam: (name: string, logo?: string) => void;
  onAddExistingTeam: (teamId: string) => void;
}

const AddTeamDialog = ({ open, onOpenChange, availableTeams, onCreateTeam, onAddExistingTeam }: AddTeamDialogProps) => {
  const [formData, setFormData] = useState({ name: '', logo: '' });
  const [selectedTeamId, setSelectedTeamId] = useState('');

  const handleCreateTeam = () => {
    if (!formData.name.trim()) {
      toast.error('O nome do time é obrigatório');
      return;
    }
    onCreateTeam(formData.name, formData.logo || undefined);
    setFormData({ name: '', logo: '' });
    onOpenChange(false);
    toast.success('Time criado e adicionado ao campeonato!');
  };

  const handleAddExisting = () => {
    if (!selectedTeamId) {
      toast.error('Selecione um time');
      return;
    }
    onAddExistingTeam(selectedTeamId);
    setSelectedTeamId('');
    onOpenChange(false);
    toast.success('Time adicionado ao campeonato!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Adicionar Time
          </DialogTitle>
          <DialogDescription>
            Crie um novo time ou adicione um existente
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50">
            <TabsTrigger value="new">Novo Time</TabsTrigger>
            <TabsTrigger value="existing" disabled={availableTeams.length === 0}>
              Time Existente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="new-team-name">Nome do Time *</Label>
              <Input
                id="new-team-name"
                placeholder="Ex: Flamengo"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-team-logo">URL do Logo (opcional)</Label>
              <Input
                id="new-team-logo"
                placeholder="https://exemplo.com/logo.png"
                value={formData.logo}
                onChange={(e) => setFormData(prev => ({ ...prev, logo: e.target.value }))}
                className="h-11"
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateTeam} className="gap-2 bg-gradient-primary hover:opacity-90">
                <Plus className="h-4 w-4" />
                Criar Time
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="existing" className="space-y-4 pt-4">
            {availableTeams.length > 0 ? (
              <>
                <div className="grid gap-2">
                  <Label>Selecione um Time</Label>
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Escolha um time..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            {team.logo ? (
                              <img src={team.logo} alt={team.name} className="h-5 w-5 rounded object-cover" />
                            ) : (
                              <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {team.name.charAt(0)}
                              </div>
                            )}
                            {team.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="gap-2 pt-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddExisting} className="gap-2 bg-gradient-primary hover:opacity-90">
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Todos os times já foram adicionados ao campeonato
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AddTeamDialog;
