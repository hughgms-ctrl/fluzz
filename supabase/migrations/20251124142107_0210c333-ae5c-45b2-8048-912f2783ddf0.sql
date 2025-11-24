-- Add certification and documentation fields to tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS completed_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS documentation TEXT;

-- Create company workspace tables
CREATE TABLE IF NOT EXISTS public.company_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create process documentation table
CREATE TABLE IF NOT EXISTS public.process_documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_documentation ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_info (all authenticated users can read, only admins can write)
CREATE POLICY "Anyone can view company info"
  ON public.company_info FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert company info"
  ON public.company_info FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update company info"
  ON public.company_info FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for process_documentation
CREATE POLICY "Anyone can view process documentation"
  ON public.process_documentation FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert process documentation"
  ON public.process_documentation FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own process documentation"
  ON public.process_documentation FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own process documentation"
  ON public.process_documentation FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Triggers for updated_at
CREATE TRIGGER update_company_info_updated_at
  BEFORE UPDATE ON public.company_info
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_process_documentation_updated_at
  BEFORE UPDATE ON public.process_documentation
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();