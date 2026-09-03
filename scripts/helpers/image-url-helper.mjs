/**
 * normalizeImageUrl
 * 
 * Automatically transforms raw S3 catalogue URLs (which return 'application/octet-stream')
 * to the CDN endpoint that delivers clean 'image/jpeg' headers.
 * 
 * Works with single URLs or comma/pipe/newline-separated lists.
 * 
 * @param {string} url - Raw URL or list of URLs
 * @returns {string} - Transformed URL ready for Shopify media creation
 */
export function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';

  const RAW_S3_PREFIX = 'https://s3.ap-south-1.amazonaws.com/nushop-catalogue/';
  const CLOUDFRONT_PREFIX = 'https://d1311wbk6unapo.cloudfront.net/NushopCatalogue/';

  return url.replace(new RegExp(RAW_S3_PREFIX, 'g'), CLOUDFRONT_PREFIX).trim();
}

/**
 * normalizeImageUrls
 * 
 * Splits multiple URLs separated by comma, pipe, or newline,
 * normalizes each, and filters out empty strings.
 * 
 * @param {string|string[]} input 
 * @returns {string[]}
 */
export function normalizeImageUrls(input) {
  if (!input) return [];
  
  if (Array.isArray(input)) {
    return input.map(normalizeImageUrl).filter(Boolean);
  }

  return input
    .split(/[,\n|]/)
    .map(u => normalizeImageUrl(u.trim()))
    .filter(Boolean);
}

export default {
  normalizeImageUrl,
  normalizeImageUrls,
};
