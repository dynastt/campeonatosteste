
-- Add soft delete column to championships
ALTER TABLE public.championships ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add logo column to championships
ALTER TABLE public.championships ADD COLUMN logo TEXT DEFAULT NULL;

-- Create storage bucket for championship logos
INSERT INTO storage.buckets (id, name, public) VALUES ('championship-logos', 'championship-logos', true);

-- Storage policies for championship logos
CREATE POLICY "Anyone can view championship logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'championship-logos');

CREATE POLICY "Authenticated users can upload championship logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'championship-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own championship logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'championship-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own championship logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'championship-logos' AND auth.uid() IS NOT NULL);

-- Fix RLS: Drop all existing restrictive policies and create proper permissive ones

-- championship_shares
DROP POLICY IF EXISTS "Users manage own shares" ON public.championship_shares;
CREATE POLICY "Users can manage own shares" ON public.championship_shares FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own shares" ON public.championship_shares FOR SELECT USING (auth.uid() = user_id);

-- championships
DROP POLICY IF EXISTS "Users manage own championships" ON public.championships;
CREATE POLICY "Users can manage own championships" ON public.championships FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own championships" ON public.championships FOR SELECT USING (auth.uid() = user_id);

-- game_days
DROP POLICY IF EXISTS "Users manage own game_days" ON public.game_days;
CREATE POLICY "Users can manage own game_days" ON public.game_days FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own game_days" ON public.game_days FOR SELECT USING (auth.uid() = user_id);

-- knockout_matches
DROP POLICY IF EXISTS "Users manage own knockout_matches" ON public.knockout_matches;
DROP POLICY IF EXISTS "Authenticated users can select knockout_matches" ON public.knockout_matches;
CREATE POLICY "Users can manage own knockout_matches" ON public.knockout_matches FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own knockout_matches" ON public.knockout_matches FOR SELECT USING (auth.uid() = user_id);

-- matches
DROP POLICY IF EXISTS "Users manage own matches" ON public.matches;
CREATE POLICY "Users can manage own matches" ON public.matches FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own matches" ON public.matches FOR SELECT USING (auth.uid() = user_id);

-- rounds
DROP POLICY IF EXISTS "Users manage own rounds" ON public.rounds;
CREATE POLICY "Users can manage own rounds" ON public.rounds FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own rounds" ON public.rounds FOR SELECT USING (auth.uid() = user_id);

-- teams
DROP POLICY IF EXISTS "Users manage own teams" ON public.teams;
CREATE POLICY "Users can manage own teams" ON public.teams FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own teams" ON public.teams FOR SELECT USING (auth.uid() = user_id);
