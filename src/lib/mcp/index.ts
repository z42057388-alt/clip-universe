import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listVideosTool from "./tools/list-videos";
import getVideoTool from "./tools/get-video";
import postCommentTool from "./tools/post-comment";
import myProfileTool from "./tools/my-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "vidtube-mcp",
  title: "VidTube MCP",
  version: "0.1.0",
  instructions:
    "Tools for VidTube — a video platform. Use list_videos and get_video to browse content, post_comment to comment as the signed-in user, and my_profile for the current account.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listVideosTool, getVideoTool, postCommentTool, myProfileTool],
});
