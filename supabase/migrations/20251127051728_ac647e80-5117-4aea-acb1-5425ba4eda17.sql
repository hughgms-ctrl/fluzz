-- Create workspace invites table
CREATE TABLE IF NOT EXISTS public.workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'membro',
  permissions JSONB,
  invited_by UUID REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE,
  accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

-- Enable RLS
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view invites for their workspaces"
  ON public.workspace_invites
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and gestors can create invites"
  ON public.workspace_invites
  FOR INSERT
  WITH CHECK (
    public.user_is_admin_or_gestor(auth.uid(), workspace_id)
  );

CREATE POLICY "Anyone can view invites by token"
  ON public.workspace_invites
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update accepted status"
  ON public.workspace_invites
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create index for faster token lookups
CREATE INDEX idx_workspace_invites_token ON public.workspace_invites(token);
CREATE INDEX idx_workspace_invites_email ON public.workspace_invites(email);