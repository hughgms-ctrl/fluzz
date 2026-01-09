-- =============================================
-- NOTAS COM PASTAS
-- =============================================

-- Tabela de pastas de notas
CREATE TABLE public.note_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  folder_order INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de notas
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.note_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- FLUXOS (DIAGRAMAS ESTILO MIRO)
-- =============================================

-- Tabela de fluxos
CREATE TABLE public.flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB DEFAULT '[]'::jsonb,
  edges JSONB DEFAULT '[]'::jsonb,
  viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- PERMISSÕES DE USUÁRIO (adicionar novas colunas)
-- =============================================

ALTER TABLE public.user_permissions
ADD COLUMN can_view_notes BOOLEAN DEFAULT true,
ADD COLUMN can_edit_notes BOOLEAN DEFAULT false,
ADD COLUMN can_view_flows BOOLEAN DEFAULT true,
ADD COLUMN can_edit_flows BOOLEAN DEFAULT false;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE public.note_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;

-- Note Folders policies
CREATE POLICY "Users can view note folders in their workspace"
ON public.note_folders FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users with edit permission can insert note folders"
ON public.note_folders FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    LEFT JOIN public.user_permissions up ON up.workspace_id = wm.workspace_id AND up.user_id = wm.user_id
    WHERE wm.user_id = auth.uid()
    AND (wm.role IN ('admin', 'gestor') OR up.can_edit_notes = true)
  )
);

CREATE POLICY "Users with edit permission can update note folders"
ON public.note_folders FOR UPDATE
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    LEFT JOIN public.user_permissions up ON up.workspace_id = wm.workspace_id AND up.user_id = wm.user_id
    WHERE wm.user_id = auth.uid()
    AND (wm.role IN ('admin', 'gestor') OR up.can_edit_notes = true)
  )
);

CREATE POLICY "Users with edit permission can delete note folders"
ON public.note_folders FOR DELETE
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    LEFT JOIN public.user_permissions up ON up.workspace_id = wm.workspace_id AND up.user_id = wm.user_id
    WHERE wm.user_id = auth.uid()
    AND (wm.role IN ('admin', 'gestor') OR up.can_edit_notes = true)
  )
);

-- Notes policies
CREATE POLICY "Users can view notes in their workspace"
ON public.notes FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users with edit permission can insert notes"
ON public.notes FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    LEFT JOIN public.user_permissions up ON up.workspace_id = wm.workspace_id AND up.user_id = wm.user_id
    WHERE wm.user_id = auth.uid()
    AND (wm.role IN ('admin', 'gestor') OR up.can_edit_notes = true)
  )
);

CREATE POLICY "Users with edit permission can update notes"
ON public.notes FOR UPDATE
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    LEFT JOIN public.user_permissions up ON up.workspace_id = wm.workspace_id AND up.user_id = wm.user_id
    WHERE wm.user_id = auth.uid()
    AND (wm.role IN ('admin', 'gestor') OR up.can_edit_notes = true)
  )
);

CREATE POLICY "Users with edit permission can delete notes"
ON public.notes FOR DELETE
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    LEFT JOIN public.user_permissions up ON up.workspace_id = wm.workspace_id AND up.user_id = wm.user_id
    WHERE wm.user_id = auth.uid()
    AND (wm.role IN ('admin', 'gestor') OR up.can_edit_notes = true)
  )
);

-- Flows policies
CREATE POLICY "Users can view flows in their workspace"
ON public.flows FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users with edit permission can insert flows"
ON public.flows FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    LEFT JOIN public.user_permissions up ON up.workspace_id = wm.workspace_id AND up.user_id = wm.user_id
    WHERE wm.user_id = auth.uid()
    AND (wm.role IN ('admin', 'gestor') OR up.can_edit_flows = true)
  )
);

CREATE POLICY "Users with edit permission can update flows"
ON public.flows FOR UPDATE
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    LEFT JOIN public.user_permissions up ON up.workspace_id = wm.workspace_id AND up.user_id = wm.user_id
    WHERE wm.user_id = auth.uid()
    AND (wm.role IN ('admin', 'gestor') OR up.can_edit_flows = true)
  )
);

CREATE POLICY "Users with edit permission can delete flows"
ON public.flows FOR DELETE
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    LEFT JOIN public.user_permissions up ON up.workspace_id = wm.workspace_id AND up.user_id = wm.user_id
    WHERE wm.user_id = auth.uid()
    AND (wm.role IN ('admin', 'gestor') OR up.can_edit_flows = true)
  )
);

-- Triggers para updated_at
CREATE TRIGGER update_note_folders_updated_at
BEFORE UPDATE ON public.note_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_flows_updated_at
BEFORE UPDATE ON public.flows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_note_folders_workspace_id ON public.note_folders(workspace_id);
CREATE INDEX idx_notes_workspace_id ON public.notes(workspace_id);
CREATE INDEX idx_notes_folder_id ON public.notes(folder_id);
CREATE INDEX idx_flows_workspace_id ON public.flows(workspace_id);