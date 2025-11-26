-- Create positions/roles table (cargos/setores)
CREATE TABLE public.positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create recurring tasks/routines table (rotinas)
CREATE TABLE public.recurring_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  process_id UUID REFERENCES public.process_documentation(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'medium',
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'yearly', 'custom')),
  recurrence_config JSONB, -- For custom recurrence patterns (e.g., {"days": [1,3,5], "time": "09:00"})
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create user-position assignments table (vinculação usuário-cargo)
CREATE TABLE public.user_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(user_id, position_id)
);

-- Add reference to recurring task in tasks table
ALTER TABLE public.tasks ADD COLUMN recurring_task_id UUID REFERENCES public.recurring_tasks(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_positions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for positions
CREATE POLICY "Authenticated users can view positions"
ON public.positions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create positions"
ON public.positions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own positions"
ON public.positions FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own positions"
ON public.positions FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- RLS Policies for recurring_tasks
CREATE POLICY "Authenticated users can view recurring tasks"
ON public.recurring_tasks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create recurring tasks"
ON public.recurring_tasks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own recurring tasks"
ON public.recurring_tasks FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own recurring tasks"
ON public.recurring_tasks FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- RLS Policies for user_positions
CREATE POLICY "Users can view their own position assignments"
ON public.user_positions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view position assignments they created"
ON public.user_positions FOR SELECT
TO authenticated
USING (auth.uid() = assigned_by);

CREATE POLICY "Authenticated users can create position assignments"
ON public.user_positions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = assigned_by);

CREATE POLICY "Users can delete position assignments they created"
ON public.user_positions FOR DELETE
TO authenticated
USING (auth.uid() = assigned_by);

-- Create trigger for updated_at on positions
CREATE TRIGGER update_positions_updated_at
BEFORE UPDATE ON public.positions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger for updated_at on recurring_tasks
CREATE TRIGGER update_recurring_tasks_updated_at
BEFORE UPDATE ON public.recurring_tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();