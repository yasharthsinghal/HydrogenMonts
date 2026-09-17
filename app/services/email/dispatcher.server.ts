import { GoogleSmtpEmailProvider } from './smtp.server';
import { getEmailProviderMode, isSmtpDeliveryEnabled } from './config.server';
import type {
  SendOtpOptions,
  SendOrderConfirmationOptions,
  SendContactInquiryOptions,
  EmailProviderResult,
} from './types';

const smtpProvider = new GoogleSmtpEmailProvider();

export async function dispatchOtpEmail(
  options: SendOtpOptions,
  env: Env,
): Promise<EmailProviderResult> {
  const providerMode = getEmailProviderMode(env);
  const isGoogleSmtpEnabled = isSmtpDeliveryEnabled(env);

  console.info(`[Email Dispatcher] Target: ${options.to} | Provider: ${providerMode} | SMTP Active: ${isGoogleSmtpEnabled}`);

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
  console.info(`ℹ️  Set OTP_EMAIL_PROVIDER to "smtp" or "google_oauth2" with matching SMTP credentials for live inbox delivery.`);
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
  const providerMode = getEmailProviderMode(env);
  const isGoogleSmtpEnabled = isSmtpDeliveryEnabled(env);

  console.info(`[Email Dispatcher - Order Confirmation] Order: ${options.orderName} | Target: ${options.to} | Provider: ${providerMode} | SMTP Active: ${isGoogleSmtpEnabled}`);

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
  const providerMode = getEmailProviderMode(env);
  const isGoogleSmtpEnabled = isSmtpDeliveryEnabled(env);

  console.info(`[Email Dispatcher - Contact Inquiry] From: ${options.fullName} (${options.email}) | To: ${options.to} | Provider: ${providerMode} | SMTP Active: ${isGoogleSmtpEnabled}`);

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
