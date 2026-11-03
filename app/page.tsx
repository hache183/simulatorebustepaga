import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { calculateCosto } from '@/lib/engine';
import { getCcnlData, pagaMensileBase } from '@/lib/ccnl';
import { NOME_SITO } from '@/lib/site';

const TITOLO_HOME = `${NOME_SITO} — il costo di un quarto livello del commercio`;
const DESCRIZIONE_HOME = 'Prospetto calcolato sul CCNL Terziario, 4° livello, minimo tabellare, 14 mensilità, Lombardia. Gli altri casi si impostano nel simulatore.';

export const metadata = {
  title: TITOLO_HOME,
  description: DESCRIZIONE_HOME,
  alternates: { canonical: '/' },
  openGraph: { title: TITOLO_HOME, description: DESCRIZIONE_HOME, url: '/' },
  twitter: { title: TITOLO_HOME, description: DESCRIZIONE_HOME },
};

const FAQ = [
  {
    q: 'I dati si chiedono prima di compilare il contratto?',
    a: 'No. CCNL, livello, retribuzione, orario, regione e voce INAIL si scrivono senza lasciare recapiti. Nome, email e telefono servono solo quando si chiede il prospetto.',
  },
  {
    q: 'Il calcolo riparte dopo il modulo?',
    a: 'Sì. I parametri restano in pagina. Dopo l\'invio il motore usa quegli stessi valori e il prospetto compare senza reinserirli.',
  },
  {
    q: 'Ogni visita richiede di nuovo i recapiti?',
    a: 'No. Un cookie tecnico, httpOnly, tiene sbloccato il browser per circa trenta giorni. Poi il modulo torna solo alla generazione del prospetto.',
  },
  {
    q: 'Si può consegnare al dipendente come cedolino?',
    a: 'No. È una simulazione su minimi tabellari, aliquote caricate e regole del motore. Addizionali e detrazioni personali vanno verificate dal consulente.',
  },
];

const euro = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function cifra(n: number) {
  return `${euro.format(n)} €`;
}

