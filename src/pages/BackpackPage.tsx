import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { AvatarFrame } from "@/components/AvatarFrame";
import { Button } from "@/components/ui/button";
import { Backpack, Coins } from "lucide-react";

interface Item { frame_id: string; name: string; price: number }

const BackpackPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [currency, setCurrency] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: uf } = await supabase.from("user_frames").select("frame_id").eq("user_id", user.id);
      const ids = ((uf as any[]) || []).map((x) => x.frame_id);
      const { data: frames } = ids.length
        ? await supabase.from("avatar_frames").select("id, name, price").in("id", ids)
        : { data: [] as any[] };
      setItems(((frames as any[]) || []).map((f) => ({ frame_id: f.id, name: f.name, price: f.price })));
      const { data: p } = await supabase.from("profiles").select("currency, active_frame").eq("user_id", user.id).maybeSingle();
      setCurrency(p?.currency || 0);
      setActive(p?.active_frame || null);
    })();
  }, [user]);

  const equip = async (id: string | null) => {
    const { error } = await supabase.rpc("equip_frame", { _frame: id });
    if (error) return toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    setActive(id);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onToggleSidebar={() => {}} />
      <main className="max-w-3xl mx-auto px-4 pt-20 pb-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Backpack className="w-6 h-6" /> Рюкзак</h1>
          <span className="flex items-center gap-1 text-foreground font-semibold"><Coins className="w-5 h-5 text-yellow-400" /> {currency} VTD</span>
        </div>
        {!user ? (
          <p className="text-muted-foreground">Войдите, чтобы посмотреть рюкзак.</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">У вас пока нет рамок. Загляните в магазин!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((f) => (
              <div key={f.frame_id} className="bg-surface rounded-xl p-4 flex flex-col items-center gap-3">
                <AvatarFrame frame={f.frame_id}>
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-xl">A</span>
                  </div>
                </AvatarFrame>
                <p className="text-foreground font-medium text-center">{f.name}</p>
                {active === f.frame_id ? (
                  <Button variant="outline" size="sm" onClick={() => equip(null)}>Снять</Button>
                ) : (
                  <Button size="sm" onClick={() => equip(f.frame_id)}>Надеть</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
export default BackpackPage;
