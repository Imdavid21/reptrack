import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const TRUSTED_REDIRECT_ORIGINS = [
  "https://reps-and-reminders.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  };
}

interface AuthEmailRequest {
  type: "password_reset" | "email_change";
  email: string;
  redirectUrl: string;
  newEmail?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function verifyJwtUser(authHeader: string | null): Promise<{ id: string; email: string | null } | null> {
  if (!authHeader) return null;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: anonKey },
    });
    if (!res.ok) return null;
    const user = await res.json();
    if (!user?.id) return null;
    return { id: user.id, email: user.email ?? null };
  } catch {
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require a valid Supabase JWT — prevents anonymous email-spam abuse
    const authUser = await verifyJwtUser(req.headers.get("authorization"));
    if (!authUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...getCorsHeaders() } }
      );
    }

    const { type, email, redirectUrl, newEmail }: AuthEmailRequest = await req.json();

    // Only allow sending auth emails to the authenticated user's own address
    if (!authUser.email || authUser.email.toLowerCase() !== String(email).toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!email || !redirectUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email and redirectUrl" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate redirectUrl against allowed origins to prevent open redirect / phishing
    try {
      const url = new URL(redirectUrl);
      const origin = url.origin;
      if (!TRUSTED_REDIRECT_ORIGINS.includes(origin)) {
        console.error("Rejected redirect URL with untrusted origin:", origin);
        return new Response(
          JSON.stringify({ error: "Invalid redirect URL" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid redirect URL format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (type !== "password_reset" && type !== "email_change") {
      return new Response(
        JSON.stringify({ error: "Invalid email type" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let subject!: string;
    let html!: string;

    if (type === "password_reset") {
      subject = "Reset Your Password - Reptrack Fitness";
      html = `
        <div style="font-family: monospace; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: bold; letter-spacing: 2px; margin-bottom: 24px;">Reptrack Fitness</h1>
          <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">PASSWORD RESET REQUEST</h2>
          <p style="font-size: 14px; color: #666; margin-bottom: 24px;">
            You requested to reset your password. Click the button below to set a new password:
          </p>
          <a href="${escapeHtml(redirectUrl)}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 1px;">
            RESET PASSWORD
          </a>
          <p style="font-size: 12px; color: #999; margin-top: 32px;">
            If you didn't request this, you can safely ignore this email.<br/>
            This link will expire in 1 hour.
          </p>
        </div>
      `;
    } else if (type === "email_change") {
      subject = "Confirm Email Change - Reptrack Fitness";
      html = `
        <div style="font-family: monospace; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: bold; letter-spacing: 2px; margin-bottom: 24px;">Reptrack Fitness</h1>
          <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">EMAIL CHANGE CONFIRMATION</h2>
          <p style="font-size: 14px; color: #666; margin-bottom: 24px;">
            You requested to change your email${newEmail ? ` to ${escapeHtml(newEmail)}` : ''}. Click the button below to confirm:
          </p>
          <a href="${escapeHtml(redirectUrl)}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 1px;">
            CONFIRM EMAIL CHANGE
          </a>
          <p style="font-size: 12px; color: #999; margin-top: 32px;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `;
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Note: Replace with your verified Resend domain
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Reptrack Fitness <${fromEmail}>`,
        to: [email],
        subject,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to send email");
    }

    console.log("Auth email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-auth-email function:", error);
    // Log the detail server-side; return a generic message to the client.
    return new Response(
      JSON.stringify({ error: "Failed to send email. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
