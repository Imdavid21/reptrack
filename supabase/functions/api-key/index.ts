import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user with anon client
    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const method = req.method;

    if (method === "GET") {
      // Get user's API key
      const { data, error } = await supabaseAdmin
        .from("api_keys")
        .select("api_key, created_at, last_used_at")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (!data) {
        // Generate a new key if none exists
        const newKey = "ftrk_" + [...crypto.getRandomValues(new Uint8Array(24))]
          .map(b => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[b % 62])
          .join("")
          .slice(0, 32);

        const { data: insertedData, error: insertError } = await supabaseAdmin
          .from("api_keys")
          .insert({ user_id: user.id, api_key: newKey })
          .select("api_key, created_at, last_used_at")
          .single();

        if (insertError) throw insertError;

        return new Response(
          JSON.stringify({ ...insertedData, is_new: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (method === "POST") {
      // Regenerate API key
      const newKey = "ftrk_" + [...crypto.getRandomValues(new Uint8Array(24))]
        .map(b => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[b % 62])
        .join("")
        .slice(0, 32);

      // Delete old key and insert new one
      await supabaseAdmin
        .from("api_keys")
        .delete()
        .eq("user_id", user.id);

      const { data, error } = await supabaseAdmin
        .from("api_keys")
        .insert({ user_id: user.id, api_key: newKey })
        .select("api_key, created_at, last_used_at")
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ ...data, regenerated: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("API key error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
