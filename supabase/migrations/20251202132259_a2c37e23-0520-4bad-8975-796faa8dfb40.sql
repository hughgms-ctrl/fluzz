-- Enable realtime for workspace_members table to ensure invited users see new workspaces immediately
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_members;