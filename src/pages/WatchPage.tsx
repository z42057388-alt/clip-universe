import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ThumbsUp, ThumbsDown, Share2, ArrowLeft, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Video {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  views: number;
  likes: number;
  dislikes: number;
  channel_name: string;
  created_at: string;
  user_id: string | null;
}

const formatViews = (views: number): string => {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)} млн`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)} тыс.`;
  return `${views}`;
};

const WatchPage = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [reactionLoading, setReactionLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!id) return;
    const fetchVideo = async () => {
      const { data, error } = await supabase.from("videos").select("*").eq("id", id).single();
      if (!error && data) {
        setVideo(data);
        // Increment views
        await supabase.from("videos").update({ views: data.views + 1 }).eq("id", id);
      }
      setLoading(false);
    };
    fetchVideo();
  }, [id]);

  const handleChatRequest = async () => {
    if (!user) {
      toast({ title: "Войдите в аккаунт", description: "Нужна авторизация для чата", variant: "destructive" });
      return;
    }
    if (!video?.user_id) {
      toast({ title: "Недоступно", description: "У автора нет аккаунта", variant: "destructive" });
      return;
    }
    if (video.user_id === user.id) {
      toast({ title: "Это ваше видео", description: "Нельзя написать самому себе" });
      return;
    }

    // Check existing conversation
    const { data: existing } = await supabase
      .from("chat_conversations")
      .select("*")
      .or(`and(requester_id.eq.${user.id},recipient_id.eq.${video.user_id}),and(requester_id.eq.${video.user_id},recipient_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      toast({ title: existing.status === "accepted" ? "Чат уже открыт" : "Запрос уже отправлен", description: existing.status === "accepted" ? "Перейдите в раздел чатов" : "Ожидайте подтверждения" });
      return;
    }

    const { error } = await supabase.from("chat_conversations").insert({
      requester_id: user.id,
      recipient_id: video.user_id,
    });

    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Запрос отправлен!", description: "Автор видео должен подтвердить" });
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="text-muted-foreground">Загрузка...</div></div>;
  if (!video) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="text-muted-foreground">Видео не найдено</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 pt-6">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Назад
        </Link>
        <div className="aspect-video bg-surface rounded-2xl overflow-hidden mb-4">
          <video src={video.video_url} controls autoPlay className="w-full h-full" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">{video.title}</h1>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">{video.channel_name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{video.channel_name}</p>
              <p className="text-xs text-muted-foreground">
                {formatViews(video.views)} просмотров • {formatDistanceToNow(new Date(video.created_at), { addSuffix: true, locale: ru })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-hover rounded-full hover:bg-accent transition-colors text-foreground text-sm">
              <ThumbsUp className="w-4 h-4" /> Нравится
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-hover rounded-full hover:bg-accent transition-colors text-foreground text-sm">
              <ThumbsDown className="w-4 h-4" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-hover rounded-full hover:bg-accent transition-colors text-foreground text-sm">
              <Share2 className="w-4 h-4" /> Поделиться
            </button>
            <button onClick={handleChatRequest} className="flex items-center gap-2 px-4 py-2 bg-primary rounded-full hover:bg-primary/90 transition-colors text-primary-foreground text-sm">
              <MessageCircle className="w-4 h-4" /> Написать
            </button>
          </div>
        </div>
        {video.description && (
          <div className="bg-surface rounded-xl p-4">
            <p className="text-sm text-foreground whitespace-pre-wrap">{video.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchPage;
