ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text, ADD COLUMN IF NOT EXISTS banner_url text;

CREATE TABLE public.channel_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL,
  collaborator_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, collaborator_id)
);
GRANT SELECT ON public.channel_collaborators TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_collaborators TO authenticated;
GRANT ALL ON public.channel_collaborators TO service_role;
ALTER TABLE public.channel_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View accepted or own collaborations" ON public.channel_collaborators FOR SELECT
  USING (status = 'accepted' OR auth.uid() = channel_id OR auth.uid() = collaborator_id);
CREATE POLICY "Owner invites" ON public.channel_collaborators FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = channel_id AND collaborator_id <> channel_id AND status = 'pending');
CREATE POLICY "Invitee responds" ON public.channel_collaborators FOR UPDATE TO authenticated
  USING (auth.uid() = collaborator_id) WITH CHECK (auth.uid() = collaborator_id AND status IN ('accepted','declined'));
CREATE POLICY "Owner or collaborator removes" ON public.channel_collaborators FOR DELETE TO authenticated
  USING (auth.uid() = channel_id OR auth.uid() = collaborator_id);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications select" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own notifications delete" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_collab_invite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ch_name text;
BEGIN
  SELECT username INTO ch_name FROM public.profiles WHERE user_id = NEW.channel_id;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, message, data)
    VALUES (NEW.collaborator_id, 'collab_invite',
      'Вас пригласил канал «' || COALESCE(ch_name,'канал') || '» стать соавтором канала. Если вы хотите стать соавтором, нажмите «Принять».',
      jsonb_build_object('collab_id', NEW.id, 'channel_id', NEW.channel_id));
  ELSIF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    UPDATE public.notifications SET read = true WHERE type='collab_invite' AND data->>'collab_id' = NEW.id::text;
    INSERT INTO public.notifications (user_id, type, message, data)
    SELECT NEW.channel_id, 'collab_response',
      COALESCE(p.username,'Пользователь') || CASE WHEN NEW.status='accepted' THEN ' принял(а) приглашение стать соавтором' ELSE ' отклонил(а) приглашение стать соавтором' END,
      jsonb_build_object('collab_id', NEW.id)
    FROM (SELECT 1) x LEFT JOIN public.profiles p ON p.user_id = NEW.collaborator_id;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_collab_invite() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER collab_notify AFTER INSERT OR UPDATE ON public.channel_collaborators
FOR EACH ROW EXECUTE FUNCTION public.notify_collab_invite();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;