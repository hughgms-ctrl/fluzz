-- Remove duplicate triggers that cause duplicated notifications/push

-- tasks: keep trigger_notify_task_assigned, remove the redundant on_task_assigned
DROP TRIGGER IF EXISTS on_task_assigned ON public.tasks;

-- notifications: keep on_notification_insert_send_push, remove redundant trigger_send_push_on_notification
DROP TRIGGER IF EXISTS trigger_send_push_on_notification ON public.notifications;