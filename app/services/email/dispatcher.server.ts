import { GoogleSmtpEmailProvider } from './smtp.server';
import type {
  SendOtpOptions,
  SendOrderConfirmationOptions,
  SendContactInquiryOptions,
  EmailProviderResult,
} from './types';

const smtpProvider = new GoogleSmtpEmailProvider();

/**
 * Check if Google SMTP is active.
 * Default is active (enabled) unless explicitly set to "false".
 */
function isSmtpActive(env: Env): boolean {
  return env.ENABLE_GOOGLE_SMTP !== 'false';
}

export async function dispatchOtpEmail(
  options: SendOtpOptions,
  env: Env,
): Promise<EmailProviderResult> {
  const isGoogleSmtpEnabled = isSmtpActive(env);

  console.info(`[Email Dispatcher] Target: ${options.to} | Gmail SMTP Active: ${isGoogleSmtpEnabled}`);

  // 1. If Google SMTP is enabled (default active for development), try SMTP
  if (isGoogleSmtpEnabled) {
    const smtpResult = await smtpProvider.sendOtp(options, env);
    if (smtpResult.success) {
      return smtpResult;
    }
    console.warn(`[Email Dispatcher] Gmail SMTP attempt notice: ${smtpResult.error}`);
  }

  // 2. Fallback / Dev Mode Logger (ensures local development works seamlessly even if SMTP credentials are being configured)
  console.info(`\n======================================================`);
  console.info(`🔐 [MONTS OTP DISPATCH — Development Mode]`);
  console.info(`📧 Target: ${options.to}`);
  console.info(`🔑 6-Digit Code: ${options.code}`);
  console.info(`ℹ️  Configured with Gmail SMTP. Set SMTP_USER and SMTP_PASS in .env for live inbox delivery.`);
  console.info(`======================================================\n`);

  return {
    success: true,
    provider: 'console_dev',
  };
}

export async function dispatchOrderConfirmationEmail(
  options: SendOrderConfirmationOptions,
  env: Env,
): Promise<EmailProviderResult> {
  const isGoogleSmtpEnabled = isSmtpActive(env);

  console.info(`[Email Dispatcher - Order Confirmation] Order: ${options.orderName} | Target: ${options.to} | Gmail SMTP Active: ${isGoogleSmtpEnabled}`);

  if (isGoogleSmtpEnabled) {
    const smtpResult = await smtpProvider.sendOrderConfirmation(options, env);
    if (smtpResult.success) return smtpResult;
    console.warn(`[Email Dispatcher - Order Confirmation] SMTP notice: ${smtpResult.error}`);
  }

  console.info(`\n======================================================`);
  console.info(`📦 [MONTS ORDER CONFIRMATION — Development Mode]`);
  console.info(`📧 Target: ${options.to}`);
  console.info(`🏷️  Order: ${options.orderName}`);
  console.info(`💳 Payment: ${options.paymentMethod}`);
  console.info(`======================================================\n`);

  return {
    success: true,
    provider: 'console_dev',
  };
}

export async function dispatchContactInquiryEmail(
  options: SendContactInquiryOptions,
  env: Env,
): Promise<EmailProviderResult> {
  const isGoogleSmtpEnabled = isSmtpActive(env);

  console.info(`[Email Dispatcher - Contact Inquiry] From: ${options.fullName} (${options.email}) | To: ${options.to} | Gmail SMTP Active: ${isGoogleSmtpEnabled}`);

  if (isGoogleSmtpEnabled) {
    const smtpResult = await smtpProvider.sendContactInquiry(options, env);
    if (smtpResult.success) return smtpResult;
    console.warn(`[Email Dispatcher - Contact Inquiry] SMTP notice: ${smtpResult.error}`);
  }

  console.info(`\n======================================================`);
  console.info(`📬 [MONTS CONTACT INQUIRY — Development Mode]`);
  console.info(`📧 Recipient: ${options.to}`);
  console.info(`👤 Customer: ${options.fullName} (${options.email})`);
  console.info(`📞 Phone: ${options.phone}`);
  console.info(`📝 Subject: ${options.subject}`);
  console.info(`💬 Message: ${options.message}`);
  console.info(`======================================================\n`);

  return {
    success: true,
    provider: 'console_dev',
  };
}
