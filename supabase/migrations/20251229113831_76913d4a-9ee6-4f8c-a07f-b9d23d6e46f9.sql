-- Create trigger to call push notification function when a notification is inserted
CREATE TRIGGER trigger_send_push_on_notification_insert
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.send_push_on_notification_insert();