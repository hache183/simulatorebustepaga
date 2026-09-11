import { calculateCosto } from '@/lib/engine';
import { getLivello, listCcnlIds, listCcnlIdsUi } from '@/lib/ccnl';
import { getSettoreContributivo } from '@/lib/contributi';
import { calcolaCompensiSocietari } from '@/lib/societari';
import type { CalcolatoreOutput, LivelloCcnl } from '@/types';

const round2 = (n: number) => Math.round(n * 100) / 100;

type LivelloExtra = LivelloCcnl & {
  retribuzioneMensileTabella?: number;
  scattoEuro?: number;
};

type OutputExtra = CalcolatoreOutput & {
  scomposizioneLivello?: { totale: number };
};

describe('GOLDEN D1 — Domestici non conviventi liv. A, 25h, TI', () => {
  // 6,51 €/h × 25 h × 52 sett. = 8.463,00
  // Fascia >24h Circ. 9/2026: 0,31 lav. / 0,93 datore
  const ral = round2(6.51 * 25 * 52);
  const input = {
    ccnlId: 'domestici',
    livello: 'A',
    ral,
    tipoContratto: 'tempo_indeterminato' as const,
    oreLavoro: 25,
    oreSettimanali: 25,
    pagaOraria: 6.51,
    mensilita: 13,
    anzianitaAnni: 0,
    numeroDipendenti: 1,
    regione: 'Lazio',
    codiceInail: '',
    agevolazioniSelezionate: [] as string[],
    includiAssistenzaSanitaria: false,
    includiCassaColf: false,
    aliquotaInps: 0,
  };

  test('RAL = 6,51 × 1300 = 8.463,00', async () => {
    const result = await calculateCosto(input);
    expect(result.voci.find(v => v.id === 'ral')!.importoAnnuo).toBeCloseTo(8463, 2);
  });

  test('INPS dipendente 0,31 × 1300 = 403,00; datore 0,93 × 1300 = 1.209,00', async () => {
    const result = await calculateCosto(input);
    expect(result.nettoDipendente.inpsDipendente).toBeCloseTo(403, 2);
    expect(result.voci.find(v => v.id === 'inps')!.importoAnnuo).toBeCloseTo(1209, 2);
  });

  test('INAIL voce separata = 0; CassaColf default off = 0', async () => {
    const result = await calculateCosto(input);
    expect(result.voci.find(v => v.id === 'inail')!.importoAnnuo).toBe(0);
    expect(result.voci.find(v => v.id === 'contributi_ccnl')!.importoAnnuo).toBeCloseTo(0, 2);
  });

  test('netto da busta (senza IRPEF) = 8.463 − 403 = 8.060', async () => {
    const result = await calculateCosto(input);
    expect(result.nettoDipendente.nettoAnnuo).toBeCloseTo(8060, 2);
    expect(result.nettoDipendente.disclaimer).toMatch(/senza IRPEF/i);
  });

  test('CassaColf on: 0,03 × 1300 = 39,00', async () => {
    const result = await calculateCosto({ ...input, includiCassaColf: true });
    expect(result.voci.find(v => v.id === 'contributi_ccnl')!.importoAnnuo).toBeCloseTo(39, 2);
  });
});

