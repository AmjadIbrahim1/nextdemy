import env from "@/configs/env";

interface PaymentSuccessEmailInput {
  amount: string;
  paymentId: string;
  orderId: string;
  name: string;
  demo: boolean;
}

export const paymentSuccess = ({
  amount,
  paymentId,
  orderId,
  name,
  demo,
}: PaymentSuccessEmailInput): string => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Payment receipt</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,sans-serif;color:#1f2937">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:32px">
        <h1 style="margin:0 0 8px;font-size:24px;text-align:center">Nextdemy</h1>
        <p style="margin:0 0 20px;color:#6b7280;text-align:center">Payment received</p>
        ${
          demo
            ? '<p style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;padding:12px;border-radius:8px;font-size:13px">Demo payment: no real money was charged.</p>'
            : ""
        }
        <p>Dear ${name},</p>
        <p>Your payment of <strong>${amount}</strong> was successful.</p>
        <p>
          Payment ID: <strong>${paymentId}</strong><br />
          Order ID: <strong>${orderId}</strong>
        </p>
        <p style="text-align:center;margin:28px 0">
          <a href="${env.FRONTEND_URL}/dashboard/enrolled-courses" style="display:inline-block;padding:12px 22px;background:#422faf;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold">
            Go to my courses
          </a>
        </p>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:20px">
        Sent by ${env.EMAIL_FROM_NAME} &middot; ${env.FRONTEND_URL}
      </p>
    </div>
  </body>
</html>`;
