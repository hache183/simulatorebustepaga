import type { Metadata } from 'next';
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import { NOME_SITO, siteUrl } from '@/lib/site';
import './globals.css';

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-sans',
});

const display = Fraunces({
  subsets: ['latin'],
  weight: 'variable',
  display: 'swap',
  variable: '--font-display',
  axes: ['opsz', 'SOFT', 'WONK'],
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-mono',
});

const titolo = `${NOME_SITO} — costo di un'assunzione`;
const descrizione = 'Simulatore del costo aziendale e del netto stimato su CCNL, edilizia, lavoro domestico e compensi di soci e amministratori.';
const OG_ALT = 'Costi Lavoro Italia — Lo stipendio è solo la prima riga. Simulatore del costo del lavoro.';
const OG_IMAGE = { url: '/brand/og.png', width: 1200, height: 630, alt: OG_ALT };

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: titolo,
    template: '%s',
  },
  description: descrizione,
  alternates: { canonical: '/' },
  icons: {
    icon: [{ url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/brand/seal-clean-180.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    siteName: NOME_SITO,
    title: titolo,
    description: descrizione,
    url: '/',
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: titolo,
    description: descrizione,
    images: ['/brand/og.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body>
        <a className="skip-link" href="#contenuto">Vai al contenuto</a>
        {children}
      </body>
    </html>
  );
}
