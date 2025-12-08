-- Add is_template column to projects table
ALTER TABLE public.projects ADD COLUMN is_template boolean NOT NULL DEFAULT false;