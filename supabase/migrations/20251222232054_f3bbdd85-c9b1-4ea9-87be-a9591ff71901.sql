-- Add pending_notifications column to projects table
-- This indicates if the project was just created/duplicated and notifications haven't been sent yet
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS pending_notifications boolean DEFAULT false;