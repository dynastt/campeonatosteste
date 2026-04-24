import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MAX_SPONSORS = 7;

interface SponsorsManagerProps {
  championshipId: string;
  sponsors: string[];
  onChange: (next: string[]) => void;
}

const SponsorsManager = ({ championshipId, sponsors, onChange }: SponsorsManagerProps) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo deve ter no máximo 2MB');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${championshipId}/sponsors/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('championship-logos').upload(path, file, {
        cacheControl: '3600', upsert: false,
      });
      if (upErr) {
        toast.error('Erro ao enviar imagem');
        return;
      }
      const { data } = supabase.storage.from('championship-logos').getPublicUrl(path);
      onChange([...sponsors, data.publicUrl]);
      toast.success('Patrocinador adicionado!');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeSponsor = (index: number) => {
    const next = sponsors.filter((_, i) => i !== index);
    onChange(next);
  };

  const canAdd = sponsors.length < MAX_SPONSORS;

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="h-4 w-4 text-primary" />
          Patrocinadores
        </CardTitle>
        <CardDescription className="text-xs">
          Até {MAX_SPONSORS} logos exibidos no topo do campeonato e nos links públicos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sponsors.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sponsors.map((url, i) => (
              <div key={`${url}-${i}`} className="relative group rounded-lg border border-border/60 bg-muted/40 p-2">
                <img src={url} alt={`Patrocinador ${i + 1}`} className="h-10 w-auto max-w-[90px] object-contain" />
                <button
                  type="button"
                  onClick={() => removeSponsor(i)}
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remover patrocinador"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-2"
          disabled={!canAdd || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading
            ? 'Enviando...'
            : canAdd
              ? `Adicionar logo (${sponsors.length}/${MAX_SPONSORS})`
              : `Limite atingido (${MAX_SPONSORS}/${MAX_SPONSORS})`}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SponsorsManager;