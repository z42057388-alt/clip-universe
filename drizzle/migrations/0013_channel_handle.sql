ALTER TABLE public.profiles ADD COLUMN handle text;
UPDATE public.profiles SET handle = lower(regexp_replace(username, '[^a-zA-Z0-9_]', '', 'g')) WHERE handle IS NULL;
UPDATE public.profiles SET handle = 'user' || substr(user_id::text, 1, 8) WHERE handle IS NULL OR handle = '';
CREATE UNIQUE INDEX profiles_handle_unique ON public.profiles (lower(handle));
COMMENT ON COLUMN public.profiles.handle IS 'Channel @handle, editable by owner';
