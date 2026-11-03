/** URL canonico. In build usa NEXT_PUBLIC_SITE_URL, altrimenti il dominio di produzione. */
export function siteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || 'https://costilavoroitalia.it').trim();
  return raw.replace(/\/+$/, '');
}

export const NOME_SITO = 'Costi Lavoro Italia';
