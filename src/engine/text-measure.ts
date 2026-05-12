// Measures approximate line count using an off-screen canvas.
// Falls back to character-budget estimate when canvas is unavailable.
export function measureTextLines(text: string, widthPx: number, fontSizePx = 13): number {
  if (typeof document === 'undefined') {
    return Math.ceil(text.length / Math.max(1, Math.floor(widthPx / (fontSizePx * 0.6))));
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return Math.ceil(text.length / Math.max(1, Math.floor(widthPx / (fontSizePx * 0.6))));
  }
  ctx.font = `${fontSizePx}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const words = text.split(' ');
  let lines = 1;
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > widthPx && currentLine) {
      lines++;
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  return lines;
}
