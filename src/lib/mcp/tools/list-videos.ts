import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_videos",
  title: "List videos",
  description: "List videos on VidTube. Optionally filter to the signed-in user's own videos.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(10).describe("Max number of videos to return."),
    mine_only: z.boolean().default(false).describe("If true, return only the signed-in user's videos."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, mine_only }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let query = sb
      .from("videos")
      .select("id, title, description, views, likes, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (mine_only) query = query.eq("user_id", ctx.getUserId());
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { videos: data ?? [] },
    };
  },
});
