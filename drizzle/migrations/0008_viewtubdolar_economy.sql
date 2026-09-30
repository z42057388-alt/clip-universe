ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currency integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_frame text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS duration_seconds integer;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS home_pinned_at timestamptz;

CREATE TABLE public.avatar_frames (
  id text PRIMARY KEY,
  name text NOT NULL,
  price integer NOT NULL,
  css_class text NOT NULL,
  sort integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.avatar_frames TO anon, authenticated;
GRANT ALL ON public.avatar_frames TO service_role;
ALTER TABLE public.avatar_frames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Frames viewable by everyone" ON public.avatar_frames FOR SELECT USING (true);

CREATE TABLE public.user_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  frame_id text NOT NULL REFERENCES public.avatar_frames(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, frame_id)
);
GRANT SELECT ON public.user_frames TO anon, authenticated;
GRANT INSERT, DELETE ON public.user_frames TO authenticated;
GRANT ALL ON public.user_frames TO service_role;
ALTER TABLE public.user_frames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User frames viewable" ON public.user_frames FOR SELECT USING (true);

-- Protect currency and active_frame from direct client edits
CREATE OR REPLACE FUNCTION public.protect_currency() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.currency := OLD.currency;
    NEW.active_frame := OLD.active_frame;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_currency_trg ON public.profiles;
CREATE TRIGGER protect_currency_trg BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_currency();

-- +20 currency for a published video of at least 2 minutes
CREATE OR REPLACE FUNCTION public.reward_video_upload(_video_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v RECORD;
BEGIN
  SELECT user_id, duration_seconds INTO v FROM public.videos WHERE id = _video_id;
  IF v IS NULL OR v.user_id IS NULL OR v.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Видео не найдено';
  END IF;
  IF COALESCE(v.duration_seconds, 0) < 120 THEN
    RAISE EXCEPTION 'Награда даётся только за видео длиной от 2 минут';
  END IF;
  UPDATE public.profiles SET currency = currency + 20 WHERE user_id = v.user_id;
END $$;
REVOKE ALL ON FUNCTION public.reward_video_upload(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reward_video_upload(uuid) TO authenticated;

-- Staff grants any amount of currency
CREATE OR REPLACE FUNCTION public.give_currency(_target uuid, _amount integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Только администратор и модераторы могут выдавать валюту';
  END IF;
  IF _amount = 0 OR abs(_amount) > 1000000 THEN
    RAISE EXCEPTION 'Недопустимая сумма';
  END IF;
  UPDATE public.profiles SET currency = greatest(0, currency + _amount) WHERE user_id = _target;
END $$;
REVOKE ALL ON FUNCTION public.give_currency(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.give_currency(uuid, integer) TO authenticated;

-- Buy a frame with currency
CREATE OR REPLACE FUNCTION public.buy_frame(_frame text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f RECORD; bal integer;
BEGIN
  SELECT price INTO f FROM public.avatar_frames WHERE id = _frame;
  IF f IS NULL THEN RAISE EXCEPTION 'Рамка не найдена'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_frames WHERE user_id = auth.uid() AND frame_id = _frame) THEN
    RAISE EXCEPTION 'Рамка уже куплена';
  END IF;
  SELECT currency INTO bal FROM public.profiles WHERE user_id = auth.uid();
  IF bal IS NULL OR bal < f.price THEN RAISE EXCEPTION 'Недостаточно ViewTubdolar'; END IF;
  UPDATE public.profiles SET currency = currency - f.price WHERE user_id = auth.uid();
  INSERT INTO public.user_frames(user_id, frame_id) VALUES (auth.uid(), _frame);
END $$;
REVOKE ALL ON FUNCTION public.buy_frame(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buy_frame(text) TO authenticated;

-- Equip or remove a frame (must be owned)
CREATE OR REPLACE FUNCTION public.equip_frame(_frame text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _frame IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user_frames WHERE user_id = auth.uid() AND frame_id = _frame) THEN
    RAISE EXCEPTION 'Эта рамка не куплена';
  END IF;
  UPDATE public.profiles SET active_frame = _frame WHERE user_id = auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.equip_frame(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.equip_frame(text) TO authenticated;

-- Homepage pins: staff only, max 10
CREATE OR REPLACE FUNCTION public.limit_home_pins() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.home_pinned_at IS NOT NULL AND OLD.home_pinned_at IS NULL THEN
    IF NOT public.is_staff(auth.uid()) THEN
      RAISE EXCEPTION 'Только администратор и модераторы могут закреплять видео на главной';
    END IF;
    IF (SELECT count(*) FROM public.videos WHERE home_pinned_at IS NOT NULL AND id <> NEW.id) >= 10 THEN
      RAISE EXCEPTION 'Можно закрепить максимум 10 видео на главной';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS limit_home_pins_trg ON public.videos;
CREATE TRIGGER limit_home_pins_trg BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.limit_home_pins();
CREATE POLICY "Staff can update videos" ON public.videos FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));