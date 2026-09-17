import type { IEmailProvider, SendOtpOptions, SendOrderConfirmationOptions, SendContactInquiryOptions, EmailProviderResult } from './types';
import { generateOtpEmailHtml, generateOrderConfirmationHtml, generateContactInquiryHtml } from './types';
import { getEmailProviderMode } from './config.server';

type SmtpAuthConfig = Record<string, string>;

interface SmtpTransportSettings {
  host: string;
  port: number;
  user: string;
  auth: SmtpAuthConfig;
}

function hasPlaceholder(value: string): boolean {
  return value.includes('xxxx') || value.includes('your_');
}

function getSmtpTransportSettings(env: Env): SmtpTransportSettings | EmailProviderResult {
  const host = env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(env.SMTP_PORT) || 465;
  const user = env.SMTP_USER?.trim();
  const providerMode = getEmailProviderMode(env);

  if (!user || hasPlaceholder(user)) {
    return {
      success: false,
      provider: 'google_smtp',
      error: 'SMTP_USER is missing or contains placeholder in environment.',
    };
  }

  if (providerMode === 'google_oauth2') {
    const clientId = env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
    const refreshToken = env.GOOGLE_REFRESH_TOKEN?.trim();

    if (
      !clientId ||
      !clientSecret ||
      !refreshToken ||
      hasPlaceholder(clientId) ||
      hasPlaceholder(clientSecret) ||
      hasPlaceholder(refreshToken)
    ) {
      return {
        success: false,
        provider: 'google_oauth2',
        error: 'Google OAuth2 SMTP credentials are missing or contain placeholder values.',
      };
    }

    return {
      host,
      port,
      user,
      auth: {
        type: 'OAuth2',
        user,
        clientId,
        clientSecret,
        refreshToken,
      },
    };
  }

  const pass = env.SMTP_PASS?.replace(/\s+/g, '');
  if (!pass || hasPlaceholder(pass)) {
    return {
      success: false,
      provider: 'google_smtp',
      error: 'SMTP_PASS is missing or contains placeholder in environment.',
    };
  }

  return {
    host,
    port,
    user,
    auth: {
      user,
      pass,
    },
  };
}

function isEmailProviderResult(
  settings: SmtpTransportSettings | EmailProviderResult,
): settings is EmailProviderResult {
  return 'success' in settings;
}

export class GoogleSmtpEmailProvider implements IEmailProvider {
  name = 'google_smtp' as const;

  private getResultProvider(env: Env): EmailProviderResult['provider'] {
    return getEmailProviderMode(env) === 'google_oauth2' ? 'google_oauth2' : this.name;
  }

  async sendOtp(options: SendOtpOptions, env: Env): Promise<EmailProviderResult> {
    const settings = getSmtpTransportSettings(env);
    if (isEmailProviderResult(settings)) {
      return settings;
    }

    const from = env.SMTP_FROM || `MONTS <${settings.user}>`;
    const emailHtml = generateOtpEmailHtml(options.code);

    try {
      // Dynamically import nodemailer only at runtime to prevent worker bundle evaluation crashes on Edge/Oxygen
      const nodemailer = await import('nodemailer');
      const createTransport = nodemailer.default?.createTransport || nodemailer.createTransport;

      if (!createTransport) {
        throw new Error('Nodemailer createTransport is not available in current runtime.');
      }

      const transporter = createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.port === 465,
        auth: settings.auth,
      });

      const info = await transporter.sendMail({
        from,
        to: options.to,
        subject: `${options.code} is your MONTS Verification Code`,
        html: emailHtml,
      });

      console.info(`[Google SMTP] OTP email sent successfully to ${options.to} (MessageID: ${info?.messageId || 'ok'})`);
      return { success: true, provider: this.getResultProvider(env) };
    } catch (error: any) {
      console.warn('[Google SMTP Warning]', error?.message || error);
      return {
        success: false,
        provider: this.getResultProvider(env),
        error: error?.message || 'Failed to dispatch OTP via Google SMTP.',
      };
    }
  }

  async sendOrderConfirmation(options: SendOrderConfirmationOptions, env: Env): Promise<EmailProviderResult> {
    const settings = getSmtpTransportSettings(env);
    if (isEmailProviderResult(settings)) {
      return settings;
    }

    const from = env.SMTP_FROM || `MONTS <${settings.user}>`;
    const emailHtml = generateOrderConfirmationHtml(options);

    try {
      const nodemailer = await import('nodemailer');
      const createTransport = nodemailer.default?.createTransport || nodemailer.createTransport;

      if (!createTransport) {
        throw new Error('Nodemailer createTransport is not available.');
      }

      const transporter = createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.port === 465,
        auth: settings.auth,
      });

      const info = await transporter.sendMail({
        from,
        to: options.to,
        subject: `MONTS Order Confirmed: ${options.orderName}`,
        html: emailHtml,
      });

      console.info(`[Google SMTP] Order confirmation sent to ${options.to} (${info?.messageId || 'ok'})`);
      return { success: true, provider: this.getResultProvider(env) };
    } catch (error: any) {
      return {
        success: false,
        provider: this.getResultProvider(env),
        error: error?.message || 'Failed to dispatch via SMTP',
      };
    }
  }

  async sendContactInquiry(options: SendContactInquiryOptions, env: Env): Promise<EmailProviderResult> {
    const settings = getSmtpTransportSettings(env);
    if (isEmailProviderResult(settings)) {
      return settings;
    }

    const from = env.SMTP_FROM || `MONTS Support <${settings.user}>`;
    const emailHtml = generateContactInquiryHtml(options);

    try {
      const nodemailer = await import('nodemailer');
      const createTransport = nodemailer.default?.createTransport || nodemailer.createTransport;

      if (!createTransport) {
        throw new Error('Nodemailer createTransport is not available.');
      }

      const transporter = createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.port === 465,
        auth: settings.auth,
      });

      const info = await transporter.sendMail({
        from,
        to: options.to,
        replyTo: `${options.fullName} <${options.email}>`,
        subject: `[MONTS Contact Form] ${options.subject}`,
        html: emailHtml,
      });

      console.info(`[Google SMTP] Contact inquiry sent to ${options.to} from ${options.email} (${info?.messageId || 'ok'})`);
      return { success: true, provider: this.getResultProvider(env) };
    } catch (error: any) {
      console.warn('[Google SMTP Contact Error]', error?.message || error);
      return {
        success: false,
        provider: this.getResultProvider(env),
        error: error?.message || 'Failed to dispatch contact inquiry via SMTP',
      };
    }
  }
}

