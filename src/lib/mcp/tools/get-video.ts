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
  name: "get_video",
  title: "Get video",
  description: "Fetch details of a single VidTube video by its ID, including comments.",
  inputSchema: {
    video_id: z.string().uuid().describe("The UUID of the video."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ video_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const [{ data: video, error: vErr }, { data: comments }] = await Promise.all([
      sb.from("videos").select("*").eq("id", video_id).maybeSingle(),
      sb.from("comments").select("id, content, user_id, created_at").eq("video_id", video_id).order("created_at", { ascending: false }).limit(20),
    ]);
    if (vErr) return { content: [{ type: "text", text: vErr.message }], isError: true };
    if (!video) return { content: [{ type: "text", text: "Video not found" }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify({ video, comments }) }],
      structuredContent: { video, comments: comments ?? [] },
    };
  },
});
