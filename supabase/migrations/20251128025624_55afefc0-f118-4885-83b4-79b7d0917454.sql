-- Fix recursive RLS policy on workspace_members

-- Drop the faulty recursive policy if it exists
DROP POLICY IF EXISTS "Workspace members can view other workspace members" ON public.workspace_members;

-- Create a safe policy allowing users to see all members of workspaces they belong to
CREATE POLICY "Workspace members can view workspace members"
ON public.workspace_members
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.user_belongs_to_workspace(auth.uid(), workspace_id)
);
