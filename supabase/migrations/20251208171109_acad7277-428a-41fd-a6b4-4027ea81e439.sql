-- Add task_order column to tasks table for manual ordering
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS task_order INTEGER DEFAULT 0;

-- Create index for better performance when ordering
CREATE INDEX IF NOT EXISTS idx_tasks_order ON public.tasks (project_id, status, task_order);