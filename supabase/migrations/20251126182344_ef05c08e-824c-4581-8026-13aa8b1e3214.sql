-- Add project_id column to recurring_tasks for optional project linking
ALTER TABLE public.recurring_tasks
ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_recurring_tasks_project_id ON public.recurring_tasks(project_id);
CREATE INDEX idx_recurring_tasks_process_id ON public.recurring_tasks(process_id);