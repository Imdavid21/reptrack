import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  };
}

function generateRawKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return "ftrk_" + [...bytes].map((b) => alphabet[b % 62]).join("").slice(0, 32);
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const method = req.method;

    if (method === "GET") {
      // Return only safe metadata. The plaintext key is never stored, only the hash.
      const { data, error } = await supabaseAdmin
        .from("api_keys")
        .select("key_prefix, created_at, last_used_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // First-time provisioning: generate, store hash, return plaintext ONCE.
        const rawKey = generateRawKey();
        const keyHash = await sha256Hex(rawKey);
        const keyPrefix = rawKey.slice(0, 12);

        const { data: insertedData, error: insertError } = await supabaseAdmin
          .from("api_keys")
          .insert({ user_id: user.id, key_hash: keyHash, key_prefix: keyPrefix })
          .select("key_prefix, created_at, last_used_at")
          .single();

        if (insertError) throw insertError;

        return new Response(
          JSON.stringify({ ...insertedData, api_key: rawKey, is_new: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Existing key: return metadata only, never the secret.
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (method === "POST") {
      // Regenerate: create new key, store hash, return plaintext ONCE.
      const rawKey = generateRawKey();
      const keyHash = await sha256Hex(rawKey);
      const keyPrefix = rawKey.slice(0, 12);

      await supabaseAdmin.from("api_keys").delete().eq("user_id", user.id);

      const { data, error } = await supabaseAdmin
        .from("api_keys")
        .insert({ user_id: user.id, key_hash: keyHash, key_prefix: keyPrefix })
        .select("key_prefix, created_at, last_used_at")
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ ...data, api_key: rawKey, regenerated: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("API key error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
