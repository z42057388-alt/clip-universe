import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPPORT_USER_ID = "a3cda48f-8a2e-4137-97cd-07713b7366c4";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) throw new Error("Invalid token");

    // Don't create support chat for the support account itself
    if (user.id === SUPPORT_USER_ID) {
      return new Response(JSON.stringify({ conversation_id: null, message: "Support account" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if support conversation already exists
    const { data: existing } = await supabase
      .from("chat_conversations")
      .select("id")
      .or(`and(requester_id.eq.${user.id},recipient_id.eq.${SUPPORT_USER_ID}),and(requester_id.eq.${SUPPORT_USER_ID},recipient_id.eq.${user.id})`)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ conversation_id: existing[0].id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create support conversation (auto-accepted)
    const { data: conv, error: convError } = await supabase
      .from("chat_conversations")
      .insert({
        requester_id: user.id,
        recipient_id: SUPPORT_USER_ID,
        status: "accepted",
      })
      .select("id")
      .single();

    if (convError) throw convError;

    // Send welcome message from support
    await supabase.from("chat_messages").insert({
      conversation_id: conv.id,
      sender_id: SUPPORT_USER_ID,
      content: "👋 Здравствуйте! Добро пожаловать в техническую поддержку VidTube. Опишите вашу проблему, и мы постараемся помочь!",
    });

    return new Response(JSON.stringify({ conversation_id: conv.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ensure-support-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
