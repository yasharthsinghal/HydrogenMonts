/**
 * Utility for sanitizing and beautifying Shopify product descriptions.
 * Fixes encoding artifacts (like '?' appearing instead of bullet points/emojis),
 * compresses excessive vertical whitespace (such as consecutive double <br> tags),
 * and structures features into elegant, compact lists and spec tables.
 */

export function formatProductDescriptionHtml(rawHtml: string | null | undefined): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  let html = rawHtml.trim();
  if (!html) return '';

  // 1. Clean unicode replacement characters and corrupted question marks / symbols
  html = html.replace(/\uFFFD/g, '');
  html = html.replace(/&#65533;/g, '');

  // Clean corrupted ? or * or bullets inside existing <li> tags
  html = html.replace(/(<li[^>]*>)\s*[\?\*•–—]\s*/gi, '$1');

  // If already structured with <ul> / <ol>, clean leading ? or * in text nodes
  if (/<(ul|ol)[\s>]/i.test(html)) {
    return html
      .replace(/(>|\n)\s*[\?]\s+([A-Za-z0-9])/g, '$1$2')
      .replace(/(<p[^>]*>)\s*[\?]\s+([A-Za-z0-9])/gi, '$1$2');
  }

  // 2. Normalize breaks and paragraphs into newline delimiters
  html = html.replace(/<br\s*\/?>/gi, '\n');
  html = html.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
  html = html.replace(/<\/?p[^>]*>/gi, '');

  const lines = html.split('\n');

  const resultSegments: string[] = [];
  let currentList: string[] = [];
  let currentSpecs: Array<{ label: string; value: string }> = [];
  let inFeatureSection = false;

  const flushList = () => {
    if (currentList.length > 0) {
      // Deduplicate consecutive identical items (e.g. accidental copy-paste in Shopify)
      const seen = new Set<string>();
      const uniqueItems: string[] = [];
      for (const item of currentList) {
        if (!seen.has(item.toLowerCase())) {
          seen.add(item.toLowerCase());
          uniqueItems.push(item);
        }
      }

      const items = uniqueItems.map((item) => `<li>${item}</li>`).join('');
      resultSegments.push(`<ul class="pdp-bullet-list">${items}</ul>`);
      currentList = [];
    }
  };

  const flushSpecs = () => {
    if (currentSpecs.length > 0) {
      const rows = currentSpecs
        .map(
          (s) =>
            `<div class="pdp-spec-row"><span class="pdp-spec-label">${s.label}:</span> <span class="pdp-spec-value">${s.value}</span></div>`,
        )
        .join('');
      resultSegments.push(`<div class="pdp-specs-grid">${rows}</div>`);
      currentSpecs = [];
    }
  };

  const isBulletLine = (line: string) => {
    const trimmed = line.trim();
    return (
      /^(\?|\*|-|•|–|—)\s+/.test(trimmed) ||
      /^(\?|\*)([A-Z0-9])/.test(trimmed) ||
      /^(&bull;|&minus;|&#8226;)\s*/i.test(trimmed)
    );
  };

  const cleanBulletText = (line: string) => {
    return line
      .trim()
      .replace(/^(\?|\*|-|•|–|—)\s+/, '')
      .replace(/^(\?|\*)([A-Z0-9])/, '$2')
      .replace(/^(&bull;|&minus;|&#8226;)\s*/i, '')
      .trim();
  };

  const isHeading = (line: string) => {
    const trimmed = line.trim();
    return /^(Key Features|Product Details|Features|Specifications|Product Specifications|Details|Care Instructions|Care Guide|Dimensions|Highlights):?$/i.test(
      trimmed,
    );
  };

  const matchSpec = (line: string) => {
    const trimmed = line.trim();
    const m = trimmed.match(/^([A-Za-z\s&]{2,25}):\s*(.+)$/);
    if (
      m &&
      m[1].toLowerCase() !== 'http' &&
      m[1].toLowerCase() !== 'https' &&
      !isHeading(trimmed)
    ) {
      return { label: m[1].trim(), value: m[2].trim() };
    }
    return null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      // Look ahead to check if the next content continues a list or spec
      let nextIsBullet = false;
      let nextIsSpec = false;
      for (let j = i + 1; j < lines.length; j++) {
        const ahead = lines[j].trim();
        if (ahead) {
          if (
            isBulletLine(ahead) ||
            (inFeatureSection && !isHeading(ahead) && !matchSpec(ahead))
          ) {
            nextIsBullet = true;
          }
          if (matchSpec(ahead)) {
            nextIsSpec = true;
          }
          break;
        }
      }
      if (!nextIsBullet) {
        flushList();
        inFeatureSection = false;
      }
      if (!nextIsSpec) {
        flushSpecs();
      }
      continue;
    }

    if (isHeading(trimmed)) {
      flushList();
      flushSpecs();
      const headingText = trimmed.replace(/:$/, '');
      if (/^(Key Features|Features|Highlights)$/i.test(headingText)) {
        inFeatureSection = true;
      } else {
        inFeatureSection = false;
      }
      resultSegments.push(`<h4 class="pdp-section-heading">${headingText}</h4>`);
      continue;
    }

    if (isBulletLine(trimmed)) {
      flushSpecs();
      currentList.push(cleanBulletText(trimmed));
      continue;
    }

    const spec = matchSpec(trimmed);
    if (spec) {
      flushList();
      currentSpecs.push(spec);
      continue;
    }

    if (inFeatureSection) {
      flushSpecs();
      currentList.push(trimmed);
      continue;
    }

    // Standard body paragraph
    flushList();
    flushSpecs();
    resultSegments.push(`<p class="pdp-desc-paragraph">${trimmed}</p>`);
  }

  flushList();
  flushSpecs();

  return resultSegments.join('');
}
