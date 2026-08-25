export interface SendOtpOptions {
  to: string;
  code: string;
}

export interface EmailProviderResult {
  success: boolean;
  provider: 'resend' | 'google_smtp' | 'console_dev';
  error?: string;
}

export interface IEmailProvider {
  name: 'resend' | 'google_smtp' | 'console_dev';
  sendOtp(options: SendOtpOptions, env: Env): Promise<EmailProviderResult>;
}

export function generateOtpEmailHtml(code: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Your MONTS Verification Code</title>
</head>
<body style="background:#f5f0e8;margin:0;padding:40px 20px;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#faf8f5;border-radius:8px;border:1px solid #e8e4df;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#060505;padding:24px 32px;">
              <p style="margin:0;color:#c4622d;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600;">MONTS LUXURY</p>
              <p style="margin:4px 0 0;color:#faf8f5;font-size:20px;font-weight:700;font-family:Georgia,serif;">Your Verification Code</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#686764;font-size:14px;line-height:1.6;">
                Use the code below to complete your sign-in to MONTS.
                This code expires in <strong>10 minutes</strong>.
              </p>
              <!-- OTP Box -->
              <div style="background:#f5f0e8;border:2px dashed #c4622d;border-radius:8px;padding:24px;text-align:center;margin:24px 0;">
                <p style="margin:0;font-size:40px;font-weight:700;letter-spacing:0.3em;color:#060505;font-family:monospace;">${code}</p>
              </div>
              <p style="margin:16px 0 0;color:#8b7355;font-size:12px;line-height:1.6;">
                If you did not request this code, you can safely ignore this email.
                Your account remains secure.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#e8e4df;padding:16px 32px;text-align:center;">
              <p style="margin:0;color:#8b7355;font-size:11px;">
                © MONTS — Artisan Luxury. Secure Shopify Storefront.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
