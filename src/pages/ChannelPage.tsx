import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { VideoCard } from "@/components/VideoCard";
import { ArrowLeft, Settings, Search, UserPlus, X, Share2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SubscribeButton } from "@/components/SubscribeButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  user_id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  bio: string | null;
}

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  channel_name: string;
  views: number;
  likes: number;
  created_at: string;
}

interface Collab {
  id: string;
  collaborator_id: string;
  status: string;
  profile?: { username: string; avatar_url: string | null };
}

type Tab = "videos" | "about" | "collabs";
type Sort = "new" | "popular" | "old";

const ChannelPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [subCount, setSubCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("videos");
  const [sort, setSort] = useState<Sort>("new");
  const [search, setSearch] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const isOwner = user?.id === userId;

  const loadCollabs = async () => {
    if (!userId) return;
    const { data } = await supabase.from("channel_collaborators").select("id, collaborator_id, status").eq("channel_id", userId);
    const list = (data || []) as Collab[];
    if (list.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, username, avatar_url").in("user_id", list.map((c) => c.collaborator_id));
      list.forEach((c) => (c.profile = profs?.find((p) => p.user_id === c.collaborator_id)));
    }
    setCollabs(list);
  };

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [profileRes, videosRes, subsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, username, avatar_url, created_at, bio").eq("user_id", userId).maybeSingle(),
        supabase.from("videos").select("id, title, thumbnail_url, channel_name, views, likes, created_at").eq("user_id", userId),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("channel_id", userId),
      ]);
      if (profileRes.data) { setProfile(profileRes.data as Profile); setBioDraft(profileRes.data.bio || ""); }
      if (videosRes.data) setVideos(videosRes.data as Video[]);
      setSubCount(subsRes.count || 0);
      await loadCollabs();
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const invite = async () => {
    const name = inviteName.trim();
    if (!name || !userId) return;
    const { data: target } = await supabase.from("profiles").select("user_id, username").ilike("username", name).maybeSingle();
    if (!target) return toast({ title: "Пользователь не найден", description: `Нет пользователя «${name}»`, variant: "destructive" });
    if (target.user_id === userId) return toast({ title: "Нельзя пригласить себя", variant: "destructive" });
    const { error } = await supabase.from("channel_collaborators").insert({ channel_id: userId, collaborator_id: target.user_id });
    if (error) return toast({ title: "Не удалось пригласить", description: "Возможно, приглашение уже отправлено", variant: "destructive" });
    toast({ title: "Приглашение отправлено", description: `${target.username} получит уведомление` });
    setInviteName("");
    loadCollabs();
  };

  const removeCollab = async (id: string) => {
    await supabase.from("channel_collaborators").delete().eq("id", id);
    loadCollabs();
  };

  const saveBio = async () => {
    if (!userId) return;
    const { error } = await supabase.from("profiles").update({ bio: bioDraft.trim() || null }).eq("user_id", userId);
    if (error) return toast({ title: "Не удалось сохранить", variant: "destructive" });
    setProfile((p) => (p ? { ...p, bio: bioDraft.trim() || null } : p));
    setEditingBio(false);
  };

  const share = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast({ title: "Ссылка на канал скопирована" });
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><span className="text-muted-foreground">Загрузка...</span></div>;
  if (!profile) return <div className="min-h-screen bg-background flex items-center justify-center"><span className="text-muted-foreground">Канал не найден</span></div>;

  const totalViews = videos.reduce((s, v) => s + (v.views || 0), 0);
  const totalLikes = videos.reduce((s, v) => s + (v.likes || 0), 0);
  const shown = videos
    .filter((v) => v.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sort === "popular" ? b.views - a.views : sort === "old" ? +new Date(a.created_at) - +new Date(b.created_at) : +new Date(b.created_at) - +new Date(a.created_at)
    );
  const accepted = collabs.filter((c) => c.status === "accepted");
  const visibleCollabs = isOwner ? collabs.filter((c) => c.status !== "declined") : accepted;

  const tabBtn = (t: Tab, label: string) => (
    <button onClick={() => setTab(t)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}>{label}</button>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="h-32 sm:h-48 bg-gradient-to-r from-primary/30 via-primary/10 to-accent/20" />

      <div className="max-w-6xl mx-auto px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mt-4 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> На главную
        </Link>

        <div className="flex items-center gap-4 sm:gap-6 py-6 -mt-12 sm:-mt-16 relative z-10">
          <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-primary flex items-center justify-center border-4 border-background overflow-hidden flex-shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary-foreground text-2xl sm:text-4xl font-bold">{profile.username.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-8 sm:pt-12">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{profile.username}</h1>
              {isOwner && (
                <Link to="/profile/edit" className="p-2 rounded-full hover:bg-surface-hover transition-colors" title="Редактировать">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                </Link>
              )}
              <button onClick={share} className="p-2 rounded-full hover:bg-surface-hover transition-colors" title="Поделиться">
                <Share2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {subCount} подписчиков · {videos.length} видео · {totalViews.toLocaleString("ru-RU")} просмотров
            </p>
            {accepted.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">Соавторы: {accepted.map((c) => c.profile?.username).filter(Boolean).join(", ")}</p>
            )}
            {userId && !isOwner && <SubscribeButton channelId={userId} showCount />}
          </div>
        </div>

        <div className="border-b border-border mb-6 flex">
          {tabBtn("videos", "Видео")}
          {tabBtn("about", "О канале")}
          {tabBtn("collabs", `Соавторы${accepted.length ? ` (${accepted.length})` : ""}`)}
        </div>

        {tab === "videos" && (
          <>
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              {(["new", "popular", "old"] as Sort[]).map((s) => (
                <button key={s} onClick={() => setSort(s)} className={`px-3 py-1.5 rounded-lg text-sm ${sort === s ? "bg-foreground text-background" : "bg-surface text-foreground hover:bg-surface-hover"}`}>
                  {s === "new" ? "Новые" : s === "popular" ? "Популярные" : "Старые"}
                </button>
              ))}
              <div className="relative ml-auto">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск на канале" className="pl-9 w-56 bg-surface border-border" />
              </div>
            </div>
            {shown.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <span className="text-5xl mb-4">🎬</span>
                <p className="text-muted-foreground">{search ? "Ничего не найдено" : isOwner ? "Вы ещё не загрузили видео" : "На канале пока нет видео"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
                {shown.map((video) => (
                  <VideoCard key={video.id} {...video} createdAt={video.created_at} thumbnailUrl={video.thumbnail_url} channelName={video.channel_name} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "about" && (
          <div className="grid md:grid-cols-3 gap-6 pb-8">
            <div className="md:col-span-2 space-y-3">
              <h2 className="font-medium text-foreground">Описание</h2>
              {editingBio ? (
                <>
                  <Textarea value={bioDraft} onChange={(e) => setBioDraft(e.target.value)} rows={5} maxLength={1000} className="bg-surface border-border" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveBio}>Сохранить</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingBio(false)}>Отмена</Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.bio || "Описание канала пока не добавлено."}</p>
                  {isOwner && <Button size="sm" variant="outline" onClick={() => setEditingBio(true)}>Изменить описание</Button>}
                </>
              )}
            </div>
            <div className="space-y-2 text-sm text-muted-foreground bg-surface rounded-xl p-4">
              <h2 className="font-medium text-foreground mb-2">Статистика</h2>
              <p>На платформе с {new Date(profile.created_at).toLocaleDateString("ru-RU")}</p>
              <p>{subCount} подписчиков</p>
              <p>{videos.length} видео</p>
              <p>{totalViews.toLocaleString("ru-RU")} просмотров</p>
              <p>{totalLikes.toLocaleString("ru-RU")} лайков</p>
            </div>
          </div>
        )}

        {tab === "collabs" && (
          <div className="pb-8 space-y-4 max-w-xl">
            {isOwner && (
              <div className="bg-surface rounded-xl p-4 space-y-2">
                <h2 className="font-medium text-foreground">Пригласить соавтора</h2>
                <p className="text-xs text-muted-foreground">Введите имя пользователя VidTube — он получит уведомление с кнопкой «Принять».</p>
                <div className="flex gap-2">
                  <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && invite()} placeholder="Имя пользователя" className="bg-background border-border" />
                  <Button onClick={invite}><UserPlus className="w-4 h-4 mr-1" /> Пригласить</Button>
                </div>
              </div>
            )}
            {visibleCollabs.length === 0 ? (
              <p className="text-muted-foreground text-sm">У канала пока нет соавторов</p>
            ) : (
              visibleCollabs.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface">
                  <Link to={`/channel/${c.collaborator_id}`} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden">
                    {c.profile?.avatar_url ? <img src={c.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-primary-foreground font-bold">{c.profile?.username?.charAt(0).toUpperCase()}</span>}
                  </Link>
                  <Link to={`/channel/${c.collaborator_id}`} className="flex-1 text-foreground hover:underline">{c.profile?.username || "Пользователь"}</Link>
                  {c.status === "pending" && <span className="text-xs text-muted-foreground">Ожидает ответа</span>}
                  {(isOwner || user?.id === c.collaborator_id) && (
                    <button onClick={() => removeCollab(c.id)} className="p-1.5 rounded-full hover:bg-surface-hover" title="Убрать">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelPage;
