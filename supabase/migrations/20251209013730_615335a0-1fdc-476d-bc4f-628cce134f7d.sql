-- Drop the restrictive insert policy that requires folder structure
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;

-- Create a more permissive insert policy for authenticated users
CREATE POLICY "Authenticated users can upload avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- Drop the restrictive update policy
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;

-- Create update policy for authenticated users
CREATE POLICY "Authenticated users can update avatars" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- Drop the restrictive delete policy
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Create delete policy for authenticated users
CREATE POLICY "Authenticated users can delete avatars" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);