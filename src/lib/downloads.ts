function triggerDownload(href: string, filename: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function sanitizeFilename(value: string, fallbackStem = 'diagram') {
  const stem = value
    .replace(/\.[a-z0-9]+$/i, '')
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return stem || fallbackStem;
}

export function ensureJsonFilename(value: string) {
  const stem = sanitizeFilename(value, 'diagram');
  return `${stem}.json`;
}

export function downloadTextFile(
  text: string,
  filename: string,
  mimeType = 'application/json;charset=utf-8',
) {
  const blob = new Blob([text], { type: mimeType });
  const href = URL.createObjectURL(blob);

  try {
    triggerDownload(href, filename);
  } finally {
    URL.revokeObjectURL(href);
  }
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  triggerDownload(dataUrl, filename);
}

export function downloadSvgFile(svgString: string, filename: string) {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  try {
    triggerDownload(href, filename);
  } finally {
    URL.revokeObjectURL(href);
  }
}
