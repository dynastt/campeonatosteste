
-- Add short_code column to championship_shares
ALTER TABLE public.championship_shares ADD COLUMN short_code VARCHAR(8) UNIQUE;

-- Generate short codes for existing rows
UPDATE public.championship_shares 
SET short_code = substr(md5(random()::text), 1, 8)
WHERE short_code IS NULL;

-- Make short_code NOT NULL with default
ALTER TABLE public.championship_shares 
ALTER COLUMN short_code SET DEFAULT substr(md5(random()::text), 1, 8),
ALTER COLUMN short_code SET NOT NULL;

-- Create index for fast lookups
CREATE INDEX idx_championship_shares_short_code ON public.championship_shares(short_code);
