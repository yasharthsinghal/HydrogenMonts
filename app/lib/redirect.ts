/**
 * Strict allowlist for internal redirection destinations across MONTS storefront.
 * Prevents open-redirect vulnerabilities and arbitrary URL forwarding.
 */
export const ALLOWED_REDIRECT_PATHS = new Set(['/checkout', '/account', '/cart']);

/**
 * Validates that a redirection URL is in the approved internal allowlist.
 * If invalid, external, or malformed, defaults strictly to the fallback path.
 */
export function sanitizeRedirect(url: string | null | undefined, fallback = '/account'): string {
  if (!url || typeof url !== 'string') return fallback;
  const cleanUrl = url.trim();
  if (ALLOWED_REDIRECT_PATHS.has(cleanUrl)) {
    return cleanUrl;
  }
  return fallback;
}
