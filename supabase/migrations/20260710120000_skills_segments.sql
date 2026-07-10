-- Add segment_stats JSONB column to skills table
ALTER TABLE public.skills ADD COLUMN segment_stats JSONB DEFAULT '{}'::jsonb;

-- Optional: Update existing rows to have empty segment_stats if null
UPDATE public.skills SET segment_stats = '{}'::jsonb WHERE segment_stats IS NULL;
