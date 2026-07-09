-- Drop the old primary key constraint (which was on user_id)
ALTER TABLE public.user_trees DROP CONSTRAINT user_trees_pkey;

-- Add a new unique ID as the primary key
ALTER TABLE public.user_trees ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();

-- Add a title for the roadmap
ALTER TABLE public.user_trees ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT '나의 테크트리';

-- Create an index to quickly fetch all roadmaps for a given user
CREATE INDEX idx_user_trees_user_id ON public.user_trees(user_id);
