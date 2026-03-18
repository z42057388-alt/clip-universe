import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Check, X, ArrowLeft, MessageCircle, Headphones } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Link } from "react-router-dom";

const SUPPORT_USER_ID = "a3cda48f-8a2e-4137-97cd-07713b7366c4";

interface Conversation {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  created_at: string;
  other_username: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

const ChatPage = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    ensureSupportChat();
    fetchConversations();

    const channel = supabase
      .channel("conversations-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (!selectedConv) return;
    fetchMessages(selectedConv.id);

    const channel = supabase
      .channel(`messages-${selectedConv.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${selectedConv.id}` }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ensureSupportChat = async () => {
    try {
      await supabase.functions.invoke("ensure-support-chat");
    } catch (e) {
      console.error("Failed to ensure support chat:", e);
    }
  };

  const fetchConversations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("chat_conversations")
      .select("*")
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (data) {
      const convs: Conversation[] = [];
      for (const conv of data) {
        const otherId = conv.requester_id === user.id ? conv.recipient_id : conv.requester_id;
        const { data: profile } = await supabase.from("profiles").select("username").eq("user_id", otherId).single();
        convs.push({ ...conv, other_username: profile?.username || "Unknown" });
      }
      setConversations(convs);
    }
    setLoading(false);
  };

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const handleAccept = async (convId: string) => {
    await supabase.from("chat_conversations").update({ status: "accepted" }).eq("id", convId);
    fetchConversations();
  };

  const handleReject = async (convId: string) => {
    await supabase.from("chat_conversations").update({ status: "rejected" }).eq("id", convId);
    fetchConversations();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv || !user) return;
    const content = newMessage.trim();
    setNewMessage("");
    const { data, error } = await supabase.from("chat_messages").insert({
      conversation_id: selectedConv.id,
      sender_id: user.id,
      content,
    }).select().single();
    if (data && !error) {
      // Add immediately if not already added by realtime
      setMessages((prev) => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
    }
  };

  const isSupportConv = (conv: Conversation) =>
    conv.requester_id === SUPPORT_USER_ID || conv.recipient_id === SUPPORT_USER_ID;

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg mb-4">Войдите, чтобы использовать чат</p>
          <Link to="/auth" className="text-primary hover:underline">Войти</Link>
        </div>
      </div>
    );
  }

  const pendingRequests = conversations.filter(c => c.status === "pending" && c.recipient_id === user.id);
  const supportConvs = conversations.filter(c => c.status === "accepted" && isSupportConv(c));
  const activeConvs = conversations.filter(c => c.status === "accepted" && !isSupportConv(c));
  const sentRequests = conversations.filter(c => c.status === "pending" && c.requester_id === user.id);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className={`${selectedConv ? "hidden sm:flex" : "flex"} flex-col w-full sm:w-80 border-r border-border bg-background`}>
        <div className="p-4 border-b border-border">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3">
            <ArrowLeft className="w-4 h-4" /> Назад
          </Link>
          <h1 className="text-xl font-bold text-foreground">Чаты</h1>
        </div>

        {pendingRequests.length > 0 && (
          <div className="p-3 border-b border-border">
            <p className="text-xs text-muted-foreground uppercase font-medium mb-2">Запросы</p>
            {pendingRequests.map((conv) => (
              <div key={conv.id} className="flex items-center justify-between p-2 rounded-lg bg-surface mb-1">
                <span className="text-sm text-foreground">{conv.other_username}</span>
                <div className="flex gap-1">
                  <button onClick={() => handleAccept(conv.id)} className="p-1.5 rounded-full bg-green-600 hover:bg-green-700 transition-colors">
                    <Check className="w-3 h-3 text-foreground" />
                  </button>
                  <button onClick={() => handleReject(conv.id)} className="p-1.5 rounded-full bg-destructive hover:bg-destructive/80 transition-colors">
                    <X className="w-3 h-3 text-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Support section */}
        {supportConvs.length > 0 && (
          <div className="border-b border-border">
            <p className="text-xs text-muted-foreground uppercase font-medium px-4 pt-3 pb-1">🛟 Поддержка</p>
            {supportConvs.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`w-full flex items-center gap-3 p-4 hover:bg-surface-hover transition-colors ${selectedConv?.id === conv.id ? "bg-surface-hover" : ""}`}
              >
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                  <Headphones className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">Техническая поддержка</p>
                  <p className="text-xs text-muted-foreground">Мы готовы помочь!</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {activeConvs.length > 0 && (
            <p className="text-xs text-muted-foreground uppercase font-medium px-4 pt-3 pb-1">Чаты</p>
          )}
          {activeConvs.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedConv(conv)}
              className={`w-full flex items-center gap-3 p-4 hover:bg-surface-hover transition-colors ${selectedConv?.id === conv.id ? "bg-surface-hover" : ""}`}
            >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-primary-foreground font-bold text-sm">{conv.other_username.charAt(0).toUpperCase()}</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{conv.other_username}</p>
                <p className="text-xs text-muted-foreground">Активный чат</p>
              </div>
            </button>
          ))}
          {sentRequests.map((conv) => (
            <div key={conv.id} className="flex items-center gap-3 p-4 opacity-60">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-muted-foreground font-bold text-sm">{conv.other_username.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{conv.other_username}</p>
                <p className="text-xs text-muted-foreground">Ожидает подтверждения...</p>
              </div>
            </div>
          ))}
          {loading && <p className="text-center text-muted-foreground p-4">Загрузка...</p>}
          {!loading && conversations.length === 0 && (
            <p className="text-center text-muted-foreground p-8 text-sm">Нет чатов. Напишите автору видео!</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className={`${selectedConv ? "flex" : "hidden sm:flex"} flex-col flex-1`}>
        {selectedConv ? (
          <>
            <div className="p-4 border-b border-border flex items-center gap-3">
              <button onClick={() => setSelectedConv(null)} className="sm:hidden p-1">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              {isSupportConv(selectedConv) ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                    <Headphones className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-foreground font-medium">Техническая поддержка</p>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-xs">{selectedConv.other_username.charAt(0).toUpperCase()}</span>
                  </div>
                  <p className="text-foreground font-medium">{selectedConv.other_username}</p>
                </>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_id === user.id ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${
                    msg.sender_id === user.id ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-surface text-foreground rounded-bl-sm"
                  }`}>
                    <p>{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${msg.sender_id === user.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ru })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Написать сообщение..."
                  className="flex-1 px-4 py-2 bg-surface border border-border rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
                <button onClick={sendMessage} className="p-2.5 bg-primary rounded-full hover:bg-primary/90 transition-colors">
                  <Send className="w-4 h-4 text-primary-foreground" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Выберите чат</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
