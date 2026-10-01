import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

/**
 * Sends the app's few emails (password reset). Configure with
 * SMTP_URL — e.g. smtps://user:pass@smtp.example.com:465 — and MAIL_FROM.
 * Any SMTP provider works; Brevo and Resend both have free tiers.
 *
 * Without SMTP_URL (local dev, or a small beta where you'd rather pass
 * links on by hand) the email is written to the API log instead.
 */
@Injectable()
export class Mailer {
  private readonly log = new Logger('Mailer');
  private readonly transport: Transporter | null = process.env.SMTP_URL
    ? createTransport(process.env.SMTP_URL)
    : null;
  private readonly from = process.env.MAIL_FROM ?? 'gym-app <no-reply@localhost>';

  async send(to: string, subject: string, text: string): Promise<void> {
    if (!this.transport) {
      this.log.warn(`SMTP_URL not set — email to ${to} not sent. Contents:\n${subject}\n\n${text}`);
      return;
    }
    await this.transport.sendMail({ from: this.from, to, subject, text });
  }
}

/** Public base URL of the web app, for links in emails. */
export function appUrl(): string {
  return (process.env.APP_URL ?? process.env.WEB_ORIGIN ?? 'http://localhost:5173').replace(/\/$/, '');
}
