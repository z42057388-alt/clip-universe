ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS is_short boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS videos_is_short_idx ON public.videos(is_short) WHERE is_short;
CREATE OR REPLACE FUNCTION public.validate_short_duration() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_short AND (NEW.duration_seconds IS NULL OR NEW.duration_seconds > 180) THEN
    RAISE EXCEPTION 'Short может быть не длиннее 3 минут';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_short_duration_trg ON public.videos;
CREATE TRIGGER validate_short_duration_trg BEFORE INSERT OR UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.validate_short_duration();