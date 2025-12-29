-- Ensure pg_net is available
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Fix: use pg_net's net.http_post (extensions.http_post does not exist)
CREATE OR REPLACE FUNCTION public.send_push_on_notification_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'net'
AS $$
DECLARE
  _supabase_url text;
BEGIN
  -- Prefer runtime setting if available
  _supabase_url := current_setting('app.settings.supabase_url', true);

  -- Fallback to project URL
  IF _supabase_url IS NULL THEN
    _supabase_url := 'https://szjshhhdnriqjedufvsy.supabase.co';
  END IF;

  -- Fire-and-forget HTTP request to backend function
  PERFORM net.http_post(
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
    ),
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 10000
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trigger_send_push_on_notification ON public.notifications;
CREATE TRIGGER trigger_send_push_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_on_notification_insert();

COMMENT ON FUNCTION public.send_push_on_notification_insert() IS 'Automatically sends push notification when a new notification is created in the database';
