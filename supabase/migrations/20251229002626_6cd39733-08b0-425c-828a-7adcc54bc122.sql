-- Enable pg_net extension for HTTP requests from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to send push notification via edge function
CREATE OR REPLACE FUNCTION public.send_push_on_notification_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  _supabase_url text;
  _service_key text;
BEGIN
  -- Get environment variables
  _supabase_url := current_setting('app.settings.supabase_url', true);
  _service_key := current_setting('app.settings.service_role_key', true);
  
  -- If settings not available, try to get from vault or skip
  IF _supabase_url IS NULL OR _service_key IS NULL THEN
    -- Fallback: use hardcoded project URL (will be replaced with actual)
    _supabase_url := 'https://szjshhhdnriqjedufvsy.supabase.co';
  END IF;

  -- Call edge function to send push notification
  PERFORM extensions.http_post(
    url := _supabase_url || '/functions/v1/send-push-notification',
    body := jsonb_build_object(
      'userId', NEW.user_id,
      'title', NEW.title,
      'body', NEW.message,
      'url', COALESCE(NEW.link, '/'),
      'tag', 'notification-' || NEW.id::text,
      'requireInteraction', CASE 
        WHEN NEW.type IN ('task_overdue', 'task_due_soon') THEN true 
        ELSE false 
      END
    )::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(_service_key, current_setting('request.jwt.claim.sub', true))
    )::jsonb
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger to send push on new notifications
DROP TRIGGER IF EXISTS trigger_send_push_on_notification ON public.notifications;
CREATE TRIGGER trigger_send_push_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_on_notification_insert();

-- Add comment for documentation
COMMENT ON FUNCTION public.send_push_on_notification_insert() IS 'Automatically sends push notification when a new notification is created in the database';