import { ResendEmailProvider } from './resend.server';
import { GoogleSmtpEmailProvider } from './smtp.server';
import type { SendOtpOptions, EmailProviderResult } from './types';

const resendProvider = new ResendEmailProvider();
const smtpProvider = new GoogleSmtpEmailProvider();

export async function dispatchOtpEmail(
  options: SendOtpOptions,
  env: Env,
): Promise<EmailProviderResult> {
  const isGoogleSmtpEnabled =
    env.ENABLE_GOOGLE_SMTP === 'true' ||
    env.OTP_EMAIL_PROVIDER === 'smtp' ||
    env.OTP_EMAIL_PROVIDER === 'google_smtp';

  const isResendEnabled =
    env.ENABLE_RESEND === 'true' || env.OTP_EMAIL_PROVIDER === 'resend';

  console.info(`[Email Dispatcher] Target: ${options.to} | SMTP Enabled: ${isGoogleSmtpEnabled} | Resend Enabled: ${isResendEnabled}`);

  // 1. If Google SMTP is explicitly enabled, try SMTP first
  if (isGoogleSmtpEnabled) {
    const smtpResult = await smtpProvider.sendOtp(options, env);
    if (smtpResult.success) {
      return smtpResult;
    }
    console.warn(`[Email Dispatcher] SMTP attempt failed: ${smtpResult.error}. Checking fallback.`);
  }

  // 2. If Resend is enabled, try Resend
  if (isResendEnabled || (!isGoogleSmtpEnabled && env.RESEND_API_KEY && !env.RESEND_API_KEY.includes('PASTE_YOUR'))) {
    const resendResult = await resendProvider.sendOtp(options, env);
    if (resendResult.success) {
      return resendResult;
    }
    console.warn(`[Email Dispatcher] Resend attempt failed: ${resendResult.error}.`);
  }

  // 3. Fallback / Dev Mode Logger (so local development never breaks even if credentials aren't set)
  console.info(`\n======================================================`);
  console.info(`🔐 [MONTS OTP DISPATCH — Development Mode]`);
  console.info(`📧 Target: ${options.to}`);
  console.info(`🔑 6-Digit Code: ${options.code}`);
  console.info(`ℹ️  Configure ENABLE_GOOGLE_SMTP="true" or ENABLE_RESEND="true" in .env for live inbox delivery.`);
  console.info(`======================================================\n`);

  return {
    success: true,
    provider: 'console_dev',
  };
}
