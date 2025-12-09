-- Update notify_task_assigned to use SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _task_title TEXT;
  _workspace_id UUID;
  _project_name TEXT;
BEGIN
  -- Only create notification if assigned_to changed and is not null
  IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND NEW.assigned_to IS NOT NULL AND 
      (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to)) THEN
    
    -- Get task details
    _task_title := NEW.title;
    
    -- Get workspace_id and project name
    IF NEW.project_id IS NOT NULL THEN
      SELECT workspace_id, name INTO _workspace_id, _project_name
      FROM projects
      WHERE id = NEW.project_id;
    ELSE
      -- For standalone tasks, get workspace from user
      SELECT workspace_id INTO _workspace_id
      FROM workspace_members
      WHERE user_id = NEW.assigned_to
      LIMIT 1;
      
      _project_name := NULL;
    END IF;
    
    -- Create notification
    INSERT INTO notifications (
      user_id,
      workspace_id,
      type,
      title,
      message,
      link,
      data
    ) VALUES (
      NEW.assigned_to,
      _workspace_id,
      'task_assigned',
      'Nova tarefa atribuída',
      CASE 
        WHEN _project_name IS NOT NULL 
        THEN 'Você foi atribuído à tarefa "' || _task_title || '" no projeto ' || _project_name
        ELSE 'Você foi atribuído à tarefa "' || _task_title || '"'
      END,
      '/tasks/' || NEW.id,
      jsonb_build_object(
        'task_id', NEW.id,
        'task_title', _task_title,
        'project_id', NEW.project_id,
        'due_date', NEW.due_date
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;