describe('GOLDEN D-CONV-A — Convivente liv. A, 54h, 13 mensilità, no CassaColf', () => {
  const input = {
    ccnlId: 'domestici',
    livello: 'A',
    ral: 11_805.30,
    tipoContratto: 'tempo_indeterminato' as const,
    oreLavoro: 54,
    oreSettimanali: 54,
    mensilita: 13,
    anzianitaAnni: 0,
    numeroDipendenti: 1,
    regione: 'Lazio',
    codiceInail: '',
    agevolazioniSelezionate: [] as string[],
    includiAssistenzaSanitaria: false,
    includiCassaColf: false,
    aliquotaInps: 0,
    convivente: true,
  };

  test('foglio Francesca al centesimo', async () => {
    const result = await calculateCosto(input);
    // RAL 908,10 × 13 = 11.805,30
    expect(result.voci.find(v => v.id === 'ral')!.importoAnnuo).toBeCloseTo(11_805.30, 2);
    // INPS datore 0,93 × 54 × 52 = 2.611,44
    expect(result.voci.find(v => v.id === 'inps')!.importoAnnuo).toBeCloseTo(2_611.44, 2);
    // TFR 11.805,30 / 13,5 = 874,47
    expect(result.voci.find(v => v.id === 'tfr')!.importoAnnuo).toBeCloseTo(874.47, 2);
    // 13ª informativa = una mensilità, non in somma
    expect(result.voci.find(v => v.id === 'tredicesima')!.importoAnnuo).toBeCloseTo(908.10, 2);
    expect(result.voci.find(v => v.id === 'contributi_ccnl')!.importoAnnuo).toBeCloseTo(0, 2);
    // COSTO = 15.291,21
    expect(result.costoTotaleAnnuo).toBeCloseTo(15_291.21, 2);
    // INPS dip 0,31 × 54 × 52 = 870,48 → netto 10.934,82
    expect(result.nettoDipendente.inpsDipendente).toBeCloseTo(870.48, 2);
    expect(result.nettoDipendente.nettoAnnuo).toBeCloseTo(10_934.82, 2);
  });
});

describe('GOLDEN C1 — Commercio 4°, 40h, 14 mensilità, 0 scatti, 10 dip., INAIL 0111', () => {
  const liv4 = getLivello('commercio', '4') as LivelloExtra;
  const ral = round2((liv4.retribuzioneMensileTabella ?? liv4.minimoTabellare) * 14);
  const settore = getSettoreContributivo('commercio', 10)!;
  const input = {
    ccnlId: 'commercio',
    livello: '4',
    ral,
    tipoContratto: 'tempo_indeterminato' as const,
    oreLavoro: 40,
    mensilita: 14,
    anzianitaAnni: 0,
    numeroDipendenti: 10,
    regione: 'Lombardia',
    codiceInail: '0111',
    agevolazioniSelezionate: [] as string[],
    includiAssistenzaSanitaria: true,
    includiPrevidenzaComplementare: false,
    aliquotaInps: 0.288,
  };

  test('usa colonna TOTALE 1.783,75 (non solo paga base 1.257,46)', () => {
    expect(liv4.retribuzioneMensileTabella ?? 0).toBeCloseTo(1783.75, 2);
    expect(liv4.minimoTabellare).toBeCloseTo(1257.46, 2);
    expect(ral).toBeCloseTo(24_972.50, 2);
  });

  test('RAL / INPS commercio_fino15 / TFR / 13ª', async () => {
    const result = await calculateCosto(input);
    expect(result.voci.find(v => v.id === 'ral')!.importoAnnuo).toBeCloseTo(24_972.50, 2);
    // 24.972,50 × 0,2928
    expect(settore.aliquotaDatore).toBeCloseTo(0.2928, 4);
    expect(result.voci.find(v => v.id === 'inps')!.importoAnnuo).toBeCloseTo(24_972.50 * 0.2928, 2);
    expect(result.voci.find(v => v.id === 'tfr')!.importoAnnuo).toBeCloseTo(24_972.50 / 13.5, 2);
    expect(result.voci.find(v => v.id === 'tredicesima')!.importoAnnuo).toBeCloseTo(24_972.50 / 14, 2);
  });
});

