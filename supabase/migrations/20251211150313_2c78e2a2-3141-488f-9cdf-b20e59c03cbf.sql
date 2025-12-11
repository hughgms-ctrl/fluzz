-- Add field to mark projects as standalone task folders
ALTER TABLE public.projects
ADD COLUMN is_standalone_folder BOOLEAN NOT NULL DEFAULT false;