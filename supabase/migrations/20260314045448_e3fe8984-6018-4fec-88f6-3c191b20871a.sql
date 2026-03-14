
CREATE TABLE public.video_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (video_id, user_id)
);

ALTER TABLE public.video_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions" ON public.video_reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert reactions" ON public.video_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reactions" ON public.video_reactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reactions" ON public.video_reactions FOR DELETE USING (auth.uid() = user_id);

-- Add like/dislike counters to videos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS likes integer NOT NULL DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS dislikes integer NOT NULL DEFAULT 0;

-- Function to update counters
CREATE OR REPLACE FUNCTION public.update_video_reaction_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.videos SET
      likes = (SELECT count(*) FROM public.video_reactions WHERE video_id = NEW.video_id AND reaction_type = 'like'),
      dislikes = (SELECT count(*) FROM public.video_reactions WHERE video_id = NEW.video_id AND reaction_type = 'dislike')
    WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos SET
      likes = (SELECT count(*) FROM public.video_reactions WHERE video_id = OLD.video_id AND reaction_type = 'like'),
      dislikes = (SELECT count(*) FROM public.video_reactions WHERE video_id = OLD.video_id AND reaction_type = 'dislike')
    WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER update_reaction_counts
AFTER INSERT OR UPDATE OR DELETE ON public.video_reactions
FOR EACH ROW EXECUTE FUNCTION public.update_video_reaction_counts();
