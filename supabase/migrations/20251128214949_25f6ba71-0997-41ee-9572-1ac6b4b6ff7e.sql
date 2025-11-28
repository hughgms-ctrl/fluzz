-- SPRINT 3 & 4: Create sectors table and task activity logs

-- 1. Create sectors table for sector management (D.1)
CREATE TABLE sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sectors in their workspace" ON sectors
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins and gestors can manage sectors" ON sectors
  FOR ALL USING (
    user_is_admin_or_gestor(auth.uid(), workspace_id)
  );

-- 2. Create task_activity_logs table for task history (C.4)
CREATE TABLE task_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid,
  action text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs of tasks they have access to" ON task_activity_logs
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE assigned_to = auth.uid() 
      OR project_id IN (
        SELECT id FROM projects 
        WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
      )
    )
  );

-- 3. Create trigger to automatically log task changes
CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO task_activity_logs (task_id, user_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status, NEW.status);
  END IF;
  
  -- Log due date changes
  IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
    INSERT INTO task_activity_logs (task_id, user_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'date_changed', OLD.due_date::text, NEW.due_date::text);
  END IF;
  
  -- Log assignee changes
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO task_activity_logs (task_id, user_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'assignee_changed', OLD.assigned_to::text, NEW.assigned_to::text);
  END IF;
  
  -- Log priority changes
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO task_activity_logs (task_id, user_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'priority_changed', OLD.priority, NEW.priority);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER task_activity_trigger
AFTER UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION log_task_changes();

-- 4. Add can_view_inventory column to user_permissions (B.3)
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_view_inventory boolean DEFAULT false;