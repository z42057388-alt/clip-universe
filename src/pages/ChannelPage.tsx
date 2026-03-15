import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { VideoCard } from "@/components/VideoCard";
import { ArrowLeft, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SubscribeButton } from "@/components/SubscribeButton";

interface Profile {
  user_id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  channel_name: string;
  views: number;
  created_at: string;
}

const ChannelPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const isOwner = user?.id === userId;

  useEffect(() => {
    if (!userId) return;
    const fetch = async () => {
      const [profileRes, videosRes] = await Promise.all([
        supabase.from("profiles").select("user_id, username, avatar_url, created_at").eq("user_id", userId).maybeSingle(),
        supabase.from("videos").select("id, title, thumbnail_url, channel_name, views, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (videosRes.data) setVideos(videosRes.data);
      setLoading(false);
    };
    fetch();
  }, [userId]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><span className="text-muted-foreground">Загрузка...</span></div>;
  if (!profile) return <div className="min-h-screen bg-background flex items-center justify-center"><span className="text-muted-foreground">Канал не найден</span></div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div className="h-32 sm:h-48 bg-gradient-to-r from-primary/30 via-primary/10 to-accent/20" />

      <div className="max-w-6xl mx-auto px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mt-4 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> На главную
        </Link>

        {/* Profile info */}
        <div className="flex items-center gap-4 sm:gap-6 py-6 -mt-12 sm:-mt-16 relative z-10">
          <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-primary flex items-center justify-center border-4 border-background overflow-hidden flex-shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary-foreground text-2xl sm:text-4xl font-bold">{profile.username.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-8 sm:pt-12">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{profile.username}</h1>
              {isOwner && (
                <Link to="/profile/edit" className="p-2 rounded-full hover:bg-surface-hover transition-colors" title="Редактировать">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                </Link>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{videos.length} видео</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-6">
          <button className="px-4 py-3 text-sm font-medium text-foreground border-b-2 border-primary">Видео</button>
        </div>

        {/* Videos grid */}
        {videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="text-5xl mb-4">🎬</span>
            <p className="text-muted-foreground">{isOwner ? "Вы ещё не загрузили видео" : "На канале пока нет видео"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
            {videos.map((video) => (
              <VideoCard key={video.id} {...video} createdAt={video.created_at} thumbnailUrl={video.thumbnail_url} channelName={video.channel_name} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelPage;
