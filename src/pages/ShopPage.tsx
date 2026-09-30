import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { AvatarFrame } from "@/components/AvatarFrame";
import { Button } from "@/components/ui/button";
import { Coins, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Frame { id: string; name: string; price: number; sort: number }

const ShopPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [frames, setFrames] = useState<Frame[]>([]);
  const [owned, setOwned] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [currency, setCurrency] = useState(0);

  const load = async () => {
    const [{ data: f }, { data: uf }, { data: p }] = await Promise.all([
      supabase.from("avatar_frames").select("id, name, price, sort").order("sort"),
      user ? supabase.from("user_frames").select("frame_id").eq("user_id", user.id) : Promise.resolve({ data: [] as any[] }),
      user ? supabase.from("profiles").select("currency, active_frame").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null as any }),
    ]);
    setFrames((f as Frame[]) || []);
    setOwned(((uf as any[]) || []).map((x) => x.frame_id));
    setCurrency(p?.currency || 0);
    setActive(p?.active_frame || null);
  };

  useEffect(() => { load(); }, [user]);

  const buy = async (id: string) => {
    const { error } = await supabase.rpc("buy_frame", { _frame: id });
    if (error) return toast({ title: "Не удалось купить", description: error.message, variant: "destructive" });
    toast({ title: "Рамка куплена!" });
    load();
  };

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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><ShoppingBag className="w-6 h-6" /> Магазин рамок</h1>
          <div className="flex items-center gap-3">
            {user && <span className="flex items-center gap-1 text-foreground font-semibold"><Coins className="w-5 h-5 text-yellow-400" /> {currency} VTD</span>}
            <Button variant="outline" onClick={() => navigate("/backpack")}>Рюкзак</Button>
          </div>
        </div>
        {!user && <p className="text-muted-foreground mb-4">Войдите, чтобы покупать рамки.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {frames.map((f) => {
            const isOwned = owned.includes(f.id);
            return (
              <div key={f.id} className="bg-surface rounded-xl p-4 flex flex-col items-center gap-3">
                <AvatarFrame frame={f.id}>
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-xl">A</span>
                  </div>
                </AvatarFrame>
                <p className="text-foreground font-medium text-center">{f.name}</p>
                <p className="text-muted-foreground text-sm flex items-center gap-1"><Coins className="w-4 h-4 text-yellow-400" /> {f.price} VTD</p>
                {isOwned ? (
                  active === f.id ? (
                    <Button variant="outline" size="sm" onClick={() => equip(null)}>Снять</Button>
                  ) : (
                    <Button size="sm" onClick={() => equip(f.id)}>Надеть</Button>
                  )
                ) : (
                  <Button size="sm" disabled={!user || currency < f.price} onClick={() => buy(f.id)}>Купить</Button>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
export default ShopPage;
