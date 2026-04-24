import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Announcement } from '@/types/championship';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Megaphone, Upload, Trash2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface AnnouncementManagerProps {
  championshipId: string;
  championshipName: string;
  championshipAnnouncement: Announcement | null;
  globalAnnouncement: Announcement | null;
  onSave: (data: {
    id?: string;
    championshipId: string | null;
    title: string;
    description?: string;
    imageUrl?: string;
    expiresAt?: string;
    isGlobal: boolean;
  }) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}

const AnnouncementManager = ({
  championshipId,
  championshipName,
  championshipAnnouncement,
  globalAnnouncement,
  onSave,
  onDelete,
}: AnnouncementManagerProps) => {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<'this' | 'all'>('this');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState(''); // YYYY-MM-DD
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const editing = scope === 'this' ? championshipAnnouncement : globalAnnouncement;

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description || '');
      setImageUrl(editing.imageUrl || '');
      setExpiresAt(editing.expiresAt ? editing.expiresAt.slice(0, 10) : '');
    } else {
      setTitle('');
      setDescription('');
      setImageUrl('');
      setExpiresAt('');
    }
  }, [open, scope, editing?.id]);

  const hasAny = !!championshipAnnouncement || !!globalAnnouncement;

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 3MB');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${championshipId}/announcements/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('championship-logos').upload(path, file, {
        cacheControl: '3600', upsert: false,
      });
      if (upErr) {
        toast.error('Erro ao enviar imagem');
        return;
      }
      const { data } = supabase.storage.from('championship-logos').getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Informe um título');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: editing?.id,
        championshipId,
        title: title.trim(),
        description: description.trim() || undefined,
        imageUrl: imageUrl || undefined,
        // Salva como timestamp de fim do dia escolhido (UTC) para não expirar antes
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59Z`).toISOString() : undefined,
        isGlobal: scope === 'all',
      });
      toast.success('Aviso salvo!');
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm('Remover este aviso?')) return;
    await onDelete(editing.id);
    toast.success('Aviso removido!');
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full gap-2 relative"
        onClick={() => setOpen(true)}
        title="Criar um aviso (popup) para os visitantes do link público"
      >
        <Megaphone className="h-4 w-4" />
        {hasAny ? 'Aviso ativo (editar)' : 'Criar aviso para visitantes'}
        {hasAny && (
          <span className="absolute right-3 h-2 w-2 rounded-full bg-primary animate-pulse" />
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Aviso para visitantes
            </DialogTitle>
            <DialogDescription>
              Aparece como popup para quem abrir o link público. Use com moderação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Onde mostrar</Label>
              <RadioGroup value={scope} onValueChange={(v) => setScope(v as 'this' | 'all')} className="grid gap-2">
                <label className="flex items-center gap-2 rounded-lg border border-border/60 p-2.5 cursor-pointer hover:bg-muted/30">
                  <RadioGroupItem value="this" id="scope-this" />
                  <span className="text-sm">Somente neste campeonato <span className="text-muted-foreground">({championshipName})</span></span>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-border/60 p-2.5 cursor-pointer hover:bg-muted/30">
                  <RadioGroupItem value="all" id="scope-all" />
                  <span className="text-sm">Em todos os meus campeonatos</span>
                </label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ann-title">Título</Label>
              <Input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Ex: Mudança de horário" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ann-desc">Descrição</Label>
              <Textarea id="ann-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={1000} placeholder="Detalhes do aviso..." />
            </div>

            <div className="space-y-2">
              <Label>Imagem ou logo (opcional)</Label>
              {imageUrl ? (
                <div className="relative inline-block rounded-lg border border-border/60 bg-muted/40 p-2">
                  <img src={imageUrl} alt="Pré-visualização" className="h-20 w-auto max-w-[180px] object-contain" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm"
                    aria-label="Remover imagem"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                  />
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={uploading} onClick={() => inputRef.current?.click()}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? 'Enviando...' : 'Enviar imagem'}
                  </Button>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ann-expires">Expira em (opcional)</Label>
              <Input id="ann-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Após esta data, o aviso para de aparecer. Deixe vazio para nunca expirar.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {editing && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                  Remover
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} className="bg-gradient-primary hover:opacity-90" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AnnouncementManager;