-- Create storage bucket for task files
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-files', 'task-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for task files
CREATE POLICY "Task files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-files');

CREATE POLICY "Authenticated users can upload task files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'task-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their uploaded task files"
ON storage.objects FOR DELETE
USING (bucket_id = 'task-files' AND auth.role() = 'authenticated');

-- Create table for task attachments
CREATE TABLE public.task_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_attachments
CREATE POLICY "Users can view task attachments"
ON public.task_attachments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert task attachments"
ON public.task_attachments FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own attachments"
ON public.task_attachments FOR DELETE
USING (uploaded_by = auth.uid());