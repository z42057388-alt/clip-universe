
-- AI conversations table
CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Новый чат',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI messages table
CREATE TABLE public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI conversations" ON public.ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own AI conversations" ON public.ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own AI conversations" ON public.ai_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own AI conversations" ON public.ai_conversations FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own AI messages" ON public.ai_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.ai_conversations WHERE id = conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own AI messages" ON public.ai_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.ai_conversations WHERE id = conversation_id AND user_id = auth.uid())
);

-- Update trigger for ai_conversations
CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
