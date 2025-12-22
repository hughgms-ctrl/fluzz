-- Add start_date and end_date to projects for calendar view
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date;

-- Add start_date to tasks for timeline view (due_date already exists as end date)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS start_date date;

-- Update existing tasks to have start_date as created_at date
UPDATE public.tasks 
SET start_date = DATE(created_at)
WHERE start_date IS NULL;