describe('GOLDEN M1 — Metalmeccanici C3, 40h, 13 mensilità, 2 scatti', () => {
  const liv = getLivello('metalmeccanici', 'C3') as LivelloExtra;
  // 4 anni / periodicità 24 mesi = 2 scatti
  const input = {
    ccnlId: 'metalmeccanici',
    livello: 'C3',
    ral: round2((liv.retribuzioneMensileTabella ?? liv.minimoTabellare) * 13),
    tipoContratto: 'tempo_indeterminato' as const,
    oreLavoro: 40,
    mensilita: 13,
    anzianitaAnni: 4,
    numeroDipendenti: 10,
    regione: 'Lombardia',
    codiceInail: '0721',
    agevolazioniSelezionate: [] as string[],
    includiAssistenzaSanitaria: true,
    aliquotaInps: 0.288,
  };

  test('scatti = 2 × scattoEuro C3 29,64 × 12 = 711,36', async () => {
    expect(liv.scattoEuro ?? 0).toBeCloseTo(29.64, 2);
    const result = await calculateCosto(input);
    expect(result.voci.find(v => v.id === 'scatti_anzianita')!.importoAnnuo).toBeCloseTo(2 * 29.64 * 12, 2);
  });
});

describe('GOLDEN P1 — FIPE QA usa colonna TOTALE WK', () => {
  const liv = getLivello('pubblici_esercizi', 'QA') as LivelloExtra;
  const ralTotale = round2((liv.retribuzioneMensileTabella ?? liv.minimoTabellare) * 14);
  const ralSoloMinimo = round2(liv.minimoTabellare * 14);

  test('TOTALE 2.472,19 ≠ minimo 1.854,49', () => {
    expect(liv.retribuzioneMensileTabella ?? 0).toBeCloseTo(2472.19, 2);
    expect(liv.minimoTabellare).toBeCloseTo(1854.49, 2);
    expect(ralTotale).toBeCloseTo(34_610.66, 2);
    expect(ralTotale).toBeGreaterThan(ralSoloMinimo);
  });

  test('RAL del calcolo = TOTALE × 14', async () => {
    const result = await calculateCosto({
      ccnlId: 'pubblici_esercizi',
      livello: 'QA',
      ral: ralTotale,
      tipoContratto: 'tempo_indeterminato' as const,
      oreLavoro: 40,
      mensilita: 14,
      anzianitaAnni: 0,
      numeroDipendenti: 10,
      regione: 'Lombardia',
      codiceInail: '0111',
      agevolazioniSelezionate: [],
      includiAssistenzaSanitaria: true,
      aliquotaInps: 0.288,
    });
    expect(result.voci.find(v => v.id === 'ral')!.importoAnnuo).toBeCloseTo(34_610.66, 2);
    expect((result as OutputExtra).scomposizioneLivello?.totale).toBeCloseTo(2472.19, 2);
  });
});

describe('Compensi societari — amministratore GS Circ. 8/2026', () => {
  test('35,03% senza altra copertura, riparto 2/3–1/3', () => {
    const out = calcolaCompensiSocietari({
      tipo: 'amministratore',
      compensoAnnuo: 40_000,
      iscrittoAltraGestione: false,
      regione: 'Lombardia',
    });
    expect(out.comingSoon).toBeFalsy();
    expect(out.aliquotaGs).toBeCloseTo(0.3503, 4);
    expect(out.gsTotale).toBeCloseTo(40_000 * 0.3503, 2);
    expect(out.gsCommittente).toBeCloseTo(out.gsTotale * (2 / 3), 2);
    expect(out.gsPercipiente).toBeCloseTo(out.gsTotale * (1 / 3), 2);
    expect(out.costoSocieta).toBeCloseTo(40_000 + out.gsCommittente, 2);
  });

  test('socio artigiano coming soon', () => {
    const out = calcolaCompensiSocietari({
      tipo: 'socio_artigiano',
      compensoAnnuo: 40_000,
      iscrittoAltraGestione: false,
      regione: 'Lombardia',
    });
    expect(out.comingSoon).toBe(true);
  });
});

test('UI elenca tutti i CCNL file-backed tranne duplicati interni', () => {
  const ui = listCcnlIdsUi();
  expect(ui).not.toContain('lavoro_domestico');
  expect(ui).not.toContain('domestici_conviventi');
  expect(ui).toContain('domestici');
  expect(ui).toContain('commercio');
  expect(ui).toContain('pubblici_esercizi');
  expect(ui).toContain('metalmeccanici');
  expect(ui.length).toBe(listCcnlIds().length - 2);
});
