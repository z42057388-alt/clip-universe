DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','verifier'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated, anon;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roles are viewable" ON public.user_roles FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- block self-verification through normal profile updates
CREATE OR REPLACE FUNCTION public.protect_is_verified()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
     AND coalesce(current_setting('app.allow_verify', true), '') <> 'on' THEN
    NEW.is_verified := OLD.is_verified;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_is_verified BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_is_verified();

CREATE OR REPLACE FUNCTION public.set_verified(_target uuid, _value boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'verifier')) THEN
    RAISE EXCEPTION 'Нет прав на выдачу галочки';
  END IF;
  PERFORM set_config('app.allow_verify','on', true);
  UPDATE public.profiles SET is_verified = _value WHERE user_id = _target;
END $$;

CREATE OR REPLACE FUNCTION public.set_verifier(_target uuid, _value boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Только главный администратор может выдавать это право';
  END IF;
  IF _value THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_target,'verifier') ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _target AND role = 'verifier';
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.set_verified(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_verifier(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_verified(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_verifier(uuid, boolean) TO authenticated;

-- main admin
INSERT INTO public.user_roles(user_id, role)
SELECT id, 'admin' FROM auth.users WHERE lower(email) = 'z42057388@gmail.com'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.grant_main_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 'z42057388@gmail.com' THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id,'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.grant_main_admin() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created_main_admin AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_main_admin();