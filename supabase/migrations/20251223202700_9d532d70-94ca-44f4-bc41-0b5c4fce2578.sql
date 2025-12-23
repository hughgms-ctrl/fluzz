-- Add is_draft column to projects table
ALTER TABLE public.projects 
ADD COLUMN is_draft boolean NOT NULL DEFAULT true;

-- Update existing projects to not be drafts (they were already created before this feature)
UPDATE public.projects SET is_draft = false;