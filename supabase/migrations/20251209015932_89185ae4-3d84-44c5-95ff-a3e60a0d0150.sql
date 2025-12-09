-- Create a function to delete generated tasks when a routine_task template is deleted
CREATE OR REPLACE FUNCTION public.delete_generated_tasks_on_routine_task_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all generated tasks that were created from this routine task template
  -- We match by routine_id and title since generated tasks copy the title from the template
  DELETE FROM public.tasks 
  WHERE routine_id = OLD.routine_id 
    AND title = OLD.title;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for routine_tasks deletion
DROP TRIGGER IF EXISTS on_routine_task_delete_cleanup ON public.routine_tasks;
CREATE TRIGGER on_routine_task_delete_cleanup
  BEFORE DELETE ON public.routine_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_generated_tasks_on_routine_task_delete();

-- Create a function to delete all generated tasks when a routine is deleted
CREATE OR REPLACE FUNCTION public.delete_generated_tasks_on_routine_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all generated tasks that reference this routine
  DELETE FROM public.tasks 
  WHERE routine_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for routines deletion
DROP TRIGGER IF EXISTS on_routine_delete_cleanup ON public.routines;
CREATE TRIGGER on_routine_delete_cleanup
  BEFORE DELETE ON public.routines
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_generated_tasks_on_routine_delete();