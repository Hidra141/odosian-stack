import nodemailer from "nodemailer";
import crypto from "crypto";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || "Odosian <noreply@odosian.com>";
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const TOKEN_EXPIRY_HOURS = 24;

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getTokenExpiry(): Date {
  return new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string
): Promise<boolean> {
  const verifyUrl = `${APP_URL}/verify?token=${token}`;

  try {
    await transporter.sendMail({
      from: FROM,
      to,
      subject: "Verify your Odosian account",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0B0F19;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background-color:#111827;border-radius:12px;border:1px solid #1E2D3D;overflow:hidden;">
    <div style="padding:32px 40px;border-bottom:1px solid #1E2D3D;">
      <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
        ODOSIAN
      </h1>
    </div>
    <div style="padding:40px;">
      <h2 style="margin:0 0 16px;color:#FFFFFF;font-size:20px;font-weight:600;">
        Verify your email address
      </h2>
      <p style="margin:0 0 24px;color:#94A3B8;font-size:15px;line-height:1.6;">
        Hi ${name},<br><br>
        Thanks for creating an Odosian account. Click the button below to verify your email address and activate your account.
      </p>
      <a href="${verifyUrl}" style="display:inline-block;padding:12px 32px;background-color:#4CBDFA;color:#0B0F19;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
        Verify Email
      </a>
      <p style="margin:24px 0 0;color:#64748B;font-size:13px;line-height:1.5;">
        This link expires in ${TOKEN_EXPIRY_HOURS} hours. If you didn't create an account, you can safely ignore this email.
      </p>
      <hr style="margin:32px 0;border:none;border-top:1px solid #1E2D3D;">
      <p style="margin:0;color:#64748B;font-size:12px;line-height:1.5;">
        If the button doesn't work, copy and paste this URL into your browser:<br>
        <a href="${verifyUrl}" style="color:#4CBDFA;word-break:break-all;">${verifyUrl}</a>
      </p>
    </div>
  </div>
</body>
</html>`,
    });
    return true;
  } catch (e) {
    console.error("Failed to send verification email:", e);
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV] Verification link: ${verifyUrl}`);
    }
    return false;
  }
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string
): Promise<boolean> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  try {
    await transporter.sendMail({
      from: FROM,
      to,
      subject: "Reset your Odosian password",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin:0;padding:0;background-color:#0B0F19;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background-color:#111827;border-radius:12px;border:1px solid #1E2D3D;overflow:hidden;">
    <div style="padding:32px 40px;border-bottom:1px solid #1E2D3D;">
      <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:700;">ODOSIAN</h1>
    </div>
    <div style="padding:40px;">
      <h2 style="margin:0 0 16px;color:#FFFFFF;font-size:20px;font-weight:600;">Reset your password</h2>
      <p style="margin:0 0 24px;color:#94A3B8;font-size:15px;line-height:1.6;">
        Hi ${name},<br><br>
        We received a request to reset your password. Click below to set a new one.
      </p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 32px;background-color:#4CBDFA;color:#0B0F19;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
        Reset Password
      </a>
      <p style="margin:24px 0 0;color:#64748B;font-size:13px;line-height:1.5;">
        This link expires in 1 hour. If you didn't request this, ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`,
    });
    return true;
  } catch (e) {
    console.error("Failed to send password reset email:", e);
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV] Password reset link: ${resetUrl}`);
    }
    return false;
  }
}
