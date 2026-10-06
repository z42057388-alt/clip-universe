import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ThumbsUp, Eye } from "lucide-react";

interface Short {
  id: string; title: string; video_url: string; channel_name: string;
  user_id: string | null; views: number; likes: number; created_at: string;
}

const SEEN_KEY = "vidtube_seen_shorts";

const ShortItem = ({ s }: { s: Short }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        el.play().catch(() => {});
        const seen: string[] = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
        if (!seen.includes(s.id)) localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, s.id].slice(-500)));
      } else el.pause();
    }, { threshold: 0.6 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [s.id]);
  return (
    <div className="h-[calc(100vh-3.5rem)] snap-start flex items-center justify-center py-4">
      <div className="relative h-full aspect-[9/16] max-w-full bg-surface rounded-xl overflow-hidden">
        <video
          ref={ref} src={s.video_url} loop playsInline controls
          controlsList="nodownload noplaybackrate" disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-14 left-3 right-3 pointer-events-none">
          <p className="font-medium text-foreground drop-shadow">{s.title}</p>
          <Link to={s.user_id ? `/channel/${s.user_id}` : "#"} className="text-sm text-muted-foreground pointer-events-auto">@{s.channel_name}</Link>
          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{s.views}</span>
            <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{s.likes}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ShortsPage = () => {
  const { user } = useAuth();
  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("videos")
        .select("id,title,video_url,channel_name,user_id,views,likes,created_at")
        .eq("is_short", true).limit(200);
      let subs = new Set<string>();
      if (user) {
        const { data: s } = await supabase.from("subscriptions").select("channel_id").eq("subscriber_id", user.id);
        subs = new Set((s || []).map((x) => x.channel_id));
      }
      const seen = new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
      const now = Date.now();
      const scored = (data || []).map((v) => {
        const ageDays = (now - new Date(v.created_at).getTime()) / 864e5;
        let score = Math.log10(v.views + 1) * 2 + Math.log10(v.likes + 1) * 3 + Math.max(0, 5 - ageDays / 3);
        if (v.user_id && subs.has(v.user_id)) score += 4;
        if (seen.has(v.id)) score -= 8;
        score += Math.random() * 3;
        return { v, score };
      }).sort((a, b) => b.score - a.score).map((x) => x.v);
      setShorts(scored);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Header onToggleSidebar={() => {}} />
      <main className="pt-14 h-screen overflow-y-scroll snap-y snap-mandatory">
        {loading ? <p className="text-center text-muted-foreground mt-10">Загрузка...</p>
          : shorts.length === 0 ? <p className="text-center text-muted-foreground mt-10">Пока нет Shorts. Загрузите видео до 3 минут и отметьте «Это Short».</p>
          : shorts.map((s) => <ShortItem key={s.id} s={s} />)}
      </main>
    </div>
  );
};

export default ShortsPage;
