import Link from 'next/link';
import { IBM_Plex_Mono, Instrument_Sans } from 'next/font/google';
import { Logo } from '@/components/Logo';
import { NOME_SITO } from '@/lib/site';
import styles from './home.module.css';

const instrument = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--home-sans',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--home-mono',
});

const TITOLO_HOME = `${NOME_SITO} — simulatore del costo del lavoro`;
const DESCRIZIONE_HOME =
  'Stima indicativa del costo completo a carico dell’azienda: retribuzione, contributi INPS, TFR, premio INAIL, ferie e permessi. Un consulente del lavoro elabora poi un preventivo totalmente gratuito.';

export const metadata = {
  title: TITOLO_HOME,
  description: DESCRIZIONE_HOME,
  alternates: { canonical: '/' },
  openGraph: {
    title: TITOLO_HOME,
    description: DESCRIZIONE_HOME,
    url: '/',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Costi Lavoro Italia — Lo stipendio è solo la prima riga. Simulatore del costo del lavoro.' }],
  },
  twitter: { title: TITOLO_HOME, description: DESCRIZIONE_HOME, images: ['/opengraph-image'] },
};

const SIMULATORE = '/calcolatore';

const MODULI = [
  { n: '01', titolo: 'Dipendenti', testo: 'Lavoro subordinato sui principali CCNL. Livello, orario, provincia e voci accessorie.' },
  { n: '02', titolo: 'Edili', testo: 'Il costo in edilizia, con gli istituti propri del settore e le regole del contratto collettivo.' },
  { n: '03', titolo: 'Domestici', testo: 'Colf, badanti e babysitter: contributi e costo complessivo per la famiglia datrice.' },
  { n: '04', titolo: 'Soci', testo: 'Compensi a soci e amministratori, distinti dal lavoro dipendente, con il relativo costo societario.' },
];

const PASSI = [
  {
    n: '01',
    titolo: 'Imposti i parametri',
    testo: 'Contratto, livello, orario, provincia e le altre voci del caso. Il simulatore stima retribuzione, contributi e istituti sul profilo che hai scelto: è una prima idea del costo.',
  },
  {
    n: '02',
    titolo: 'Lasci i tuoi dati',
    testo: 'Lasci nome, email, telefono e azienda, poi vedi il report. Un consulente del lavoro ti ricontatterà, prenderà in carico la richiesta e preparerà un preventivo totalmente gratuito.',
  },
  {
    n: '03',
    titolo: 'Consulti la stima',
    testo: 'Il dettaglio dei costi è sul sito, da leggere e scaricare subito. È una prima idea sul tuo caso: il preventivo preciso e gratuito lo elabora il consulente.',
  },
];

const VOCI = [
  'Retribuzione annua lorda',
  'Contributi INPS a carico del datore',
  'TFR accantonato',
  'Premio INAIL',
  'Ferie, permessi e festività',
  'Assistenza sanitaria e enti bilaterali',
  'Istituti contrattuali accessori',
];

function Freccia() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3 9h12M10.5 4.5 15 9l-4.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
    </svg>
  );
}

