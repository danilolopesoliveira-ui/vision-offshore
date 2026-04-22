import { Resend } from "resend";
import type React from "react";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY not set");
    _resend = new Resend(key);
  }
  return _resend;
}

const FROM = process.env.EMAIL_FROM ?? "Vision Offshore <no-reply@gennesys.com.br>";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const { error } = await getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    react: opts.react,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
