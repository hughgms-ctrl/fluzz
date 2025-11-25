-- Add setor column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN setor TEXT;

-- Add index for better filtering performance
CREATE INDEX idx_tasks_setor ON public.tasks(setor);