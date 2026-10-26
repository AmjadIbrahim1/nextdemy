import env from "@/configs/env";
import { resend } from "@/configs/resend";
import { ApiError } from "@/shared/utils/api-error";
import { logger } from "./logger";

export interface EmailResult {
  id?: string;
  skipped?: boolean;
}

/**
 * Sends an email through Resend when configured. In test/development without a
 * key the call is a no-op so flows can be exercised locally; production fails
 * loudly instead of pretending an email was delivered.
 */
export async function sendEmail(
  email: string,
  title: string,
  body: string
): Promise<EmailResult> {
  if (!(env.RESEND_API_KEY && resend)) {
    if (env.IS_PRODUCTION) {
      throw ApiError.serviceUnavailable(
        "Email delivery is not configured. Set RESEND_API_KEY on the server."
      );
    }

    logger.warn(
      { recipient: email, subject: title },
      "Email skipped because RESEND_API_KEY is not set"
    );
    return { skipped: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`,
      to: [email],
      subject: title,
      html: body,
    });

    if (error) {
      logger.error({ name: error.name }, "Resend rejected the email");
      throw ApiError.badGateway("Email delivery failed");
    }

    logger.info({ id: data?.id }, "Email sent");
    return { id: data?.id };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error({ error }, "Unexpected email delivery error");
    throw ApiError.badGateway("Email delivery failed");
  }
}
