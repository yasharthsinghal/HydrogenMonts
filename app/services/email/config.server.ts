export type EmailProviderMode = 'smtp' | 'google_oauth2' | 'console_dev';

export function getEmailProviderMode(env: Env): EmailProviderMode {
  if (env.OTP_EMAIL_PROVIDER === 'google_oauth2') {
    return 'google_oauth2';
  }

  if (env.OTP_EMAIL_PROVIDER === 'console_dev') {
    return 'console_dev';
  }

  return 'smtp';
}

export function isSmtpDeliveryEnabled(env: Env): boolean {
  return getEmailProviderMode(env) !== 'console_dev';
}
