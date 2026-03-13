
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || LEFT(NEW.id::text, 8)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Chat conversations with access control
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, recipient_id)
);
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own conversations" ON public.chat_conversations FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
CREATE POLICY "Authenticated users can request chat" ON public.chat_conversations FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Recipients can update conversation status" ON public.chat_conversations FOR UPDATE USING (auth.uid() = recipient_id);

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Chat messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Function to check if user is participant in accepted conversation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id UUID, _conversation_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_conversations
    WHERE id = _conversation_id
      AND status = 'accepted'
      AND (_user_id = requester_id OR _user_id = recipient_id)
  )
$$;

CREATE POLICY "Users can view messages in their accepted conversations" ON public.chat_messages FOR SELECT USING (public.is_conversation_participant(auth.uid(), conversation_id));
CREATE POLICY "Users can send messages in accepted conversations" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id AND public.is_conversation_participant(auth.uid(), conversation_id));

-- Update videos table to support auth (optional user_id)
ALTER TABLE public.videos ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
