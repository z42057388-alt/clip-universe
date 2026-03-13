import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { VideoCard } from "@/components/VideoCard";
import { supabase } from "@/integrations/supabase/client";

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  channel_name: string;
  views: number;
  created_at: string;
}

const categories = ["Все", "Музыка", "Игры", "Новости", "Спорт", "Фильмы", "Обучение"];

const Index = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [activeCategory, setActiveCategory] = useState("Все");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      const { data } = await supabase
        .from("videos")
        .select("id, title, thumbnail_url, channel_name, views, created_at")
        .order("created_at", { ascending: false });
      if (data) setVideos(data);
      setLoading(false);
    };
    fetchVideos();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <Sidebar collapsed={sidebarCollapsed} />
      
      <main className={`pt-14 transition-all duration-200 ${sidebarCollapsed ? "sm:pl-[72px]" : "sm:pl-56"}`}>
        {/* Categories */}
        <div className="sticky top-14 z-30 bg-background border-b border-border px-4 py-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? "bg-chip text-chip-foreground"
                    : "bg-chip-inactive text-chip-inactive-foreground hover:bg-surface-hover"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Video Grid */}
        <div className="p-4">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-video bg-surface rounded-xl mb-3" />
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-surface" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-surface rounded w-3/4" />
                      <div className="h-3 bg-surface rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <span className="text-6xl mb-4">🎬</span>
              <h2 className="text-xl font-bold text-foreground mb-2">Пока нет видео</h2>
              <p className="text-muted-foreground">Загрузите первое видео, нажав на иконку загрузки!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video) => (
                <VideoCard key={video.id} {...video} createdAt={video.created_at} thumbnailUrl={video.thumbnail_url} channelName={video.channel_name} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
