import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";

interface SubscribeButtonProps {
  channelId: string;
  showCount?: boolean;
}

export const SubscribeButton = ({ channelId, showCount = false }: SubscribeButtonProps) => {
  const [subscribed, setSubscribed] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetch = async () => {
      const { count: subCount } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("channel_id", channelId);
      setCount(subCount || 0);

      if (user) {
        const { data } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("channel_id", channelId)
          .eq("subscriber_id", user.id)
          .maybeSingle();
        setSubscribed(!!data);
      }
    };
    fetch();
  }, [channelId, user]);

  const handleToggle = async () => {
    if (!user) {
      toast({ title: "Войдите в аккаунт", variant: "destructive" });
      return;
    }
    if (user.id === channelId) return;
    setLoading(true);

    if (subscribed) {
      await supabase.from("subscriptions").delete().eq("channel_id", channelId).eq("subscriber_id", user.id);
      setSubscribed(false);
      setCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("subscriptions").insert({ channel_id: channelId, subscriber_id: user.id });
      setSubscribed(true);
      setCount((c) => c + 1);
    }
    setLoading(false);
  };

  if (user?.id === channelId) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleToggle}
        disabled={loading}
        variant={subscribed ? "outline" : "default"}
        size="sm"
        className={subscribed ? "border-border" : ""}
      >
        {subscribed ? <><BellOff className="w-4 h-4 mr-1" /> Отписаться</> : <><Bell className="w-4 h-4 mr-1" /> Подписаться</>}
      </Button>
      {showCount && <span className="text-sm text-muted-foreground">{count} подписчиков</span>}
    </div>
  );
};
