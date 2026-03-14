import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ProfileEditPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    const load = async () => {
      const { data } = await supabase.from("profiles").select("username, avatar_url").eq("user_id", user.id).maybeSingle();
      if (data) {
        setUsername(data.username);
        setAvatarUrl(data.avatar_url);
      }
      setLoading(false);
    };
    load();
  }, [user, navigate]);

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("thumbnails").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Ошибка загрузки", description: error.message, variant: "destructive" }); return; }
    const { data } = supabase.storage.from("thumbnails").getPublicUrl(path);
    setAvatarUrl(data.publicUrl + "?t=" + Date.now());
  };

  const handleSave = async () => {
    if (!user || !username.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ username: username.trim(), avatar_url: avatarUrl }).eq("user_id", user.id);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      // Also update channel_name on all user's videos
      await supabase.from("videos").update({ channel_name: username.trim() }).eq("user_id", user.id);
      toast({ title: "Сохранено!" });
      navigate(`/channel/${user.id}`);
    }
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><span className="text-muted-foreground">Загрузка...</span></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto p-4 pt-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>

        <h1 className="text-xl font-bold text-foreground mb-6">Редактировать профиль</h1>

        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary-foreground text-3xl font-bold">{username.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center hover:bg-accent/80 transition-colors"
            >
              <Camera className="w-4 h-4 text-foreground" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleAvatarUpload(e.target.files[0]); }} />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Имя канала</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} className="bg-surface border-border text-foreground" />
          </div>

          <Button onClick={handleSave} disabled={saving || !username.trim()} className="w-full">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Сохранение...</> : "Сохранить"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditPage;
