import "server-only";
import { after, NextResponse } from "next/server";
import { generateOtpCode, type SendEmailResult } from "./email";
import { REGISTER_REQUEST_MESSAGE, RESET_REQUEST_MESSAGE } from "./auth-messages";

type Kind = "register" | "reset";
type Operation = (code: string) => Promise<SendEmailResult | void>;

/** Return before account lookup/delivery in production, so SMTP latency and
 * account-specific branches cannot change the public response or its timing. */
export async function acceptAuthChallenge(kind: Kind, operation: Operation) {
  const message = kind === "register" ? REGISTER_REQUEST_MESSAGE : RESET_REQUEST_MESSAGE;
  const run = async (code: string) => {
    try { return await operation(code); }
    catch { console.error(`[auth] ${kind} kod talebi arka planda tamamlanamadı.`); }
  };
  if (process.env.NODE_ENV === "production") {
    after(async () => { await run(generateOtpCode()); });
    return NextResponse.json({ success: true, message }, { headers: { "Cache-Control": "private, no-store" } });
  }
  // Local testing stays available without SMTP. Dummy responses get an equally
  // shaped dummy code; it is never stored for an ineligible account.
  const code = generateOtpCode();
  const result = await run(code);
  return NextResponse.json({ success: true, message, realEmailSent: !!result?.realEmailSent,
    devCode: result?.realEmailSent ? undefined : code }, { headers: { "Cache-Control": "private, no-store" } });
}
