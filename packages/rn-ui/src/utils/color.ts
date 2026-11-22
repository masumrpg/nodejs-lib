function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function parseColorRgb(color: string): [number, number, number] | null {
  const trimmed = color.trim();
  if (!trimmed || trimmed === "transparent") return null;

  if (trimmed.startsWith("rgba(") || trimmed.startsWith("rgb(")) {
    const match = trimmed.match(
      /^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)(?:\s*[,/]\s*[\d.]+%?)?\s*\)$/i,
    );
    if (!match) return null;
    const r = Number(match[1]);
    const g = Number(match[2]);
    const b = Number(match[3]);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return [clampByte(r), clampByte(g), clampByte(b)];
  }

  const hex = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;

  if (hex.length === 3 || hex.length === 4) {
    const r = parseInt(hex[0]! + hex[0]!, 16);
    const g = parseInt(hex[1]! + hex[1]!, 16);
    const b = parseInt(hex[2]! + hex[2]!, 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return [r, g, b];
  }

  if (hex.length === 6 || hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return [r, g, b];
  }

  return null;
}

function relativeLuminance(rgb: [number, number, number]): number {
  const linearize = (channel: number) => {
    const srgb = channel / 255;
    return srgb <= 0.03928
      ? srgb / 12.92
      : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * linearize(rgb[0]) +
    0.7152 * linearize(rgb[1]) +
    0.0722 * linearize(rgb[2])
  );
}

export function getContrastRatio(foreground: string, background: string): number {
  const fg = parseColorRgb(foreground);
  const bg = parseColorRgb(background);
  if (!fg || !bg) return 1;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getContrastingTextColor(
  background: string,
  darkText = "#09090B",
  lightText = "#FFFFFF",
): string {
  const darkContrast = getContrastRatio(darkText, background);
  const lightContrast = getContrastRatio(lightText, background);
  return darkContrast >= lightContrast ? darkText : lightText;
}

export function withAlpha(color: string, alpha: number): string {
  const safeAlpha = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
  const trimmed = color.trim();

  if (!trimmed || trimmed === "transparent") {
    return "transparent";
  }

  const rgb = parseColorRgb(trimmed);
  if (rgb) {
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${safeAlpha})`;
  }

  return color;
}
