import env from "@/configs/env";

export const passwordUpdated = (email: string, name: string) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Password updated</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,sans-serif;color:#1f2937">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:32px">
        <h1 style="margin:0 0 8px;font-size:24px;text-align:center">Nextdemy</h1>
        <p style="margin:0 0 20px;color:#6b7280;text-align:center">Password updated</p>
        <p>Hi ${name},</p>
        <p>The password for <strong>${email}</strong> was updated successfully.</p>
        <p style="color:#6b7280;font-size:13px">
          If you did not make this change, reset your password immediately or contact support.
        </p>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:20px">
        Sent by ${env.EMAIL_FROM_NAME} &middot; ${env.FRONTEND_URL}
      </p>
    </div>
  </body>
</html>`;
