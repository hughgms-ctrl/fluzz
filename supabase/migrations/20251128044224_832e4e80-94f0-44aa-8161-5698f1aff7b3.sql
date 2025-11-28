-- Create table for getting started content sections
CREATE TABLE IF NOT EXISTS public.getting_started_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'video', 'image')),
  video_url TEXT,
  image_url TEXT,
  section_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.getting_started_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view sections in their workspace"
ON public.getting_started_sections FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Admins and gestors can create sections"
ON public.getting_started_sections FOR INSERT
WITH CHECK (
  user_is_admin_or_gestor(auth.uid(), workspace_id) AND created_by = auth.uid()
);

CREATE POLICY "Admins and gestors can update sections"
ON public.getting_started_sections FOR UPDATE
USING (user_is_admin_or_gestor(auth.uid(), workspace_id));

CREATE POLICY "Admins and gestors can delete sections"
ON public.getting_started_sections FOR DELETE
USING (user_is_admin_or_gestor(auth.uid(), workspace_id));

-- Trigger for updated_at
CREATE TRIGGER update_getting_started_sections_updated_at
  BEFORE UPDATE ON public.getting_started_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();