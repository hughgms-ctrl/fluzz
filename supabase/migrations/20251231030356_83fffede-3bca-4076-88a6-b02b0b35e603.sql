-- Create admin audit log table
CREATE TABLE public.admin_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  target_email TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_admin_audit_logs_admin_user_id ON public.admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX idx_admin_audit_logs_target_type ON public.admin_audit_logs(target_type);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
ON public.admin_audit_logs
FOR SELECT
USING (is_platform_admin(auth.uid()));

-- Only platform admins can insert audit logs
CREATE POLICY "Only admins can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
WITH CHECK (is_platform_admin(auth.uid()));

-- Add comment for documentation
COMMENT ON TABLE public.admin_audit_logs IS 'Audit log for administrative actions';