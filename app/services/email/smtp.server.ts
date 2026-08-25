import type { IEmailProvider, SendOtpOptions, EmailProviderResult } from './types';
import { generateOtpEmailHtml } from './types';

export class GoogleSmtpEmailProvider implements IEmailProvider {
  name = 'google_smtp' as const;

  async sendOtp(options: SendOtpOptions, env: Env): Promise<EmailProviderResult> {
    const host = env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(env.SMTP_PORT) || 465;
    const user = env.SMTP_USER;
    const pass = env.SMTP_PASS;

    if (!user || !pass || pass.includes('xxxx')) {
      return {
        success: false,
        provider: this.name,
        error: 'SMTP_USER or SMTP_PASS is missing or contains placeholder in environment.',
      };
    }

    const from = env.SMTP_FROM || `MONTS <${user}>`;
    const emailHtml = generateOtpEmailHtml(options.code);

    try {
      // Dynamically import nodemailer only at runtime to prevent worker bundle evaluation crashes on Edge/Oxygen
      const nodemailer = await import('nodemailer');
      const createTransport = nodemailer.default?.createTransport || nodemailer.createTransport;

      if (!createTransport) {
        throw new Error('Nodemailer createTransport is not available in current runtime.');
      }

      const transporter = createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });

      const info = await transporter.sendMail({
        from,
        to: options.to,
        subject: `${options.code} is your MONTS Verification Code`,
        html: emailHtml,
      });

      console.info(`[Google SMTP] OTP email sent successfully to ${options.to} (MessageID: ${info?.messageId || 'ok'})`);
      return { success: true, provider: this.name };
    } catch (error: any) {
      console.warn('[Google SMTP Warning]', error?.message || error);
      return {
        success: false,
        provider: this.name,
        error: error?.message || 'SMTP is not supported in this Edge worker runtime. Use HTTP email provider (Resend).',
      };
    }
  }
}
