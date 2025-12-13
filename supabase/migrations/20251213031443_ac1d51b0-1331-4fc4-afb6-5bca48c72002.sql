-- Add task approval fields
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approval_reviewer_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT NULL CHECK (approval_status IN ('pending', 'approved', 'rejected', NULL));