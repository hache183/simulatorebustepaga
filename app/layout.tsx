import type { Metadata } from 'next';
import { DM_Mono, Plus_Jakarta_Sans, Syne } from 'next/font/google';
import { siteUrl } from '@/lib/site';
import './globals.css';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
});

const display = Syne({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
  variable: '--font-display',
});

const mono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-mono',
});

const titolo = 'CostWork Pro — Calcolatore Costo del Lavoro';
const descrizione = 'Strumento professionale multi-CCNL per il calcolo del costo aziendale del lavoro in Italia';

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
    siteName: 'CostWork Pro',
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
