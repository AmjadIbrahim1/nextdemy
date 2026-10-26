import env from "@/configs/env";

export const courseEnrollmentEmail = (
  courseName: string,
  name: string,
  courseDescription: string,
  thumbnail: string
) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Course enrollment confirmed</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,sans-serif;color:#1f2937">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:32px">
        <h1 style="margin:0 0 8px;font-size:24px;text-align:center">Nextdemy</h1>
        <p style="margin:0 0 20px;color:#6b7280;text-align:center">Enrollment confirmed</p>
        <p>Dear ${name},</p>
        <p>
          You now have access to <strong>${courseName}</strong>.
        </p>
        <p style="color:#4b5563">${courseDescription}</p>
        ${
          thumbnail
            ? `<p style="margin:20px 0"><img src="${thumbnail}" alt="${courseName}" style="max-width:100%;border-radius:12px" /></p>`
            : ""
        }
        <p style="text-align:center;margin:28px 0">
          <a href="${env.FRONTEND_URL}/dashboard/enrolled-courses" style="display:inline-block;padding:12px 22px;background:#422faf;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold">
            Start learning
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px">
          If you did not create this enrollment, contact support immediately.
        </p>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:20px">
        Sent by ${env.EMAIL_FROM_NAME} &middot; ${env.FRONTEND_URL}
      </p>
    </div>
  </body>
</html>`;
