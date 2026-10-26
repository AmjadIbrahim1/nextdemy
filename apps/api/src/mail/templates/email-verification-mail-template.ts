import env from "@/configs/env";

export const otpTemplate = (otp: string) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Verify your Nextdemy email</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,sans-serif;color:#1f2937">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;text-align:center">
        <h1 style="margin:0 0 8px;font-size:24px">Nextdemy</h1>
        <p style="margin:0 0 24px;color:#6b7280">Verify your email address</p>
        <div style="font-size:18px;font-weight:bold;margin-bottom:8px">Your one-time code</div>
        <div style="font-size:36px;letter-spacing:10px;font-weight:bold;color:#422faf;margin:16px 0">${otp}</div>
        <p style="margin:0;color:#6b7280;font-size:14px">
          This code expires in 5 minutes. If you did not request it, you can safely ignore this email.
        </p>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:20px">
        Sent by ${env.EMAIL_FROM_NAME} &middot; ${env.FRONTEND_URL}
      </p>
    </div>
  </body>
</html>`;

export const emailVerificationMailTemplate = otpTemplate;
