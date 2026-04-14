/**
 * Email sending utility.
 * Uses Resend (https://resend.com) for transactional email.
 * Set RESEND_API_KEY and EMAIL_FROM in environment variables.
 *
 * Falls back to console.log if RESEND_API_KEY is not configured,
 * so the digest logic can run in dev without email infra.
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Manifest <digest@manifest.build>";

  if (!apiKey) {
    console.log("[Email] RESEND_API_KEY not set — logging email instead:");
    console.log(`  To: ${params.to}`);
    console.log(`  Subject: ${params.subject}`);
    console.log(`  Body: ${params.html.slice(0, 200)}...`);
    return true;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("[Email] Send failed:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Email] Send error:", error);
    return false;
  }
}
