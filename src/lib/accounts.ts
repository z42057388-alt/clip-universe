import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface SavedAccount {
  userId: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  refreshToken: string;
}

const KEY = "vidtube_accounts";

export const getSavedAccounts = (): SavedAccount[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};

const save = (accounts: SavedAccount[]) => localStorage.setItem(KEY, JSON.stringify(accounts));

export const saveCurrentAccount = async (session: Session) => {
  const accounts = getSavedAccounts().filter((a) => a.userId !== session.user.id);
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("user_id", session.user.id)
    .maybeSingle();
  accounts.unshift({
    userId: session.user.id,
    email: session.user.email || "",
    username: profile?.username || session.user.email || "Пользователь",
    avatarUrl: profile?.avatar_url || null,
    refreshToken: session.refresh_token,
  });
  save(accounts.slice(0, 10));
};

export const removeAccount = (userId: string) => {
  save(getSavedAccounts().filter((a) => a.userId !== userId));
};

export const switchAccount = async (account: SavedAccount): Promise<boolean> => {
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: account.refreshToken });
  if (error || !data.session) {
    removeAccount(account.userId);
    return false;
  }
  await saveCurrentAccount(data.session);
  return true;
};
