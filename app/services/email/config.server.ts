export type EmailProviderMode = 'smtp' | 'google_oauth2' | 'console_dev';

export function getEmailProviderMode(env: Env): EmailProviderMode {
  const configuredProvider = env.OTP_EMAIL_PROVIDER?.trim().toLowerCase();

  if (
    configuredProvider === 'google_oauth2' ||
    configuredProvider === 'googleoauth' ||
    configuredProvider === 'google_oauth'
  ) {
    return 'google_oauth2';
  }

  if (configuredProvider === 'console_dev') {
    return 'console_dev';
  }

  return 'smtp';
}

export function isSmtpDeliveryEnabled(env: Env): boolean {
  return getEmailProviderMode(env) !== 'console_dev';
}
