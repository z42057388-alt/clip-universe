import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, LogOut, UserPlus, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getSavedAccounts, switchAccount, SavedAccount } from "@/lib/accounts";
import { toast } from "@/hooks/use-toast";

export const AccountSwitcher = () => {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) setAccounts(getSavedAccounts());
  }, [open]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!user) return null;

  const current = accounts.find((a) => a.userId === user.id);
  const others = accounts.filter((a) => a.userId !== user.id);

  const handleSwitch = async (account: SavedAccount) => {
    setOpen(false);
    const ok = await switchAccount(account);
    if (!ok) toast({ title: "Не удалось переключиться", description: "Сессия аккаунта истекла — войдите в него заново", variant: "destructive" });
  };

  const addAccount = async () => {
    setOpen(false);
    await supabaseSignOutKeepAccounts();
    navigate("/auth");
  };

  const supabaseSignOutKeepAccounts = async () => {
    await signOut();
  };

  const Avatar = ({ url, name, size }: { url: string | null; name: string; size: string }) =>
    url ? (
      <img src={url} alt={name} className={`${size} rounded-full object-cover`} />
    ) : (
      <div className={`${size} rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold`}>
        {name.charAt(0).toUpperCase()}
      </div>
    );

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 p-1 rounded-full hover:bg-surface-hover transition-colors" title="Аккаунты">
        <Avatar url={current?.avatarUrl || null} name={current?.username || user.email || "U"} size="w-8 h-8 text-sm" />
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50">
          <div className="p-3 border-b border-border">
            <p className="text-xs text-muted-foreground mb-2">Текущий аккаунт</p>
            <div className="flex items-center gap-3">
              <Avatar url={current?.avatarUrl || null} name={current?.username || "U"} size="w-10 h-10" />
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-medium truncate">{current?.username || "Пользователь"}</p>
                <p className="text-muted-foreground text-xs truncate">{user.email}</p>
              </div>
              <Check className="w-4 h-4 text-primary shrink-0" />
            </div>
          </div>

          {others.length > 0 && (
            <div className="py-1 max-h-64 overflow-y-auto">
              <p className="px-3 pt-2 pb-1 text-xs text-muted-foreground">Переключиться</p>
              {others.map((a) => (
                <button key={a.userId} onClick={() => handleSwitch(a)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-hover transition-colors">
                  <Avatar url={a.avatarUrl} name={a.username} size="w-9 h-9 text-sm" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-foreground text-sm truncate">{a.username}</p>
                    <p className="text-muted-foreground text-xs truncate">{a.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-border py-1">
            <button onClick={() => { setOpen(false); navigate(`/channel/${user.id}`); }} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-hover transition-colors text-foreground text-sm">
              <User className="w-4 h-4 text-muted-foreground" /> Мой канал
            </button>
            <button onClick={addAccount} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-hover transition-colors text-foreground text-sm">
              <UserPlus className="w-4 h-4 text-muted-foreground" /> Добавить аккаунт
            </button>
            <button onClick={() => { setOpen(false); signOut(); }} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-hover transition-colors text-foreground text-sm">
              <LogOut className="w-4 h-4 text-muted-foreground" /> Выйти
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
