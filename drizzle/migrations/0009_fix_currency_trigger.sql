CREATE OR REPLACE FUNCTION public.protect_currency() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND coalesce(current_setting('app.allow_currency', true), '') <> 'on' THEN
    NEW.currency := OLD.currency;
    NEW.active_frame := OLD.active_frame;
  END IF;
  RETURN NEW;
END $$;

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
  PERFORM set_config('app.allow_currency','on', true);
  UPDATE public.profiles SET currency = currency + 20 WHERE user_id = v.user_id;
END $$;

CREATE OR REPLACE FUNCTION public.give_currency(_target uuid, _amount integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Только администратор и модераторы могут выдавать валюту';
  END IF;
  IF _amount = 0 OR abs(_amount) > 1000000 THEN
    RAISE EXCEPTION 'Недопустимая сумма';
  END IF;
  PERFORM set_config('app.allow_currency','on', true);
  UPDATE public.profiles SET currency = greatest(0, currency + _amount) WHERE user_id = _target;
END $$;

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
  PERFORM set_config('app.allow_currency','on', true);
  UPDATE public.profiles SET currency = currency - f.price WHERE user_id = auth.uid();
  INSERT INTO public.user_frames(user_id, frame_id) VALUES (auth.uid(), _frame);
END $$;

CREATE OR REPLACE FUNCTION public.equip_frame(_frame text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _frame IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user_frames WHERE user_id = auth.uid() AND frame_id = _frame) THEN
    RAISE EXCEPTION 'Эта рамка не куплена';
  END IF;
  PERFORM set_config('app.allow_currency','on', true);
  UPDATE public.profiles SET active_frame = _frame WHERE user_id = auth.uid();
END $$;