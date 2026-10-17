/**
 * Helper to get local sign image URLs and provide guaranteed offline SVG fallbacks.
 * Never requests external resources (no placeholder.com, no CDN).
 */

const categoryToFolder: Record<string, string> = {
  'A': 'Danger',
  'B': 'Priorité',
  'C': 'Prescription',
  'D': 'Indication',
};

export function getSignFolder(categoryOrCode: string): string {
  if (!categoryOrCode) return 'Indication';
  const char = categoryOrCode.charAt(0).toUpperCase();
  return categoryToFolder[char] || 'Indication';
}

export function getSignImagePath(code: string, category?: string): string {
  if (!code) return getOfflineSignSvgFallback('?', category || 'D');
  const cat = category || code.charAt(0).toUpperCase();
  const folder = getSignFolder(cat);
  return `/images/${folder}/${code}.png`;
}

/**
 * Creates an offline, standalone SVG data URL representing the traffic sign.
 */
export function getOfflineSignSvgFallback(code: string, category?: string): string {
  const safeCode = (code || '?').toUpperCase();
  const cat = (category || safeCode.charAt(0) || 'D').toUpperCase();

  let svgContent = '';

  if (cat === 'A') {
    // Danger: Red triangle with white/cream interior
    svgContent = `
      <polygon points="100,20 185,170 15,170" fill="#dc2626" stroke="#b91c1c" stroke-width="4" stroke-linejoin="round"/>
      <polygon points="100,42 165,158 35,158" fill="#ffffff" />
      <text x="100" y="125" font-family="Arial, sans-serif" font-size="28" font-weight="900" fill="#1f2937" text-anchor="middle">${safeCode}</text>
    `;
  } else if (cat === 'B') {
    // Priority: Yellow diamond or Yield
    svgContent = `
      <rect x="35" y="35" width="130" height="130" transform="rotate(45 100 100)" fill="#fbbf24" stroke="#d97706" stroke-width="8" rx="8"/>
      <rect x="50" y="50" width="100" height="100" transform="rotate(45 100 100)" fill="#ffffff" stroke="#f59e0b" stroke-width="4" rx="4"/>
      <text x="100" y="110" font-family="Arial, sans-serif" font-size="28" font-weight="900" fill="#1f2937" text-anchor="middle">${safeCode}</text>
    `;
  } else if (cat === 'C') {
    // Prescription: Circular with red ring
    svgContent = `
      <circle cx="100" cy="100" r="85" fill="#ffffff" stroke="#dc2626" stroke-width="18"/>
      <text x="100" y="110" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="#1f2937" text-anchor="middle">${safeCode}</text>
    `;
  } else {
    // Indication (D) or Default: Blue square with white border
    svgContent = `
      <rect x="15" y="15" width="170" height="170" rx="16" fill="#2563eb" stroke="#ffffff" stroke-width="8"/>
      <rect x="22" y="22" width="156" height="156" rx="12" fill="#2563eb" stroke="#1d4ed8" stroke-width="2"/>
      <text x="100" y="112" font-family="Arial, sans-serif" font-size="32" font-weight="900" fill="#ffffff" text-anchor="middle">${safeCode}</text>
    `;
  }

  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
    <rect width="200" height="200" fill="transparent"/>
    ${svgContent}
  </svg>`.trim().replace(/\s+/g, ' ');

  return `data:image/svg+xml;utf8,${encodeURIComponent(fullSvg)}`;
}
