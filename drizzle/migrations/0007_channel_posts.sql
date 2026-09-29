CREATE TABLE public.channel_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.channel_posts TO anon;
GRANT SELECT, INSERT, DELETE ON public.channel_posts TO authenticated;
GRANT ALL ON public.channel_posts TO service_role;
ALTER TABLE public.channel_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts viewable by everyone" ON public.channel_posts FOR SELECT USING (true);
CREATE POLICY "Managers create posts" ON public.channel_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND public.can_manage_channel(auth.uid(), channel_id) AND NOT public.is_banned(auth.uid()) AND char_length(content) BETWEEN 1 AND 5000);
CREATE POLICY "Managers or staff delete posts" ON public.channel_posts FOR DELETE TO authenticated
  USING (public.can_manage_channel(auth.uid(), channel_id) OR public.is_staff(auth.uid()));
CREATE INDEX channel_posts_channel_idx ON public.channel_posts(channel_id, created_at DESC);