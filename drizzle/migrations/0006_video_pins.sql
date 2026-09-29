ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS pinned_at timestamptz;
CREATE OR REPLACE FUNCTION public.limit_video_pins() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.pinned_at IS NOT NULL AND (OLD.pinned_at IS NULL) THEN
    IF (SELECT count(*) FROM public.videos WHERE user_id = NEW.user_id AND pinned_at IS NOT NULL AND id <> NEW.id) >= 7 THEN
      RAISE EXCEPTION 'Можно закрепить максимум 7 видео';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS limit_video_pins_trg ON public.videos;
CREATE TRIGGER limit_video_pins_trg BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.limit_video_pins();
GRANT EXECUTE ON FUNCTION public.can_manage_channel(uuid, uuid) TO authenticated;