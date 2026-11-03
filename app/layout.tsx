import type { Metadata } from 'next';
import { IBM_Plex_Mono, Newsreader, Source_Sans_3 } from 'next/font/google';
import { NOME_SITO, siteUrl } from '@/lib/site';
import './globals.css';

const sans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
});

const display = Newsreader({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
  variable: '--font-display',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-mono',
});

const titolo = `${NOME_SITO} — costo di un'assunzione`;
const descrizione = 'Simulatore del costo aziendale e del netto stimato su CCNL, edilizia, lavoro domestico e compensi di soci e amministratori.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: titolo,
    template: '%s',
  },
  description: descrizione,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    siteName: NOME_SITO,
    title: titolo,
    description: descrizione,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: titolo,
    description: descrizione,
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
