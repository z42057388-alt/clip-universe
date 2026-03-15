import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Link } from "react-router-dom";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile?: { username: string; avatar_url: string | null };
}

interface CommentSectionProps {
  videoId: string;
}

export const CommentSection = ({ videoId }: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("video_id", videoId)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      setComments(
        data.map((c) => ({
          ...c,
          profile: profileMap.get(c.user_id) || { username: "Пользователь", avatar_url: null },
        }))
      );
    } else {
      setComments([]);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [videoId]);

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Войдите в аккаунт", variant: "destructive" });
      return;
    }
    if (!newComment.trim()) return;
    setLoading(true);

    const { error } = await supabase.from("comments").insert({
      video_id: videoId,
      user_id: user.id,
      content: newComment.trim(),
    });

    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      setNewComment("");
      fetchComments();
    }
    setLoading(false);
  };

  const handleDelete = async (commentId: string) => {
    await supabase.from("comments").delete().eq("id", commentId);
    fetchComments();
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-bold text-foreground mb-4">{comments.length} комментариев</h3>

      {user && (
        <div className="flex gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary flex-shrink-0 flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">
              {user.user_metadata?.username?.charAt(0)?.toUpperCase() || "U"}
            </span>
          </div>
          <div className="flex-1">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Написать комментарий..."
              className="bg-surface border-border text-foreground resize-none mb-2"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setNewComment("")}>Отмена</Button>
              <Button size="sm" onClick={handleSubmit} disabled={loading || !newComment.trim()}>
                Комментировать
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Link to={`/channel/${comment.user_id}`} className="w-10 h-10 rounded-full bg-primary/80 flex-shrink-0 flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity">
              {comment.profile?.avatar_url ? (
                <img src={comment.profile.avatar_url} className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary-foreground font-bold text-sm">
                  {comment.profile?.username?.charAt(0)?.toUpperCase() || "U"}
                </span>
              )}
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Link to={`/channel/${comment.user_id}`} className="text-sm font-medium text-foreground hover:text-primary">
                  {comment.profile?.username}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ru })}
                </span>
                {user?.id === comment.user_id && (
                  <button onClick={() => handleDelete(comment.id)} className="ml-auto p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
