/**
 * Per-user rate limiting for the AI edge functions (cost-abuse protection).
 *
 * Calls the SECURITY DEFINER `check_rate_limit` RPC with the caller's JWT so
 * `auth.uid()` resolves server-side. Fails OPEN: if the limiter itself errors
 * we allow the request rather than block a paying user on a logging path.
 */
export async function checkRateLimit(opts: {
  supabaseUrl: string;
  anonKey: string;
  authHeader: string;
  bucket: string;
  max: number;
  windowSeconds: number;
}): Promise<boolean> {
  try {
    const res = await fetch(`${opts.supabaseUrl}/rest/v1/rpc/check_rate_limit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: opts.authHeader,
        apikey: opts.anonKey,
      },
      body: JSON.stringify({
        p_bucket: opts.bucket,
        p_max: opts.max,
        p_window_seconds: opts.windowSeconds,
      }),
    });
    if (!res.ok) return true; // fail-open
    const allowed = await res.json();
    return allowed === true;
  } catch {
    return true; // fail-open
  }
}

export function rateLimitResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Rate limit exceeded. Please slow down and try again in a moment." }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
