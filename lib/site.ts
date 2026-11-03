/** URL canonico del sito. In build usa NEXT_PUBLIC_SITE_URL, altrimenti il dominio Vercel attuale. */
export function siteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || 'https://costworkpro.vercel.app').trim();
  return raw.replace(/\/+$/, '');
}
