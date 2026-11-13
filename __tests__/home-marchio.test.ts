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

const BRAND_SVG = ['marchio.svg', 'simbolo.svg', 'icona.svg', 'anteprima.svg'];
const PREVENTIVO = 'preventivo totalmente gratuito';

describe('home carta e terracotta', () => {
  const home = leggi('app/page.tsx');

  test('mantiene il testo approvato e porta al simulatore', () => {
    expect(home).toContain('Lo stipendio è solo la');
    expect(home).toContain('prima riga.');
    expect(home).toContain('Simulatore del costo del lavoro');
    expect(home).toContain('Apri il simulatore');
    expect(home).toContain("const SIMULATORE = '/calcolatore'");
    expect(home).toContain('Quattro moduli, un metodo.');
    expect(home).toContain('Cosa trovi nel report.');
    expect(home).toContain('Costo totale azienda');
  });

  test('spiega a cosa serve il simulatore e cosa succede dopo', () => {
    expect(home).toContain('Questo simulatore serve a darti un’idea del');
    expect(home).toContain('Il risultato è una stima indicativa.');
    expect(home).toContain(`vieni ricontattato da un consulente del lavoro per un <strong>${PREVENTIVO}</strong>`);
    for (const titolo of ['Imposti i parametri', 'Lasci i tuoi dati', 'Consulti la stima']) {
      expect(home).toContain(titolo);
    }
    expect(home).toContain('Non è un cedolino e non è un preventivo definitivo.');
    expect(home).not.toMatch(/mail automatic|ti inviamo|via email/i);
    expect(home).not.toMatch(/!/);
  });

  test('il prospetto della hero è un esempio dichiarato e torna in somma', () => {
    expect(home).toContain('ESEMPIO');
    expect(home).toContain('Importi di esempio, non riferiti al tuo caso.');
    const importi = [...home.matchAll(/(\d{1,3}(?:\.\d{3})?) €/g)].map(m => Number(m[1].replace('.', '')));
    const totale = importi.pop();
    expect(importi.reduce((a, b) => a + b, 0)).toBe(totale);
    expect(home).not.toContain('calculateCosto');
  });
});

describe('copy sul consulente', () => {
  test('form dei recapiti: niente prospetto inviato al visitatore', () => {
    const form = leggi('components/LeadCaptureForm.tsx');
    expect(form).toContain('Lascia i recapiti per vedere la stima');
    expect(form).toContain(PREVENTIVO);
    expect(form).not.toContain('si invia a questi recapiti');
  });

  test('i risultati mostrano l’avviso anche in stampa', () => {
    const avviso = leggi('components/AvvisoStima.tsx');
    expect(avviso).toContain('Questa è una stima indicativa');
    expect(avviso).toContain(PREVENTIVO);
    expect(avviso).not.toContain('no-print');
    for (const file of ['components/RisultatiCalcolatore.tsx', 'components/RisultatiSoci.tsx']) {
      expect(leggi(file)).toContain('<AvvisoStima />');
    }
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

  test('font: Newsreader per i titoli, Hanken Grotesk per il testo, nessun residuo del vecchio tema', () => {
    const layout = leggi('app/layout.tsx');
    expect(layout).toContain('Newsreader');
    expect(layout).toContain('Hanken_Grotesk');
    for (const file of [...sorgenti('app'), ...sorgenti('components')]) {
      expect({ file, vecchi: /Fraunces|Cinzel|Instrument_Sans|IBM_Plex/.test(leggi(file)) }).toEqual({ file, vecchi: false });
    }
  });

  test.each(BRAND_SVG)('%s è un SVG vettoriale senza font né immagini incorporate', (nome) => {
    const svg = leggi(join('public/brand', nome));
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
    expect(svg).not.toMatch(/<text|<image|@font-face|base64/);
  });

  test('solo i nuovi asset, nessun riferimento ai vecchi', () => {
    expect(readdirSync(join(root, 'public/brand')).sort()).toEqual([...BRAND_SVG].sort());
    expect(leggi('components/Logo.tsx')).toContain('/brand/marchio.svg');
    for (const file of [...sorgenti('app'), ...sorgenti('components'), ...sorgenti('lib')]) {
      expect({ file, vecchi: /marchio-panna|marchio-navy|seal-clean|lockup-(dark|light)|favicon-32|\/brand\/og\.png/.test(leggi(file)) })
        .toEqual({ file, vecchi: false });
    }
  });

  test('i colori del marchio: senape per la prima riga, terracotta e inchiostro', () => {
    const marchio = leggi('public/brand/marchio.svg');
    expect(marchio).toContain('fill="#E2A23B"');
    expect(marchio).toContain('fill="#B4432A"');
    expect(marchio).toContain('fill="#2B2420"');
    expect(leggi('public/brand/anteprima.svg')).toContain('fill="#F6F0E6"');
    expect(leggi('app/icon.svg')).toBe(leggi('public/brand/icona.svg'));
    expect(leggi('app/manifest.ts')).toContain("background_color: '#F6F0E6'");
  });
});

describe('pulsanti', () => {
  const css = leggi('app/globals.css');
  const home = leggi('app/home.module.css');

  test('primario: fondo terracotta e testo bianco in ogni stato', () => {
    expect(css).toContain('--color-btn-bg:        var(--terracotta);');
    expect(css).toContain('--color-btn-fg:        #FFFFFF;');
    expect(css).toContain('--color-btn-bg-hover:  var(--terracotta-scura);');
    expect(css).toMatch(/a\.ui-btn--primary:visited \{[^}]*color: var\(--color-btn-fg\)/);
    expect(css).toMatch(/\.ui-btn--primary \*,\s*\.ui-btn--primary svg \{\s*color: var\(--color-btn-fg\)/);
    expect(css).toMatch(/\.ui-btn--primary:hover:not\(:disabled\),\s*a\.ui-btn--primary:hover \{[^}]*color: var\(--color-btn-fg\)/);
  });

  test('la CTA della home resta bianca su terracotta anche da visitata', () => {
    expect(home).toMatch(/\.page a\.cta:visited \{[^}]*background: var\(--terracotta\);[^}]*color: #FFFFFF;/);
    expect(home).toMatch(/\.page a\.cta svg \{ color: #FFFFFF; \}/);
    expect(home).toMatch(/\.page a\.cta:hover \{[^}]*color: #FFFFFF;/);
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
