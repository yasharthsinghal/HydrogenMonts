import type { IEmailProvider, SendOtpOptions, SendOrderConfirmationOptions, SendContactInquiryOptions, EmailProviderResult } from './types';
import { generateOtpEmailHtml, generateOrderConfirmationHtml, generateContactInquiryHtml } from './types';

export class ResendEmailProvider implements IEmailProvider {
  name = 'resend' as const;

  async sendOtp(options: SendOtpOptions, env: Env): Promise<EmailProviderResult> {
    const apiKey = env.RESEND_API_KEY;
    if (!apiKey || apiKey.includes('PASTE_YOUR')) {
      return {
        success: false,
        provider: this.name,
        error: 'RESEND_API_KEY is not configured or contains placeholder.',
      };
    }

    const from = env.RESEND_FROM_EMAIL || 'MONTS <onboarding@resend.dev>';
    const emailHtml = generateOtpEmailHtml(options.code);

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [options.to],
          subject: `${options.code} is your MONTS Verification Code`,
          html: emailHtml,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error('[Resend Error]', response.status, body);
        return {
          success: false,
          provider: this.name,
          error: `Resend API failed (HTTP ${response.status})`,
        };
      }

      console.info(`[Resend] OTP email successfully dispatched to ${options.to}`);
      return { success: true, provider: this.name };
    } catch (error: any) {
      console.error('[Resend Exception]', error?.message);
      return {
        success: false,
        provider: this.name,
        error: error?.message || 'Network error connecting to Resend',
      };
    }
  }

  async sendOrderConfirmation(options: SendOrderConfirmationOptions, env: Env): Promise<EmailProviderResult> {
    const apiKey = env.RESEND_API_KEY;
    if (!apiKey || apiKey.includes('PASTE_YOUR')) {
      return {
        success: false,
        provider: this.name,
        error: 'RESEND_API_KEY is not configured.',
      };
    }

    const from = env.RESEND_FROM_EMAIL || 'MONTS <onboarding@resend.dev>';
    const emailHtml = generateOrderConfirmationHtml(options);

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [options.to],
          subject: `MONTS Order Confirmed: ${options.orderName}`,
          html: emailHtml,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error('[Resend Error]', response.status, body);
        return {
          success: false,
          provider: this.name,
          error: `Resend API failed (HTTP ${response.status})`,
        };
      }

      console.info(`[Resend] Order confirmation dispatched to ${options.to} for ${options.orderName}`);
      return { success: true, provider: this.name };
    } catch (error: any) {
      console.error('[Resend Exception]', error?.message);
      return {
        success: false,
        provider: this.name,
        error: error?.message || 'Network error connecting to Resend',
      };
    }
  }

  async sendContactInquiry(options: SendContactInquiryOptions, env: Env): Promise<EmailProviderResult> {
    const apiKey = env.RESEND_API_KEY;
    if (!apiKey || apiKey.includes('PASTE_YOUR')) {
      return {
        success: false,
        provider: this.name,
        error: 'RESEND_API_KEY is not configured.',
      };
    }

    const from = env.RESEND_FROM_EMAIL || 'MONTS Support <onboarding@resend.dev>';
    const emailHtml = generateContactInquiryHtml(options);

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [options.to],
          reply_to: options.email,
          subject: `[MONTS Contact Form] ${options.subject}`,
          html: emailHtml,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error('[Resend Contact Error]', response.status, body);
        return {
          success: false,
          provider: this.name,
          error: `Resend API failed (HTTP ${response.status})`,
        };
      }

      console.info(`[Resend] Contact inquiry dispatched to ${options.to} for "${options.subject}"`);
      return { success: true, provider: this.name };
    } catch (error: any) {
      console.error('[Resend Contact Exception]', error?.message);
      return {
        success: false,
        provider: this.name,
        error: error?.message || 'Network error connecting to Resend',
      };
    }
  }
}