function Cta({ testId }: { testId?: string }) {
  return (
    <Link href={SIMULATORE} className={styles.cta} data-testid={testId}>
      Apri il simulatore
      <Freccia />
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className={`${styles.page} ${instrument.variable} ${plexMono.variable}`}>
      <span className={`${styles.tick} ${styles.tickTl}`} aria-hidden="true" />
      <span className={`${styles.tick} ${styles.tickTr}`} aria-hidden="true" />
      <span className={`${styles.tick} ${styles.tickBl}`} aria-hidden="true" />
      <span className={`${styles.tick} ${styles.tickBr}`} aria-hidden="true" />

      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Costi Lavoro Italia, vai alla home">
          <Logo tone="dark" height={62} className={styles.brandImg} />
        </Link>
        <nav className={styles.nav} aria-label="Sezioni">
          <Link href={SIMULATORE} className={styles.navCurrent}>Simulatore</Link>
          <Link href="/calcolatore?tab=soci">Compensi</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </header>

      <main id="contenuto">
        <section className={styles.hero}>
          <div className={styles.heroTop}>
            <p className={styles.kicker}>Simulatore del costo del lavoro</p>
            <p className={styles.meta}>Aliquote 2026</p>
          </div>
          <h1 className={styles.headline}>
            Lo stipendio<br /> è solo la prima<br /> riga.
          </h1>
          <div className={styles.heroBottom}>
            <p className={styles.lead}>
              Questo simulatore serve a darti un’idea del costo completo a carico dell’azienda: non solo lo stipendio, ma anche contributi INPS, TFR, premio INAIL, ferie, permessi e le altre voci del contratto. Vale per dipendenti, edili, collaboratori domestici, soci e amministratori, a partire da contratto, livello, orario e provincia. Il risultato è una stima indicativa. Poi un consulente del lavoro ti ricontatta e elabora la tua richiesta con un preventivo totalmente gratuito.
            </p>
            <div className={styles.ctaBlock}>
              <Cta testId="cta-simulatore" />
              <p className={styles.ctaNote}>
                Il simulatore è gratuito. Dopo i parametri lasci i recapiti, vedi subito la stima sul sito e vieni ricontattato da un consulente del lavoro per un preventivo totalmente gratuito.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.band} aria-labelledby="home-moduli">
          <div className={styles.secHead}>
            <p className={styles.secIdx}>02 / 04</p>
            <h2 id="home-moduli">Quattro moduli, un metodo.</h2>
            <p className={styles.aside}>Scegli il profilo, poi i parametri</p>
          </div>
          <div className={styles.moduli}>
            {MODULI.map(m => (
              <article key={m.n} className={styles.modulo}>
                <p className={styles.n}>{m.n}</p>
                <h3>{m.titolo}</h3>
                <p>{m.testo}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.band} aria-labelledby="home-passi">
          <div className={styles.secHead}>
            <p className={styles.secIdx}>03 / 04</p>
            <h2 id="home-passi">Tre passi, poi il report.</h2>
            <p className={styles.aside}>Dal parametro al risultato</p>
          </div>
          <div className={styles.steps}>
            {PASSI.map(p => (
              <article key={p.n} className={styles.step}>
                <p className={styles.stepN} aria-hidden="true">{p.n}</p>
                <h3>{p.titolo}</h3>
                <p>{p.testo}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.band} aria-labelledby="home-report">
          <div className={styles.secHead}>
            <p className={styles.secIdx}>04 / 04</p>
            <h2 id="home-report">Cosa trovi nel report.</h2>
            <p className={styles.aside}>Le voci, non le cifre</p>
          </div>
          <div className={styles.reportGrid}>
            <div className={styles.reportIntro}>
              <p>Il report elenca ogni componente del costo aziendale, calcolata sui tuoi parametri. Qui sotto è l’indice di quello che ottieni: gli importi li vedi nel simulatore.</p>
              <p className={styles.disclaimer}>Non è un cedolino e non è un preventivo definitivo. È una stima indicativa, secondo le aliquote e i contratti del 2026 caricati nel motore. Un consulente del lavoro ti ricontatta e elabora la tua richiesta con un preventivo totalmente gratuito.</p>
            </div>
            <ul className={styles.voci}>
              {VOCI.map(v => (
                <li key={v} className={styles.voce}>
                  <span>{v}</span>
                  <span className={styles.mark}>Nel report</span>
                </li>
              ))}
              <li className={`${styles.voce} ${styles.voceTotal}`}>
                <span>Costo totale azienda</span>
                <span className={styles.mark}>Nel report</span>
              </li>
            </ul>
          </div>
        </section>

        <section className={`${styles.band} ${styles.close}`}>
          <h2>Quanto costa davvero<br /> un contratto.</h2>
          <Cta />
        </section>
      </main>

      <footer className={styles.footer}>
        <p>Costi Lavoro Italia · 2026</p>
        <Link href="/privacy">Privacy</Link>
      </footer>
    </div>
  );
}
