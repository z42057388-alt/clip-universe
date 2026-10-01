import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ThumbsUp, ThumbsDown, Share2, ArrowLeft, MessageCircle, Trash2, Pencil, Pin, PinOff } from "lucide-react";
import { CommentSection } from "@/components/CommentSection";
import { SubscribeButton } from "@/components/SubscribeButton";
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
  const navigate = useNavigate();
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    if (!user) { setIsStaff(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      setIsStaff(!!data?.some((r) => r.role === "admin" || r.role === "moderator"));
    });
  }, [user]);

  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !video?.user_id) { setCanEdit(false); return; }
    if (user.id === video.user_id) { setCanEdit(true); return; }
    supabase.rpc("can_manage_channel", { _user_id: user.id, _channel_id: video.user_id }).then(({ data }) => setCanEdit(!!data));
  }, [user, video?.user_id]);

  const startEdit = () => { if (!video) return; setTitleDraft(video.title); setDescDraft(video.description || ""); setEditing(true); };
  const saveEdit = async () => {
    if (!video) return;
    const title = titleDraft.trim();
    if (!title || title.length > 200) return toast({ title: "Название: от 1 до 200 символов", variant: "destructive" });
    if (descDraft.length > 5000) return toast({ title: "Описание: максимум 5000 символов", variant: "destructive" });
    setSaving(true);
    const { error, count } = await supabase.from("videos").update({ title, description: descDraft.trim() || null }, { count: "exact" }).eq("id", video.id);
    setSaving(false);
    if (error || !count) return toast({ title: "Не удалось сохранить", variant: "destructive" });
    setVideo({ ...video, title, description: descDraft.trim() || null });
    setEditing(false);
    toast({ title: "Изменения сохранены" });
  };

  const [homePinned, setHomePinned] = useState(false);
  const toggleHomePin = async () => {
    if (!video) return;
    const val = homePinned ? null : new Date().toISOString();
    const { error, count } = await supabase.from("videos").update({ home_pinned_at: val }, { count: "exact" }).eq("id", video.id);
    if (error || !count) return toast({ title: "Не удалось изменить закрепление", description: error?.message, variant: "destructive" });
    setHomePinned(!homePinned);
    toast({ title: homePinned ? "Видео откреплено от главной" : "Видео закреплено на главной" });
  };

  const handleModDelete = async () => {
    if (!id || !confirm("Удалить это видео?")) return;
    const { error, count } = await supabase.from("videos").delete({ count: "exact" }).eq("id", id);
    if (error || !count) return toast({ title: "Не удалось удалить видео", variant: "destructive" });
    toast({ title: "Видео удалено" });
    navigate("/");
  };


  useEffect(() => {
    if (!id) return;
    const fetchVideo = async () => {
      const { data, error } = await supabase.from("videos").select("*").eq("id", id).single();
      if (!error && data) {
        setVideo(data as Video);
        setHomePinned(!!(data as any).home_pinned_at);
        await supabase.rpc("increment_video_views", { video_id: id });
      }
      setLoading(false);
    };
    fetchVideo();
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    const fetchReaction = async () => {
      const { data } = await supabase
        .from("video_reactions")
        .select("reaction_type")
        .eq("video_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setUserReaction(data.reaction_type);
    };
    fetchReaction();
  }, [id, user]);

  const handleReaction = async (type: "like" | "dislike") => {
    if (!user) {
      toast({ title: "Войдите в аккаунт", description: "Нужна авторизация", variant: "destructive" });
      return;
    }
    if (!id || reactionLoading) return;
    setReactionLoading(true);

    try {
      if (userReaction === type) {
        // Remove reaction
        await supabase.from("video_reactions").delete().eq("video_id", id).eq("user_id", user.id);
        setUserReaction(null);
        setVideo(prev => prev ? { ...prev, [type === "like" ? "likes" : "dislikes"]: Math.max(0, prev[type === "like" ? "likes" : "dislikes"] - 1) } : prev);
      } else {
        // Upsert reaction
        const oldReaction = userReaction;
        await supabase.from("video_reactions").upsert({ video_id: id, user_id: user.id, reaction_type: type }, { onConflict: "video_id,user_id" });
        setUserReaction(type);
        setVideo(prev => {
          if (!prev) return prev;
          const updated = { ...prev };
          updated[type === "like" ? "likes" : "dislikes"] += 1;
          if (oldReaction) updated[oldReaction === "like" ? "likes" : "dislikes"] = Math.max(0, updated[oldReaction === "like" ? "likes" : "dislikes"] - 1);
          return updated;
        });
      }
    } catch {
      toast({ title: "Ошибка", variant: "destructive" });
    }
    setReactionLoading(false);
  };

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
        {editing ? (
          <div className="bg-surface rounded-xl p-4 mb-4 space-y-3">
            <input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} maxLength={200} placeholder="Название" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground" />
            <textarea value={descDraft} onChange={(e) => setDescDraft(e.target.value)} maxLength={5000} rows={5} placeholder="Описание" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-full bg-surface-hover text-foreground text-sm">Отмена</button>
              <button onClick={saveEdit} disabled={saving} className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm disabled:opacity-50">{saving ? "Сохранение..." : "Сохранить"}</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3 mb-2">
            <h1 className="text-xl font-bold text-foreground">{video.title}</h1>
            {canEdit && (
              <button onClick={startEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-hover hover:bg-accent text-foreground text-sm shrink-0">
                <Pencil className="w-4 h-4" /> Изменить
              </button>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            {video.user_id ? (
              <Link to={`/channel/${video.user_id}`} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:opacity-80 transition-opacity">
                <span className="text-primary-foreground font-bold">{video.channel_name.charAt(0).toUpperCase()}</span>
              </Link>
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">{video.channel_name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div>
              {video.user_id ? (
                <Link to={`/channel/${video.user_id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">{video.channel_name}</Link>
              ) : (
                <p className="text-sm font-medium text-foreground">{video.channel_name}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatViews(video.views)} просмотров • {formatDistanceToNow(new Date(video.created_at), { addSuffix: true, locale: ru })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleReaction("like")}
              disabled={reactionLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors text-sm ${userReaction === "like" ? "bg-primary text-primary-foreground" : "bg-surface-hover hover:bg-accent text-foreground"}`}
            >
              <ThumbsUp className="w-4 h-4" /> {video.likes > 0 ? video.likes : ""}
            </button>
            <button
              onClick={() => handleReaction("dislike")}
              disabled={reactionLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors text-sm ${userReaction === "dislike" ? "bg-destructive text-destructive-foreground" : "bg-surface-hover hover:bg-accent text-foreground"}`}
            >
              <ThumbsDown className="w-4 h-4" /> {video.dislikes > 0 ? video.dislikes : ""}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-hover rounded-full hover:bg-accent transition-colors text-foreground text-sm">
              <Share2 className="w-4 h-4" /> Поделиться
            </button>
            <button onClick={handleChatRequest} className="flex items-center gap-2 px-4 py-2 bg-primary rounded-full hover:bg-primary/90 transition-colors text-primary-foreground text-sm">
              <MessageCircle className="w-4 h-4" /> Написать
            </button>
            {isStaff && (
              <button onClick={toggleHomePin} className="flex items-center gap-2 px-4 py-2 bg-surface-hover rounded-full hover:bg-accent transition-colors text-foreground text-sm">
                {homePinned ? <><PinOff className="w-4 h-4" /> Открепить с главной</> : <><Pin className="w-4 h-4" /> На главную</>}
              </button>
            )}
            {isStaff && (
              <button onClick={handleModDelete} className="flex items-center gap-2 px-4 py-2 bg-destructive rounded-full hover:bg-destructive/90 transition-colors text-destructive-foreground text-sm">
                <Trash2 className="w-4 h-4" /> Удалить (модерация)
              </button>
            )}
          </div>
        </div>
        {!editing && video.description && (
          <div className="bg-surface rounded-xl p-4">
            <p className="text-sm text-foreground whitespace-pre-wrap">{video.description}</p>
          </div>
        )}

        {/* Subscribe button */}
        {video.user_id && (
          <div className="mt-4">
            <SubscribeButton channelId={video.user_id} showCount />
          </div>
        )}

        {/* Comments */}
        <CommentSection videoId={video.id} />
      </div>
    </div>
  );
};

export default WatchPage;
