-- Drop old permissive policies
DROP POLICY "Anyone can update videos" ON public.videos;
DROP POLICY "Anyone can upload videos" ON public.videos;

-- Only authenticated owners may insert
CREATE POLICY "Owners can insert videos" ON public.videos
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only authenticated owners may update their own videos
CREATE POLICY "Owners can update own videos" ON public.videos
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create a secure function to increment view count
CREATE OR REPLACE FUNCTION public.increment_video_views(video_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.videos SET views = views + 1 WHERE id = video_id;
$$;