export default async function HomePage() {
  const anno = new Date().getFullYear();
  const ccnl = getCcnlData('commercio');
  const livello = ccnl.livelli.find(l => l.codice === '4');
  if (!livello) throw new Error('Livello 4 del commercio assente');
  const ral = Math.round(pagaMensileBase(livello) * ccnl.mensilita * 100) / 100;
  const esempio = await calculateCosto({
    ccnlId: 'commercio',
    livello: '4',
    ral,
    tipoContratto: 'tempo_indeterminato',
    oreLavoro: 40,
    mensilita: ccnl.mensilita,
    anzianitaAnni: 0,
    numeroDipendenti: 8,
    regione: 'Lombardia',
    codiceInail: '0111',
    agevolazioniSelezionate: [],
    includiAssistenzaSanitaria: true,
    aliquotaInps: 0.288,
  });
  const voce = (id: string) => esempio.voci.find(v => v.id === id)?.importoAnnuo ?? 0;
  const righe = [
    ['Retribuzione annua lorda', voce('ral')],
    ['Contributi INPS a carico del datore', voce('inps')],
    ['TFR accantonato', voce('tfr')],
    ['Premio INAIL', voce('inail')],
    ['Ferie, permessi ed ex festività non godute', voce('ferie_permessi_festivita')],
    ['Assistenza sanitaria', voce('assistenza_sanitaria')],
    ['Ebiter', voce('ente_bilaterale_ebiter')],
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <AppHeader />
      <main id="contenuto" className="home">
        <section className="mast">
          <p className="mast__index">01</p>
          <div>
            <p className="kicker">Terziario · 4° livello · aliquote {anno}</p>
            <h1>Un quarto livello del commercio, messo in colonna.</h1>
          </div>
          <p className="mast__deck">
            Minimo tabellare, quattordici mensilità, quaranta ore, tempo indeterminato, otto dipendenti in Lombardia, voce INAIL 0111, INPS datoriale al 28,80%, nessuna agevolazione.
            Le cifre sotto escono dal motore. Non sono un cedolino.
          </p>
        </section>

        <section className="ledger" aria-label="Prospetto di esempio calcolato">
          <table>
            <caption>
              Costo azienda annuo {cifra(esempio.costoTotaleAnnuo)}. Netto mensile stimato, media su dodici mesi, {cifra(esempio.nettoDipendente.nettoMensile12)}.
            </caption>
            <thead>
              <tr>
                <th scope="col">Voce</th>
                <th scope="col">Importo annuo</th>
              </tr>
            </thead>
            <tbody>
              {righe.map(([nome, importo]) => (
                <tr key={nome}>
                  <th scope="row">{nome}</th>
                  <td>{cifra(Number(importo))}</td>
                </tr>
              ))}
              <tr className="ledger__totale">
                <th scope="row">Costo totale azienda</th>
                <td>{cifra(esempio.costoTotaleAnnuo)}</td>
              </tr>
              <tr>
                <th scope="row">Netto mensile stimato del dipendente</th>
                <td>{cifra(esempio.nettoDipendente.nettoMensile12)}</td>
              </tr>
            </tbody>
          </table>
          <p className="ledger__nota">
            RAL di partenza {cifra(ral)}, pari al minimo del 4° livello per {ccnl.mensilita} mensilità.
            Tredicesima e quattordicesima sono già dentro la retribuzione. Il netto non tiene conto di carichi familiari né dell&apos;addizionale del singolo comune.
          </p>
          <p className="ledger__azioni">
            <Link href="/calcolatore" className="ui-btn ui-btn--primary" data-testid="cta-simulatore">
              Calcola un altro inquadramento
            </Link>
            <Link href="/calcolatore?tab=soci" className="ui-btn ui-btn--secondary">
              Compenso di un amministratore
            </Link>
          </p>
        </section>

        <section className="sezione">
          <p className="sezione__n">02</p>
          <div>
            <h2>Come si legge una riga</h2>
            <dl className="glossa">
              <div>
                <dt>Retribuzione</dt>
                <dd>Il minimo del livello, più le indennità fisse del contratto. Una RAL diversa si scrive nel modulo e diventa superminimo.</dd>
              </div>
              <div>
                <dt>INPS del datore</dt>
                <dd>Aliquota del settore. Sotto i quindici dipendenti il commercio usa la fascia fino a quindici. Le agevolazioni si scelgono dopo, e si vedono come sconto.</dd>
              </div>
              <div>
                <dt>INAIL</dt>
                <dd>Tasso della voce di tariffa, in media nazionale. Il tasso aziendale vero dipende dall&apos;oscillazione e può scostarsi anche del quaranta per cento.</dd>
              </div>
              <div>
                <dt>Netto</dt>
                <dd>Trattenuta INPS del lavoratore, IRPEF con la detrazione da lavoro dipendente, bonus cuneo se spetta, addizionali regionale e comunale in media nazionale.</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="sezione">
          <p className="sezione__n">03</p>
          <div>
            <h2>Gli altri tre calcoli</h2>
            <ol className="indice">
              <li>
                <span>Edili</span>
                <p>Operai di industria o artigianato. Il costo passa dalla Cassa Edile: l&apos;aliquota in pagina è indicativa e cambia con la cassa provinciale.</p>
              </li>
              <li>
                <span>Domestici</span>
                <p>Conviventi e non conviventi, contributi a ore e Cassa Colf. Il datore privato non trattiene l&apos;IRPEF: il netto in busta è senza imposta.</p>
              </li>
              <li>
                <span>Soci e amministratori</span>
                <p>Compenso in Gestione separata. Due terzi restano sulla società, un terzo sul percipiente. In più, trasferte e chilometri delle tabelle ACI.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="sezione">
          <p className="sezione__n">04</p>
          <div>
            <h2>Prima di usare il numero</h2>
            <div className="faq">
              {FAQ.map((voce, i) => (
                <details key={voce.q}>
                  <summary><span>{String(i + 1).padStart(2, '0')}</span>{voce.q}</summary>
                  <p>{voce.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
