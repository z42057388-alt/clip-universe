import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
}

export const NotificationsBell = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Notification[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
    setItems((data as Notification[]) || []);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const unread = items.filter((n) => !n.read).length;

  const respond = async (n: Notification, status: "accepted" | "declined") => {
    const { error } = await supabase.from("channel_collaborators").update({ status }).eq("id", n.data?.collab_id);
    if (error) {
      toast({ title: "Не удалось ответить", description: "Возможно, приглашение уже отменено", variant: "destructive" });
    } else {
      toast({ title: status === "accepted" ? "Вы стали соавтором канала" : "Приглашение отклонено" });
    }
    await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    load();
  };

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    load();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-surface-hover transition-colors" title="Уведомления">
          <Bell className="w-5 h-5 text-foreground" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">{unread}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-card border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-medium text-foreground">Уведомления</span>
          {unread > 0 && <button onClick={markAll} className="text-xs text-primary">Прочитать все</button>}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && <p className="p-4 text-sm text-muted-foreground">Уведомлений нет</p>}
          {items.map((n) => (
            <div key={n.id} className={`px-4 py-3 border-b border-border text-sm ${n.read ? "text-muted-foreground" : "text-foreground"}`}>
              <p>{n.message}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("ru-RU")}</p>
              {n.type === "collab_invite" && !n.read && (
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => respond(n, "accepted")}>Принять</Button>
                  <Button size="sm" variant="outline" onClick={() => respond(n, "declined")}>Отклонить</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
