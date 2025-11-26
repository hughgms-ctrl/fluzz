-- Add missing fields to routine_tasks table to match tasks table structure
ALTER TABLE public.routine_tasks
ADD COLUMN IF NOT EXISTS status text DEFAULT 'todo',
ADD COLUMN IF NOT EXISTS documentation text,
ADD COLUMN IF NOT EXISTS setor text;

-- Add comment explaining these fields
COMMENT ON COLUMN public.routine_tasks.status IS 'Default status for tasks generated from this routine task template';
COMMENT ON COLUMN public.routine_tasks.documentation IS 'Documentation/reference links for this task';
COMMENT ON COLUMN public.routine_tasks.setor IS 'Sector/department for this task';

-- Update the edge function helper comment
COMMENT ON TABLE public.routine_tasks IS 'Task templates within a routine. These are used to generate actual tasks in the tasks table when a routine is triggered.';