export interface SendOtpOptions {
    to: string;
    code: string;
}

export interface SendOrderConfirmationOptions {
    to: string;
    orderName: string;
    customerName: string;
    paymentMethod: "COD" | "PREPAID";
    totalAmount?: string;
    items?: Array<{ title: string; quantity: number; price?: string }>;
}

export interface EmailProviderResult {
    success: boolean;
    provider: "resend" | "google_smtp" | "console_dev";
    error?: string;
}

export interface IEmailProvider {
    name: "resend" | "google_smtp" | "console_dev";
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

export function generateOrderConfirmationHtml(
    options: SendOrderConfirmationOptions,
): string {
    const isCod = options.paymentMethod === "COD";
    const paymentBadge = isCod
        ? "Cash on Delivery (Payment Pending)"
        : "Prepaid (Paid Online)";
    const paymentInstructions = isCod
        ? "Please keep the exact cash amount ready upon delivery. Our studio concierge will contact you prior to dispatch."
        : "Your payment was successfully received. Your handcrafted piece is being packaged in our Jaipur studio.";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Your MONTS Order Confirmation ${options.orderName}</title>
</head>
<body style="background:#f5f0e8;margin:0;padding:40px 20px;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#faf8f5;border-radius:8px;border:1px solid #e8e4df;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#060505;padding:28px 32px;">
              <p style="margin:0;color:#c4622d;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600;">MONTS ARTISANAL LUXURY</p>
              <p style="margin:6px 0 0;color:#faf8f5;font-size:22px;font-weight:700;font-family:Georgia,serif;">Order Confirmed: ${
                  options.orderName
              }</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#060505;font-size:16px;font-weight:600;">
                Dear ${options.customerName || "Valued Customer"},
              </p>
              <p style="margin:0 0 20px;color:#686764;font-size:14px;line-height:1.6;">
                Thank you for choosing MONTS. Your artisanal order <strong>${
                    options.orderName
                }</strong> has been successfully placed.
              </p>

              <!-- Status Box -->
              <div style="background:#f5f0e8;border-left:4px solid #c4622d;border-radius:4px;padding:16px 20px;margin:20px 0;">
                <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;color:#8b7355;">Payment Method</p>
                <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#060505;">${paymentBadge}</p>
                <p style="margin:8px 0 0;font-size:13px;color:#686764;line-height:1.5;">${paymentInstructions}</p>
              </div>

              <!-- Dispatch note -->
              <p style="margin:20px 0 0;color:#8b7355;font-size:12px;line-height:1.6;">
                📍 Dispatches with care from our Jaipur studio in 24–48 hours with insured tracking.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#e8e4df;padding:20px 32px;text-align:center;">
              <p style="margin:0;color:#8b7355;font-size:12px;">
                Concierge Assistance: <a href="tel:+918290985337" style="color:#c4622d;text-decoration:none;">+91 - 8290985337</a> | <a href="mailto:vastrabymonty@gmail.com" style="color:#c4622d;text-decoration:none;">vastrabymonty@gmail.com</a>
              </p>
              <p style="margin:8px 0 0;color:#8b7355;font-size:11px;">
                © MONTS — Jaipur, Rajasthan. Artisan Luxury.
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
export interface SendContactInquiryOptions {
    to: string;
    fullName: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
}

export function generateContactInquiryHtml(
    options: SendContactInquiryOptions,
): string {
    // Sanitize simple text to HTML entities to avoid broken layout/injection
    const escapeHtml = (str: string) =>
        str.replace(
            /[&<>'"]/g,
            (tag) =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    "'": "&#39;",
                    '"': "&quot;",
                }[tag] || tag),
        );

    const safeName = escapeHtml(options.fullName);
    const safeEmail = escapeHtml(options.email);
    const safePhone = escapeHtml(options.phone);
    const safeSubject = escapeHtml(options.subject);
    const safeMessage = escapeHtml(options.message).replace(/\n/g, "<br />");

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>MONTS Inquiry: ${safeSubject}</title>
</head>
<body style="background:#f5f0e8;margin:0;padding:40px 20px;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#faf8f5;border-radius:8px;border:1px solid #e8e4df;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#060505;padding:26px 32px;">
              <p style="margin:0;color:#c4622d;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600;">MONTS CONCIERGE &amp; SUPPORT</p>
              <p style="margin:6px 0 0;color:#faf8f5;font-size:22px;font-weight:700;font-family:Georgia,serif;">New Contact Inquiry</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;color:#686764;font-size:14px;line-height:1.6;">
                A new message has been received from the <strong>MONTS Contact Us</strong> page.
              </p>

              <!-- Sender Info Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0edea;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#8b7355;font-weight:600;width:120px;">Customer Name:</td>
                  <td style="padding:4px 0;font-size:14px;color:#060505;font-weight:700;">${safeName}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#8b7355;font-weight:600;">Customer Email:</td>
                  <td style="padding:4px 0;font-size:14px;color:#060505;">
                    <a href="mailto:${safeEmail}" style="color:#c4622d;text-decoration:none;font-weight:600;">${safeEmail}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#8b7355;font-weight:600;">Contact Number:</td>
                  <td style="padding:4px 0;font-size:14px;color:#060505;">
                    <a href="tel:${safePhone}" style="color:#060505;text-decoration:none;">${safePhone}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#8b7355;font-weight:600;">Subject:</td>
                  <td style="padding:4px 0;font-size:14px;color:#060505;font-weight:600;">${safeSubject}</td>
                </tr>
              </table>

              <!-- Message Content -->
              <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;color:#8b7355;">Message Content</p>
              <div style="background:#ffffff;border:1px solid #e8e4df;border-left:4px solid #c4622d;border-radius:4px;padding:20px;font-size:14px;line-height:1.7;color:#2c2c2c;">
                ${safeMessage}
              </div>

              <p style="margin:24px 0 0;color:#8b7355;font-size:12px;line-height:1.5;">
                💡 <em>You can reply directly to this email to respond back to ${safeName} (${safeEmail}).</em>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#e8e4df;padding:16px 32px;text-align:center;">
              <p style="margin:0;color:#8b7355;font-size:11px;">
                © MONTS Storefront System Dispatcher.
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
