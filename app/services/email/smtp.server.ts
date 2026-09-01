import type { IEmailProvider, SendOtpOptions, SendOrderConfirmationOptions, SendContactInquiryOptions, EmailProviderResult } from './types';
import { generateOtpEmailHtml, generateOrderConfirmationHtml, generateContactInquiryHtml } from './types';

export class GoogleSmtpEmailProvider implements IEmailProvider {
  name = 'google_smtp' as const;

  async sendOtp(options: SendOtpOptions, env: Env): Promise<EmailProviderResult> {
    const host = env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(env.SMTP_PORT) || 465;
    const user = env.SMTP_USER?.trim();
    const pass = env.SMTP_PASS?.replace(/\s+/g, '');

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
        error: error?.message || 'Failed to dispatch OTP via Google SMTP.',
      };
    }
  }

  async sendOrderConfirmation(options: SendOrderConfirmationOptions, env: Env): Promise<EmailProviderResult> {
    const host = env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(env.SMTP_PORT) || 465;
    const user = env.SMTP_USER?.trim();
    const pass = env.SMTP_PASS?.replace(/\s+/g, '');

    if (!user || !pass || pass.includes('xxxx')) {
      return {
        success: false,
        provider: this.name,
        error: 'SMTP credentials missing or contains placeholder.',
      };
    }

    const from = env.SMTP_FROM || `MONTS <${user}>`;
    const emailHtml = generateOrderConfirmationHtml(options);

    try {
      const nodemailer = await import('nodemailer');
      const createTransport = nodemailer.default?.createTransport || nodemailer.createTransport;

      if (!createTransport) {
        throw new Error('Nodemailer createTransport is not available.');
      }

      const transporter = createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      const info = await transporter.sendMail({
        from,
        to: options.to,
        subject: `MONTS Order Confirmed: ${options.orderName}`,
        html: emailHtml,
      });

      console.info(`[Google SMTP] Order confirmation sent to ${options.to} (${info?.messageId || 'ok'})`);
      return { success: true, provider: this.name };
    } catch (error: any) {
      return {
        success: false,
        provider: this.name,
        error: error?.message || 'Failed to dispatch via SMTP',
      };
    }
  }

  async sendContactInquiry(options: SendContactInquiryOptions, env: Env): Promise<EmailProviderResult> {
    const host = env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(env.SMTP_PORT) || 465;
    const user = env.SMTP_USER?.trim();
    const pass = env.SMTP_PASS?.replace(/\s+/g, '');

    if (!user || !pass || pass.includes('xxxx')) {
      return {
        success: false,
        provider: this.name,
        error: 'SMTP credentials missing or contains placeholder.',
      };
    }

    const from = env.SMTP_FROM || `MONTS Support <${user}>`;
    const emailHtml = generateContactInquiryHtml(options);

    try {
      const nodemailer = await import('nodemailer');
      const createTransport = nodemailer.default?.createTransport || nodemailer.createTransport;

      if (!createTransport) {
        throw new Error('Nodemailer createTransport is not available.');
      }

      const transporter = createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      const info = await transporter.sendMail({
        from,
        to: options.to,
        replyTo: `${options.fullName} <${options.email}>`,
        subject: `[MONTS Contact Form] ${options.subject}`,
        html: emailHtml,
      });

      console.info(`[Google SMTP] Contact inquiry sent to ${options.to} from ${options.email} (${info?.messageId || 'ok'})`);
      return { success: true, provider: this.name };
    } catch (error: any) {
      console.warn('[Google SMTP Contact Error]', error?.message || error);
      return {
        success: false,
        provider: this.name,
        error: error?.message || 'Failed to dispatch contact inquiry via SMTP',
      };
    }
  }
}

