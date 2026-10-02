import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Fetches active_frame for one or many user ids. Returns a map user_id -> frame id.
export const useActiveFrames = (userIds: (string | null | undefined)[]) => {
  const [frames, setFrames] = useState<Record<string, string>>({});
  const key = userIds.filter(Boolean).sort().join(",");

  useEffect(() => {
    const ids = key.split(",").filter(Boolean);
    if (ids.length === 0) { setFrames({}); return; }
    supabase
      .from("profiles")
      .select("user_id, active_frame")
      .in("user_id", ids)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach((p) => { if (p.active_frame) map[p.user_id] = p.active_frame; });
        setFrames(map);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return frames;
};
