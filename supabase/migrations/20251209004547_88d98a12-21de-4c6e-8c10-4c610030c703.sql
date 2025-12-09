-- Add start_date column to routine_tasks table
ALTER TABLE public.routine_tasks
ADD COLUMN start_date date DEFAULT CURRENT_DATE;