CREATE OR REPLACE FUNCTION public.protect_is_banned() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_banned IS DISTINCT FROM OLD.is_banned AND auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
    NEW.is_banned := OLD.is_banned;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_is_banned_trg ON public.profiles;
CREATE TRIGGER protect_is_banned_trg BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_is_banned();