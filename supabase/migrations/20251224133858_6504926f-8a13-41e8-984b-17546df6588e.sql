-- Add view permissions for Fluzz AI and Workload View
ALTER TABLE public.user_permissions 
ADD COLUMN IF NOT EXISTS can_view_ai boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_view_workload boolean DEFAULT false;