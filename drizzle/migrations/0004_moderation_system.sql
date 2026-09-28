ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('admin','moderator'));
END $$;

CREATE OR REPLACE FUNCTION public.is_banned(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_banned FROM public.profiles WHERE user_id = _user_id), false)
$$;

CREATE OR REPLACE FUNCTION public.set_moderator(_target uuid, _value boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Только главный администратор может назначать модераторов';
  END IF;
  IF _value THEN
    EXECUTE 'INSERT INTO public.user_roles(user_id, role) VALUES ($1, ''moderator'') ON CONFLICT DO NOTHING' USING _target;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _target AND role::text = 'moderator';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_banned(_target uuid, _value boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Нет прав модератора';
  END IF;
  IF public.has_role(_target,'admin') THEN
    RAISE EXCEPTION 'Нельзя заблокировать администратора';
  END IF;
  IF NOT public.has_role(auth.uid(),'admin') AND public.is_staff(_target) THEN
    RAISE EXCEPTION 'Модератор не может блокировать модератора';
  END IF;
  UPDATE public.profiles SET is_banned = _value WHERE user_id = _target;
END $$;

REVOKE EXECUTE ON FUNCTION public.set_moderator(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_banned(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_moderator(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_banned(uuid, boolean) TO authenticated;

CREATE POLICY "Staff can delete any video" ON public.videos FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete any comment" ON public.comments FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Banned cannot upload" ON public.videos AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_banned(auth.uid()));
CREATE POLICY "Banned cannot comment" ON public.comments AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_banned(auth.uid()));
CREATE POLICY "Banned cannot message" ON public.chat_messages AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_banned(auth.uid()));
CREATE POLICY "Banned cannot react" ON public.video_reactions AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_banned(auth.uid()));