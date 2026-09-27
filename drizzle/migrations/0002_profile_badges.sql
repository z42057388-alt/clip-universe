ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badges text[] NOT NULL DEFAULT '{}';
UPDATE public.profiles SET badges = ARRAY['red'] WHERE is_verified AND NOT ('red' = ANY(badges));

CREATE OR REPLACE FUNCTION public.protect_is_verified()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF coalesce(current_setting('app.allow_verify', true), '') <> 'on' THEN
    NEW.is_verified := OLD.is_verified;
    NEW.badges := OLD.badges;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.set_badge(_target uuid, _badge text, _value boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'verifier')) THEN
    RAISE EXCEPTION 'Нет прав на выдачу галочки';
  END IF;
  IF _badge NOT IN ('red','green','purple') THEN
    RAISE EXCEPTION 'Неизвестный тип галочки';
  END IF;
  PERFORM set_config('app.allow_verify','on', true);
  UPDATE public.profiles SET
    badges = CASE WHEN _value THEN array_append(array_remove(badges,_badge),_badge) ELSE array_remove(badges,_badge) END
  WHERE user_id = _target;
  UPDATE public.profiles SET is_verified = ('red' = ANY(badges)) WHERE user_id = _target;
END $$;

REVOKE EXECUTE ON FUNCTION public.set_badge(uuid,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_badge(uuid,text,boolean) TO authenticated;