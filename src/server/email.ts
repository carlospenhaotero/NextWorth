import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";

type PasswordResetEmailParams = {
  to: string;
  url: string;
  userName?: string | null;
};

export async function sendPasswordResetEmail({
  to,
  url,
  userName,
}: PasswordResetEmailParams): Promise<void> {
  // Dev fallback: without an API key, log the reset URL so the flow works
  // end-to-end locally without an email provider. Never throw here.
  if (!env.RESEND_API_KEY) {
    console.log(
      `[email] Password reset for ${to} (dev fallback, no RESEND_API_KEY):\n${url}`,
    );
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const from = env.EMAIL_FROM ?? "NextWorth <onboarding@resend.dev>";
  const greeting = userName ? `Hi ${userName},` : "Hi,";

  const html = `
  <div style="background-color:#0a0a0a;padding:40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background-color:#171717;border:1px solid #262626;border-radius:16px;padding:40px 32px;">
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">NextWorth</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#a3a3a3;">${greeting}</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#a3a3a3;">
        We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.
      </p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background-color:#ffffff;color:#0a0a0a;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;">
        Reset password
      </a>
      <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#737373;">
        If you didn't request this, you can safely ignore this email.
      </p>
      <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#737373;word-break:break-all;">
        Or paste this link into your browser:<br />
        <a href="${url}" style="color:#a3a3a3;">${url}</a>
      </p>
    </div>
  </div>`;

  const text = `${greeting}\n\nWe received a request to reset your password. Open the link below to choose a new one (expires in 1 hour):\n\n${url}\n\nIf you didn't request this, you can safely ignore this email.\n\nNextWorth`;

  await resend.emails.send({
    from,
    to,
    subject: "Reset your NextWorth password",
    html,
    text,
  });
}
