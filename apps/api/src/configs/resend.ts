import { Resend } from "resend";
import env from "./env";

// The SDK throws when constructed without a key, so keep it nullable and let
// the email utility decide whether delivery is configured.
export const resend = env.RESEND_API_KEY
  ? new Resend(env.RESEND_API_KEY)
  : null;
