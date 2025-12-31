-- Add billing_period to subscription_plans for annual/monthly
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS billing_period text NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'annual'));

-- Add annual pricing columns
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS annual_price_per_user numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS annual_price_per_workspace numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS annual_discount_percentage numeric DEFAULT 0;

-- Create table for workspace-specific member blocks
CREATE TABLE IF NOT EXISTS public.workspace_member_blocks (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    blocked_by uuid,
    blocked_at timestamp with time zone DEFAULT now(),
    blocked_reason text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, user_id)
);

-- Enable RLS
ALTER TABLE public.workspace_member_blocks ENABLE ROW LEVEL SECURITY;

-- RLS policies for workspace_member_blocks
CREATE POLICY "Platform admins can view all blocks"
ON public.workspace_member_blocks
FOR SELECT
USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can manage blocks"
ON public.workspace_member_blocks
FOR ALL
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

-- Add notes field to user_account_management if not exists
ALTER TABLE public.user_account_management 
ADD COLUMN IF NOT EXISTS admin_notes text;