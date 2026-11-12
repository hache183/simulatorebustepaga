import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');
const leggi = (p: string) => readFileSync(join(root, p), 'utf8');

function sorgenti(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap(nome => {
    const rel = join(dir, nome);
    if (statSync(join(root, rel)).isDirectory()) return sorgenti(rel);
    return /\.(tsx?|css)$/.test(nome) ? [rel] : [];
  });
}

const BRAND_SVG = ['marchio-panna.svg', 'marchio-navy.svg', 'icona.svg', 'anteprima.svg'];

describe('home scura', () => {
  const home = leggi('app/page.tsx');

  test('mantiene il testo approvato e porta al simulatore', () => {
    expect(home).toContain('Lo stipendio<br /> è solo la prima<br /> riga.');
    expect(home).toContain('Apri il simulatore');
    expect(home).toContain("const SIMULATORE = '/calcolatore'");
    expect(home).toContain('Quattro moduli, un metodo.');
    expect(home).toContain('Tre passi, poi il report.');
    expect(home).toContain('Cosa trovi nel report.');
    expect(home).toContain('Costo totale azienda');
    expect(home).toContain('Quanto costa davvero<br /> un contratto.');
  });

  test('spiega a che serve, la stima indicativa e il preventivo gratuito', () => {
    expect(home).toContain('Questo simulatore serve a darti un’idea del costo completo a carico dell’azienda');
    expect(home).toContain('Il risultato è una stima indicativa. Poi un consulente del lavoro ti ricontatta e elabora la tua richiesta con un preventivo totalmente gratuito.');
    expect(home).toContain('Il simulatore è gratuito. Dopo i parametri lasci i recapiti, vedi subito la stima sul sito e vieni ricontattato da un consulente del lavoro per un preventivo totalmente gratuito.');
    expect(home).toContain('è una prima idea del costo.');
    expect(home).toContain("titolo: 'Consulti la stima'");
    expect(home).toContain('il preventivo preciso e gratuito lo elabora il consulente.');
    expect(home).toContain('Non è un cedolino e non è un preventivo definitivo.');
    expect(home).not.toContain('Il prospetto si invia');
    expect(home).not.toContain('Non ti inviamo mail automatiche.');

    const form = leggi('components/LeadCaptureForm.tsx');
    expect(form).toContain('Lascia i recapiti per vedere la stima');
    expect(form).toContain('vedi subito il report sul sito. Un consulente del lavoro ti ricontatterà per un preventivo totalmente gratuito.');
    expect(form).toContain('necessario per vedere la stima ed essere ricontattato');

    const avviso = 'Questa è una stima indicativa, per darti un’idea del costo. Non sostituisce un cedolino né un parere professionale. Un consulente del lavoro ti ricontatterà e elaborerà la tua richiesta con un preventivo totalmente gratuito.';
    for (const file of ['components/RisultatiCalcolatore.tsx', 'components/RisultatiSoci.tsx']) {
      const src = leggi(file);
      expect({ file, avviso: src.includes(avviso) }).toEqual({ file, avviso: true });
      const dopoAvviso = src.slice(src.indexOf(avviso));
      expect({ file, stampa: dopoAvviso.includes('className="no-print"') }).toEqual({ file, stampa: true });
    }

    expect(leggi('components/SiteFooter.tsx')).toContain('Stima indicativa su minimi, aliquote e regole del {anno}. Non è un cedolino, non sostituisce il consulente del lavoro.');
    expect(leggi('app/layout.tsx')).toContain('Stima indicativa del costo di un’assunzione a carico di chi paga. Un consulente del lavoro elabora poi un preventivo totalmente gratuito.');
    expect(leggi('app/calcolatore/page.tsx')).toContain('Stima indicativa del costo azienda su dipendenti, edili, domestici, soci e amministratori. Un consulente del lavoro elabora poi un preventivo totalmente gratuito.');
  });

  test('nessun importo in euro, nessun prospetto di esempio, nessuna nota da bozzetto', () => {
    expect(home).not.toMatch(/€|\beuro\b/i);
    expect(home).not.toContain('calculateCosto');
    expect(home).not.toContain('Schizzo di home');
  });
});

