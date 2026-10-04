CREATE OR REPLACE FUNCTION public.reward_eligible_video_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND COALESCE(NEW.duration_seconds, 0) >= 120 THEN
    PERFORM set_config('app.allow_currency', 'on', true);
    UPDATE public.profiles
    SET currency = currency + 20
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.reward_video_upload(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reward_video_upload(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.reward_video_upload(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reward_video_upload(uuid) TO service_role;

CREATE TRIGGER reward_eligible_video_on_insert_trg
AFTER INSERT ON public.videos
FOR EACH ROW
EXECUTE FUNCTION public.reward_eligible_video_on_insert();