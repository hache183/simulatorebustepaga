/** Solo path interni. Rifiuta URL assoluti, protocol-relative e backslash. */
export function percorsoInterno(raw: string | null | undefined, fallback = '/calcolatore'): string {
  if (!raw) return fallback;
  let value = raw.trim();
  if (!value || value.length > 200) return fallback;
  try {
    value = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  if (value.includes('://') || value.includes('\n') || value.includes('\r') || value.includes('\0')) return fallback;
  return value;
}
