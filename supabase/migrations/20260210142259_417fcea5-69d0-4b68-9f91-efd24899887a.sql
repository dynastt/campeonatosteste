
-- Championships table
CREATE TABLE public.championships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date TEXT,
  description TEXT,
  team_ids TEXT[] DEFAULT '{}',
  game_days TEXT[] DEFAULT '{}',
  knockout_phases TEXT[] DEFAULT ARRAY['round-of-16','quarter-finals','semi-finals','final'],
  game_day_names TEXT[] DEFAULT '{}',
  qualifying_teams JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.championships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own championships" ON public.championships FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own teams" ON public.teams FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Game Days table
CREATE TABLE public.game_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  team_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.game_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own game_days" ON public.game_days FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Rounds table
CREATE TABLE public.rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  game_day_id UUID REFERENCES public.game_days(id) ON DELETE CASCADE,
  number INT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rounds" ON public.rounds FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Matches table
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  game_day_id UUID REFERENCES public.game_days(id) ON DELETE CASCADE,
  home_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  away_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  home_goals INT,
  away_goals INT,
  home_wo BOOLEAN NOT NULL DEFAULT false,
  away_wo BOOLEAN NOT NULL DEFAULT false,
  round INT NOT NULL,
  played BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own matches" ON public.matches FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Knockout Matches table
CREATE TABLE public.knockout_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  position INT NOT NULL,
  home_team_id UUID,
  away_team_id UUID,
  home_goals INT,
  away_goals INT,
  home_wo BOOLEAN NOT NULL DEFAULT false,
  away_wo BOOLEAN NOT NULL DEFAULT false,
  winner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.knockout_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own knockout_matches" ON public.knockout_matches FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
