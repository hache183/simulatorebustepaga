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

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const BRAND = [
  'lockup-dark.png',
  'lockup-light.png',
  'seal-clean-180.png',
  'seal-clean-192.png',
  'seal-clean-512.png',
  'favicon-32.png',
  'og.png',
];

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

  test.each(BRAND)('%s è un PNG valido', (nome) => {
    const buf = readFileSync(join(root, 'public/brand', nome));
    expect(buf.subarray(0, 8).equals(PNG)).toBe(true);
    expect(buf.subarray(buf.length - 8, buf.length - 4).toString('latin1')).toBe('IEND');
  });
});
