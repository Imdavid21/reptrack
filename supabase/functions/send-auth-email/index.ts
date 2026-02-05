import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailRequest {
  type: "password_reset" | "email_change";
  email: string;
  redirectUrl: string;
  newEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, email, redirectUrl, newEmail }: AuthEmailRequest = await req.json();

    if (!email || !redirectUrl) {
      throw new Error("Missing required fields: email and redirectUrl");
    }

    let subject: string;
    let html: string;

    if (type === "password_reset") {
      subject = "Reset Your Password - Reptrack Fitness";
      html = `
        <div style="font-family: monospace; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: bold; letter-spacing: 2px; margin-bottom: 24px;">Reptrack Fitness</h1>
          <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">PASSWORD RESET REQUEST</h2>
          <p style="font-size: 14px; color: #666; margin-bottom: 24px;">
            You requested to reset your password. Click the button below to set a new password:
          </p>
          <a href="${redirectUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 1px;">
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
            You requested to change your email${newEmail ? ` to ${newEmail}` : ''}. Click the button below to confirm:
          </p>
          <a href="${redirectUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 1px;">
            CONFIRM EMAIL CHANGE
          </a>
          <p style="font-size: 12px; color: #999; margin-top: 32px;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `;
    } else {
      throw new Error("Invalid email type");
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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
