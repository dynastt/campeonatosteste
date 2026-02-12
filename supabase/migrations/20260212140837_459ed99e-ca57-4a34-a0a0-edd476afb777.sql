-- Fix security: explicitly deny anonymous SELECT on knockout_matches
-- The existing RESTRICTIVE policy should already handle this, but adding explicit denial
CREATE POLICY "Authenticated users can select knockout_matches"
ON public.knockout_matches
FOR SELECT
USING (auth.uid() IS NOT NULL);