describe('marchio', () => {
  test('il nome non compare mai attaccato né come CostWork', () => {
    for (const file of [...sorgenti('app'), ...sorgenti('components')]) {
      expect({ file, ok: !/CostiLavoro|CostWork/.test(leggi(file)) }).toEqual({ file, ok: true });
    }
  });

  test('niente Syne né PNG incorporati in base64', () => {
    for (const file of [...sorgenti('app'), ...sorgenti('components'), ...sorgenti('lib')]) {
      const src = leggi(file);
      expect({ file, syne: /Syne|lib\/brand-png/.test(src) }).toEqual({ file, syne: false });
    }
  });

  test('i titoli di display usano Fraunces', () => {
    expect(leggi('app/layout.tsx')).toContain('Fraunces');
    expect(leggi('app/home.module.css')).toContain('var(--font-display)');
    expect(leggi('app/home.module.css')).toContain('clamp(2.4rem, min(6vw, 100cqi / 11.5), 5.5rem)');
  });

  test.each(BRAND_SVG)('%s è un SVG vettoriale senza font né immagini incorporate', (nome) => {
    const svg = leggi(join('public/brand', nome));
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
    expect(svg).not.toMatch(/<text|<image|@font-face|base64/);
  });

  test('marchio solo scritta: niente sigillo, nessun riferimento ai vecchi PNG', () => {
    expect(readdirSync(join(root, 'public/brand')).sort()).toEqual([...BRAND_SVG].sort());
    const logo = leggi('components/Logo.tsx');
    expect(logo).toContain('/brand/marchio-panna.svg');
    expect(logo).toContain('/brand/marchio-navy.svg');
    for (const file of [...sorgenti('app'), ...sorgenti('components')]) {
      expect({ file, vecchi: /seal-clean|lockup-(dark|light)|favicon-32|\/brand\/og\.png/.test(leggi(file)) })
        .toEqual({ file, vecchi: false });
    }
  });

  test('la scritta usa la riga tricolore e i colori del marchio', () => {
    const panna = leggi('public/brand/marchio-panna.svg');
    const navy = leggi('public/brand/marchio-navy.svg');
    for (const colore of ['#1F8A4C', '#C91C30']) {
      expect(panna).toContain(colore);
      expect(navy).toContain(colore);
    }
    expect(panna).toContain('fill="#EDEAE3"');
    expect(navy).toContain('fill="#071F45"');
    expect(leggi('app/icon.svg')).toBe(leggi('public/brand/icona.svg'));
  });
});

describe('pulsanti', () => {
  const css = leggi('app/globals.css');
  const home = leggi('app/home.module.css');

  test('primario: fondo panna e testo scuro in ogni stato', () => {
    expect(css).toContain('--color-btn-bg:        #EDEAE3;');
    expect(css).toContain('--color-btn-fg:        #0A0B0D;');
    expect(css).toContain('--color-btn-bg-hover:  #DDD8CE;');
    expect(css).toMatch(/a\.ui-btn--primary:visited \{[^}]*color: var\(--color-btn-fg\)/);
    expect(css).toMatch(/\.ui-btn--primary \*,\s*\.ui-btn--primary svg \{\s*color: var\(--color-btn-fg\)/);
    expect(css).not.toMatch(/ui-btn--primary:hover[^{]*\{[^}]*#fff/);
  });

  test('la CTA della home batte `.page a:visited { color: inherit }`', () => {
    expect(home).toMatch(/\.page a\.cta:visited \{[^}]*color: var\(--cta-fg\)/);
    expect(home).toMatch(/\.page a\.cta svg \{[^}]*color: var\(--cta-fg\)/);
    expect(home).not.toMatch(/\.cta:hover \{ background: #fff/);
  });

  test('i pulsanti con stile in linea non fissano più colore e fondo', () => {
    for (const file of sorgenti('components')) {
      const src = leggi(file);
      const btn = src.match(/<button[^>]*style=\{\{[^}]*\}\}/g) ?? [];
      for (const b of btn) {
        expect({ file, b, ok: !/color-btn-(bg|fg)/.test(b) }).toEqual({ file, b, ok: true });
      }
    }
  });
});
