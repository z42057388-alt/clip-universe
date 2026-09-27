CREATE OR REPLACE FUNCTION public.can_manage_channel(_user_id uuid, _channel_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT _user_id = _channel_id OR EXISTS (
    SELECT 1 FROM public.channel_collaborators
    WHERE channel_id = _channel_id AND collaborator_id = _user_id AND status = 'accepted')
$$;
REVOKE EXECUTE ON FUNCTION public.can_manage_channel(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_channel(uuid,uuid) TO authenticated;

DROP POLICY IF EXISTS "Owners can insert videos" ON public.videos;
DROP POLICY IF EXISTS "Owners can update own videos" ON public.videos;
CREATE POLICY "Channel managers can insert videos" ON public.videos FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_channel(auth.uid(), user_id));
CREATE POLICY "Channel managers can update videos" ON public.videos FOR UPDATE TO authenticated
  USING (public.can_manage_channel(auth.uid(), user_id)) WITH CHECK (public.can_manage_channel(auth.uid(), user_id));

CREATE OR REPLACE FUNCTION public.update_channel_bio(_channel uuid, _bio text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.can_manage_channel(auth.uid(), _channel) THEN
    RAISE EXCEPTION 'Нет прав на управление каналом';
  END IF;
  UPDATE public.profiles SET bio = left(_bio, 1000) WHERE user_id = _channel;
END $$;
REVOKE EXECUTE ON FUNCTION public.update_channel_bio(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_channel_bio(uuid,text) TO authenticated;