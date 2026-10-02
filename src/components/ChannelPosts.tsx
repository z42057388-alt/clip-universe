import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { AvatarFrame } from "@/components/AvatarFrame";
import { useActiveFrames } from "@/hooks/useActiveFrames";

interface Post { id: string; content: string; created_at: string; author_id: string }

interface Props {
  channelId: string;
  channelName: string;
  avatarUrl: string | null;
  canManage: boolean;
  isStaff: boolean;
}

export const ChannelPosts = ({ channelId, channelName, avatarUrl, canManage, isStaff }: Props) => {
  const frames = useActiveFrames([channelId]);
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.from("channel_posts").select("id, content, created_at, author_id").eq("channel_id", channelId)
      .order("created_at", { ascending: false }).then(({ data }) => setPosts((data as Post[]) || []));
  }, [channelId]);

  const publish = async () => {
    const content = draft.trim();
    if (!user || !content) return;
    if (content.length > 5000) return toast({ title: "Максимум 5000 символов", variant: "destructive" });
    setSending(true);
    const { data, error } = await supabase.from("channel_posts")
      .insert({ channel_id: channelId, author_id: user.id, content }).select("id, content, created_at, author_id").single();
    setSending(false);
    if (error || !data) return toast({ title: "Не удалось опубликовать пост", variant: "destructive" });
    setPosts((p) => [data as Post, ...p]);
    setDraft("");
  };

  const remove = async (id: string) => {
    if (!confirm("Удалить пост?")) return;
    const { error, count } = await supabase.from("channel_posts").delete({ count: "exact" }).eq("id", id);
    if (error || !count) return toast({ title: "Не удалось удалить пост", variant: "destructive" });
    setPosts((p) => p.filter((x) => x.id !== id));
  };

  const avatar = (
    <AvatarFrame frame={frames[channelId]}>
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden shrink-0">
        {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-primary-foreground font-bold">{channelName.charAt(0).toUpperCase()}</span>}
      </div>
    </AvatarFrame>
  );

  return (
    <div className="max-w-2xl space-y-4 pb-8">
      {canManage && (
        <div className="bg-surface rounded-xl p-4 space-y-3">
          <p className="text-sm text-muted-foreground">Пост будет опубликован от имени канала «{channelName}»</p>
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={5000} rows={3} placeholder="Поделитесь новостью с подписчиками..." className="bg-background border-border" />
          <div className="flex justify-end">
            <Button onClick={publish} disabled={sending || !draft.trim()}>{sending ? "Публикация..." : "Опубликовать"}</Button>
          </div>
        </div>
      )}
      {posts.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">На канале пока нет постов</p>
      ) : posts.map((p) => (
        <div key={p.id} className="bg-surface rounded-xl p-4 flex gap-3">
          {avatar}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-foreground font-medium">{channelName} <span className="text-muted-foreground font-normal">· {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: ru })}</span></p>
              {(canManage || isStaff) && (
                <button onClick={() => remove(p.id)} className="p-1 text-muted-foreground hover:text-destructive" title="Удалить"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words mt-1">{p.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
