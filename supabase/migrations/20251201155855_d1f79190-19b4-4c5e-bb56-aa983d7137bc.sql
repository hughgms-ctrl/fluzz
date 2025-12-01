-- Add assigned_to column to routine_tasks table
ALTER TABLE public.routine_tasks 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;