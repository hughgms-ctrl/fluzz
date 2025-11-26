-- Add start_date column to routines table
ALTER TABLE public.routines 
ADD COLUMN start_date date NOT NULL DEFAULT CURRENT_DATE;

-- Add comment to explain the column
COMMENT ON COLUMN public.routines.start_date IS 'Data de início para geração das primeiras tarefas da rotina';

-- Update recurrence_config column comment to explain its structure
COMMENT ON COLUMN public.routines.recurrence_config IS 'Configuração de recorrência personalizada em JSONB. Exemplos: {"days_of_week": [1,3,5]} para semanal, {"day_of_month": 15} para mensal';

-- Create function to calculate next due date based on recurrence
CREATE OR REPLACE FUNCTION public.calculate_next_due_date(
  _current_date date,
  _recurrence_type text,
  _recurrence_config jsonb
)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE _recurrence_type
    WHEN 'daily' THEN
      RETURN _current_date + INTERVAL '1 day';
    WHEN 'weekly' THEN
      RETURN _current_date + INTERVAL '1 week';
    WHEN 'monthly' THEN
      RETURN _current_date + INTERVAL '1 month';
    WHEN 'yearly' THEN
      RETURN _current_date + INTERVAL '1 year';
    WHEN 'custom' THEN
      -- Custom recurrence logic will be handled in the application
      RETURN _current_date + INTERVAL '1 day';
    ELSE
      RETURN _current_date + INTERVAL '1 day';
  END CASE;
END;
$$;

-- Create function to generate next task instance when a routine task is completed
CREATE OR REPLACE FUNCTION public.handle_routine_task_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _routine record;
  _routine_task record;
  _next_due_date date;
BEGIN
  -- Only proceed if task status changed to 'completed' and has a routine_id
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.routine_id IS NOT NULL THEN
    
    -- Get routine information
    SELECT * INTO _routine
    FROM public.routines
    WHERE id = NEW.routine_id;
    
    -- Get the original routine task template
    SELECT * INTO _routine_task
    FROM public.routine_tasks
    WHERE routine_id = NEW.routine_id
    AND title = NEW.title
    LIMIT 1;
    
    -- Calculate next due date
    IF NEW.due_date IS NOT NULL THEN
      _next_due_date := public.calculate_next_due_date(
        NEW.due_date,
        _routine.recurrence_type,
        _routine.recurrence_config
      );
    ELSE
      _next_due_date := public.calculate_next_due_date(
        CURRENT_DATE,
        _routine.recurrence_type,
        _routine.recurrence_config
      );
    END IF;
    
    -- Create next instance of the task
    INSERT INTO public.tasks (
      title,
      description,
      priority,
      project_id,
      process_id,
      routine_id,
      assigned_to,
      status,
      due_date
    ) VALUES (
      NEW.title,
      NEW.description,
      NEW.priority,
      _routine_task.project_id,
      _routine_task.process_id,
      NEW.routine_id,
      NEW.assigned_to,
      'todo',
      _next_due_date
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for routine task completion
DROP TRIGGER IF EXISTS on_routine_task_completed ON public.tasks;
CREATE TRIGGER on_routine_task_completed
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_routine_task_completion();