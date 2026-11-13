import type { Metadata, Viewport } from 'next';
import { Hanken_Grotesk, Newsreader } from 'next/font/google';
import { NOME_SITO, siteUrl } from '@/lib/site';
import './globals.css';

const sans = Hanken_Grotesk({
  subsets: ['latin'],
  weight: 'variable',
  display: 'swap',
  variable: '--font-sans',
});

const display = Newsreader({
  subsets: ['latin'],
  weight: 'variable',
  style: ['normal', 'italic'],
  axes: ['opsz'],
  display: 'swap',
  variable: '--font-display',
});

const titolo = `${NOME_SITO} — quanto costa davvero un'assunzione`;
const descrizione = 'Simulatore gratuito del costo del lavoro: una stima indicativa per dipendenti, edili, lavoro domestico, soci e amministratori. Poi un consulente del lavoro ti ricontatta con un preventivo totalmente gratuito.';

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

export const viewport: Viewport = {
  themeColor: '#F6F0E6',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${sans.variable} ${display.variable}`}>
      <body>
        <a className="skip-link" href="#contenuto">Vai al contenuto</a>
        {children}
      </body>
    </html>
  );
}
