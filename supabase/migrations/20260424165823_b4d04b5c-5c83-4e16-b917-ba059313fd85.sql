-- 1. Patrocinadores e datas das metades de fase eliminatória no campeonato
ALTER TABLE public.championships
  ADD COLUMN IF NOT EXISTS sponsors text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS knockout_phase_dates jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Horário por jogo eliminatório
ALTER TABLE public.knockout_matches
  ADD COLUMN IF NOT EXISTS match_time text;

-- 3. Avisos para os links públicos
CREATE TABLE IF NOT EXISTS public.public_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  championship_id uuid REFERENCES public.championships(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text,
  expires_at timestamptz,
  is_global boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Garante que só exista 1 aviso global por usuário (substitui o anterior via upsert)
CREATE UNIQUE INDEX IF NOT EXISTS public_announcements_one_global_per_user
  ON public.public_announcements (user_id)
  WHERE is_global = true;

-- Índice para buscas por campeonato
CREATE INDEX IF NOT EXISTS public_announcements_championship_idx
  ON public.public_announcements (championship_id)
  WHERE championship_id IS NOT NULL;

ALTER TABLE public.public_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own announcements"
  ON public.public_announcements
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select own announcements"
  ON public.public_announcements
  FOR SELECT
  USING (auth.uid() = user_id);

-- Função utilitária de updated_at (idempotente)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_public_announcements_updated_at ON public.public_announcements;
CREATE TRIGGER update_public_announcements_updated_at
BEFORE UPDATE ON public.public_announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();