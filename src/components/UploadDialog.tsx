import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UploadDialog = ({ open, onOpenChange }: UploadDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [channelName, setChannelName] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("username").eq("user_id", user.id).maybeSingle();
      if (profile?.username) setChannelName(profile.username);
    };
    loadProfile();
  }, [open]);

  const handleUpload = async () => {
    if (!videoFile || !title.trim()) {
      toast({ title: "Ошибка", description: "Укажите название и выберите видео", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const videoExt = videoFile.name.split(".").pop();
      const videoPath = `${crypto.randomUUID()}.${videoExt}`;
      const { error: videoErr } = await supabase.storage.from("videos").upload(videoPath, videoFile);
      if (videoErr) throw videoErr;

      const { data: videoUrlData } = supabase.storage.from("videos").getPublicUrl(videoPath);

      let thumbnailUrl: string | null = null;
      if (thumbnailFile) {
        const thumbExt = thumbnailFile.name.split(".").pop();
        const thumbPath = `${crypto.randomUUID()}.${thumbExt}`;
        const { error: thumbErr } = await supabase.storage.from("thumbnails").upload(thumbPath, thumbnailFile);
        if (thumbErr) throw thumbErr;
        const { data: thumbUrlData } = supabase.storage.from("thumbnails").getPublicUrl(thumbPath);
        thumbnailUrl = thumbUrlData.publicUrl;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error: insertErr } = await supabase.from("videos").insert({
        title: title.trim(),
        description: description.trim() || null,
        video_url: videoUrlData.publicUrl,
        thumbnail_url: thumbnailUrl,
        channel_name: channelName.trim() || "Anonymous",
        user_id: user?.id || null,
      });

      if (insertErr) throw insertErr;

      toast({ title: "Успех!", description: "Видео загружено" });
      setTitle("");
      setDescription("");
      setChannelName("");
      setVideoFile(null);
      setThumbnailFile(null);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Ошибка загрузки", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Загрузить видео</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Видеофайл *</label>
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
            <Button variant="outline" className="w-full" onClick={() => videoInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              {videoFile ? videoFile.name : "Выбрать видео"}
            </Button>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Обложка</label>
            <input ref={thumbnailInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)} />
            <Button variant="outline" className="w-full" onClick={() => thumbnailInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              {thumbnailFile ? thumbnailFile.name : "Выбрать обложку"}
            </Button>
          </div>
          <Input placeholder="Название видео *" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-surface border-border text-foreground" />
          <Textarea placeholder="Описание" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-surface border-border text-foreground resize-none" rows={3} />
          <Button onClick={handleUpload} disabled={uploading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Загрузка...</> : "Загрузить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
