CREATE TABLE public.account_security_codes (
 user_id uuid PRIMARY KEY,
 code_hash text NOT NULL UNIQUE CHECK (length(code_hash) = 64),
 encrypted_code text NOT NULL,
 revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.account_security_codes TO service_role;
REVOKE ALL ON public.account_security_codes FROM anon, authenticated;
ALTER TABLE public.account_security_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.account_security_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
 event_type text NOT NULL CHECK (event_type IN ('code_created','code_rotated','code_revealed','code_login','password_changed','sessions_revoked','new_browser','support_requested')),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.account_security_events TO authenticated;
GRANT ALL ON public.account_security_events TO service_role;
ALTER TABLE public.account_security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own security events" ON public.account_security_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.account_security_attempts (
 bucket_hash text PRIMARY KEY, window_started_at timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 0,
 blocked_until timestamptz
);
GRANT ALL ON public.account_security_attempts TO service_role;
REVOKE ALL ON public.account_security_attempts FROM anon, authenticated;
ALTER TABLE public.account_security_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.account_security_devices (
 user_id uuid NOT NULL, device_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, device_hash)
);
GRANT ALL ON public.account_security_devices TO service_role;
REVOKE ALL ON public.account_security_devices FROM anon, authenticated;
ALTER TABLE public.account_security_devices ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.account_recovery_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
 description text NOT NULL CHECK (length(description) BETWEEN 10 AND 2000),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','resolved','rejected')),
 response text, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.account_recovery_requests TO authenticated;
GRANT ALL ON public.account_recovery_requests TO service_role;
ALTER TABLE public.account_recovery_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own recovery requests" ON public.account_recovery_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins review recovery requests" ON public.account_recovery_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.consume_account_security_attempt(_bucket text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.account_security_attempts%ROWTYPE;
BEGIN
 INSERT INTO public.account_security_attempts(bucket_hash) VALUES (_bucket) ON CONFLICT DO NOTHING;
 SELECT * INTO r FROM public.account_security_attempts WHERE bucket_hash = _bucket FOR UPDATE;
 IF r.blocked_until > now() THEN RETURN false; END IF;
 IF r.window_started_at < now() - interval '15 minutes' THEN
   r.attempts := 0; r.window_started_at := now(); r.blocked_until := NULL;
 END IF;
 r.attempts := r.attempts + 1;
 UPDATE public.account_security_attempts SET attempts=r.attempts, window_started_at=r.window_started_at,
 blocked_until=CASE WHEN r.attempts >= 5 THEN now() + interval '15 minutes' ELSE NULL END WHERE bucket_hash=_bucket;
 RETURN r.attempts <= 5;
END $$;
REVOKE ALL ON FUNCTION public.consume_account_security_attempt(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_account_security_attempt(text) TO service_role;

CREATE OR REPLACE FUNCTION public.replace_account_security_code(_user uuid, _hash text, _encrypted text, _expected integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rev integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(_user::text, 812));
 SELECT revision INTO rev FROM public.account_security_codes WHERE user_id = _user FOR UPDATE;
 IF COALESCE(rev,0) <> _expected THEN RAISE EXCEPTION 'Security code changed; retry'; END IF;
 IF rev IS NULL THEN
   INSERT INTO public.account_security_codes(user_id,code_hash,encrypted_code) VALUES (_user,_hash,_encrypted);
   rev := 1;
 ELSE
   rev := rev + 1;
   UPDATE public.account_security_codes SET code_hash=_hash, encrypted_code=_encrypted, revision=rev, updated_at=now() WHERE user_id=_user;
 END IF;
 INSERT INTO public.account_security_events(user_id,event_type) VALUES (_user, CASE WHEN _expected=0 THEN 'code_created' ELSE 'code_rotated' END);
 INSERT INTO public.notifications(user_id,type,message) VALUES (_user,'security', CASE WHEN _expected=0 THEN 'Код безопасности создан. Сохраните его в надёжном месте.' ELSE 'Код безопасности заменён. Если это были не вы, обратитесь в поддержку.' END);
 RETURN rev;
END $$;
REVOKE ALL ON FUNCTION public.replace_account_security_code(uuid,text,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_account_security_code(uuid,text,text,integer) TO service_role;

CREATE INDEX account_security_events_owner_time ON public.account_security_events(user_id,created_at DESC);