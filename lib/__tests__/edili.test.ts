import { calculateCosto } from '@/lib/engine';
import { calcolaVociEdili, calcolaCassaEdileAnnua } from '@/lib/edili';
import { getCcnlData } from '@/lib/ccnl';

const baseInput = {
  ccnlId: 'edilizia_industria',
  livello: '1',
  ral: 18349.68,
  tipoContratto: 'tempo_indeterminato' as const,
  oreLavoro: 40,
  oreSettimanali: 40,
  mensilita: 12,
  anzianitaAnni: 0,
  numeroDipendenti: 1,
  regione: 'Puglia',
  codiceInail: '3601',
  agevolazioniSelezionate: [] as string[],
  includiAssistenzaSanitaria: false,
  aliquotaInps: 0.3508,
};

describe('motore edili', () => {
  const cfg = getCcnlData('edilizia_industria').motoreEdili!;

  it('calcola A B C D E full-time livello 1', () => {
    const v = calcolaVociEdili(1529.14, 40, undefined, cfg);
    expect(v.A).toBe(18349.68);
    expect(v.B).toBeCloseTo(18349.68 * 0.185, 1);
    expect(v.C).toBeCloseTo(18349.68 * 0.0495, 1);
    expect(v.D).toBeCloseTo(3.6 * 22 * 12, 2);
    expect(v.E).toBeCloseTo(2.4 * 22 * 12, 2);
    expect(v.imponibile).toBeCloseTo(v.A + v.B + v.C + v.D + v.E, 2);
  });

  it('part-time 20h dimezza A e Cassa rispetto al full-time', async () => {
    const full = await calculateCosto({ ...baseInput, oreLavoro: 40, oreSettimanali: 40 });
    const half = await calculateCosto({ ...baseInput, oreLavoro: 20, oreSettimanali: 20 });

    const aFull = full.voci.find(v => v.id === 'edile_a')!.importoAnnuo;
    const aHalf = half.voci.find(v => v.id === 'edile_a')!.importoAnnuo;
    expect(aHalf).toBeCloseTo(aFull / 2, 1);

    const cassaFull = full.voci.find(v => v.id === 'cassa_edile')!.importoAnnuo;
    const cassaHalf = half.voci.find(v => v.id === 'cassa_edile')!.importoAnnuo;
    // G include coefficienti fissi orari: la Cassa non è esattamente metà, ma ridotta con il part-time
    expect(cassaHalf).toBeLessThan(cassaFull);
    expect(cassaHalf).toBeGreaterThan(cassaFull * 0.4);

    const dFull = full.voci.find(v => v.id === 'edile_d')!.importoAnnuo;
    const dHalf = half.voci.find(v => v.id === 'edile_d')!.importoAnnuo;
    expect(dHalf).toBe(dFull);
  });

  it('maggiorazione RAL solo sopra minimo tabellare × 12', () => {
    const vBase = calcolaVociEdili(1529.14, 40, undefined, cfg);
    const vMag = calcolaVociEdili(1529.14, 40, 20000, cfg);
    expect(vMag.A).toBe(20000);
    expect(vBase.A).toBeLessThan(vMag.A);
  });

  it('INPS datore 35,08% e nessun costo 13ª datore', async () => {
    const out = await calculateCosto(baseInput);
    const imponibile = out.voci
      .filter(v => ['edile_a', 'edile_b', 'edile_c', 'edile_d', 'edile_e'].includes(v.id))
      .reduce((s, v) => s + v.importoAnnuo, 0);
    const inps = out.voci.find(v => v.id === 'inps')!.importoAnnuo;
    expect(inps).toBeCloseTo(imponibile * 0.3508, 0);
    const tred = out.voci.find(v => v.id === 'tredicesima_cassa');
    expect(tred?.importoAnnuo).toBe(0);
    expect(out.voci.some(v => v.id === 'cassa_edile' && v.importoAnnuo > 0)).toBe(true);
    expect(out.voci.some(v => v.id === 'tfr')).toBe(true);
  });

  it('rifiuta livello quadro', async () => {
    await expect(
      calculateCosto({ ...baseInput, livello: '8' }),
    ).rejects.toThrow(/operaio/i);
  });

  it('cassa edile coerente con formula G', () => {
    const v = calcolaVociEdili(1529.14, 40, undefined, cfg);
    const cassa = calcolaCassaEdileAnnua(v.A, v.ratio, cfg);
    expect(cassa).toBeGreaterThan(4000);
  });
});
