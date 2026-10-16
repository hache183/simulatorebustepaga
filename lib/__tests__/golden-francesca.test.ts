import { calculateCosto } from '@/lib/engine';
import { getLivello, listCcnlIds, listCcnlIdsUi, pagaMensileBase } from '@/lib/ccnl';
import { calcolaCompensiSocietari } from '@/lib/societari';
import type { LivelloCcnl } from '@/types';

const round2 = (n: number) => Math.round(n * 100) / 100;

type LivelloExtra = LivelloCcnl & {
  retribuzioneMensileTabella?: number;
  scattoEuro?: number;
};

describe('GOLDEN D1 — Domestici non conviventi liv. A, 25h, TI', () => {
  // 6,51 €/h × 25 h × 4,33 = mensile, × 13 mensilità
  // Fascia >24h Circ. 9/2026: 0,31 lav. / 0,93 datore su ore × 52
  const mensile = round2(6.51 * 25 * 4.33);
  const ral = round2(mensile * 13);
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

  test('RAL = mensile (6,51 × 25 × 4,33) × 13', async () => {
    const result = await calculateCosto(input);
    expect(result.voci.find(v => v.id === 'ral')!.importoAnnuo).toBeCloseTo(ral, 2);
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

  test('netto da busta (senza IRPEF) = RAL − 403', async () => {
    const result = await calculateCosto(input);
    expect(result.nettoDipendente.nettoAnnuo).toBeCloseTo(ral - 403, 2);
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
    expect(result.voci.find(v => v.id === 'ral')!.importoAnnuo / 13).toBeCloseTo(908.10, 2);
  });
});

describe('GOLDEN DOM 16/09 — tabelle A/B/C e non conviventi', () => {
  const base = {
    tipoContratto: 'tempo_indeterminato' as const,
    mensilita: 13,
    anzianitaAnni: 0,
    numeroDipendenti: 1,
    regione: 'Lazio',
    codiceInail: '',
    agevolazioniSelezionate: [] as string[],
    includiAssistenzaSanitaria: false,
    includiCassaColf: false,
    aliquotaInps: 0,
    ral: 12_000,
  };

  test('A convivente FT livello A: mensile 908,10', async () => {
    const result = await calculateCosto({
      ...base,
      ccnlId: 'domestici',
      livello: 'A',
      oreLavoro: 54,
      oreSettimanali: 54,
      convivente: true,
    });
    expect(result.voci.find(v => v.id === 'ral')!.importoAnnuo / 13).toBeCloseTo(908.10, 2);
  });

  test('A convivente FT livello DS: mensile + indennità', async () => {
    const result = await calculateCosto({
      ...base,
      ccnlId: 'domestici_conviventi',
      livello: 'DS',
      oreLavoro: 54,
      oreSettimanali: 54,
      convivente: true,
    });
    expect(result.voci.find(v => v.id === 'ral')!.importoAnnuo / 13).toBeCloseTo(1474.73 + 207.69, 2);
  });

  test('B convivente 30 h: C 814,60 / BS 737,39 / B 702,25', async () => {
    for (const [livello, mensile] of [['C', 814.60], ['BS', 737.39], ['B', 702.25]] as const) {
      const result = await calculateCosto({
        ...base,
        ccnlId: 'domestici_conviventi',
        livello,
        oreLavoro: 30,
        oreSettimanali: 30,
        convivente: true,
      });
      expect(result.voci.find(v => v.id === 'ral')!.importoAnnuo / 13).toBeCloseTo(mensile, 2);
    }
  });

  test('C sostituzione CS 25 h: 964,51 mensili', async () => {
    const result = await calculateCosto({
      ...base,
      ccnlId: 'domestici_conviventi',
      livello: 'CS',
      oreLavoro: 25,
      oreSettimanali: 25,
      convivente: true,
      sostituzioneTitolare: true,
    });
    expect(result.voci.find(v => v.id === 'ral')!.importoAnnuo / 13).toBeCloseTo(964.51, 2);
    expect(round2(8.91 * 25 * 4.33)).toBeCloseTo(964.51, 2);
  });

  test('non convivente 9,57 × 25 × 4,33 ≈ 1.037 ±1 €', async () => {
    const result = await calculateCosto({
      ...base,
      ccnlId: 'domestici',
      livello: 'D',
      oreLavoro: 25,
      oreSettimanali: 25,
      pagaOraria: 9.57,
      convivente: false,
    });
    const mensile = result.voci.find(v => v.id === 'ral')!.importoAnnuo / 13;
    // 9,57 × 25 × 4,33 = 1.035,9525 → 1.035,95. Il foglio scrive 1.037 (scarto 1,05 €).
    expect(mensile).toBeCloseTo(round2(9.57 * 25 * 4.33), 2);
    expect(Math.abs(mensile - 1037)).toBeLessThanOrEqual(1.05);
  });

  test('part-time convivente su livello DS è rifiutato', async () => {
    await expect(calculateCosto({
      ...base,
      ccnlId: 'domestici_conviventi',
      livello: 'DS',
      oreLavoro: 30,
      oreSettimanali: 30,
      convivente: true,
    })).rejects.toThrow(/tab\. B/i);
  });
});

describe('GOLDEN C1 — Commercio stampa 14/09, RAL 24.944, 14 mensilità', () => {
  const ral = 24_944;
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
    agevolazioniSelezionate: ['under36'] as string[],
    includiAssistenzaSanitaria: true,
    aliquotaInps: 0.288,
    quotaNonGodute: 1,
  };

  test('default RAL non somma il terzo elemento', () => {
    const liv4 = getLivello('commercio', '4');
    expect(pagaMensileBase(liv4)).toBeCloseTo(liv4.minimoTabellare, 2);
    expect(pagaMensileBase({ ...liv4, terzoElemento: 100, retribuzioneMensileTabella: 9_999 })).toBeCloseTo(liv4.minimoTabellare, 2);
  });

  test('13ª e 14ª informative = RAL / 14', async () => {
    const result = await calculateCosto(input);
    expect(result.voci.find(v => v.id === 'tredicesima')!.importoAnnuo).toBeCloseTo(1_781.71, 2);
    expect(result.voci.find(v => v.id === 'quattordicesima')!.importoAnnuo).toBeCloseTo(1_781.71, 2);
  });

  test('INPS datore pieno, senza sconto agevolazioni', async () => {
    const result = await calculateCosto(input);
    const senza = await calculateCosto({ ...input, agevolazioniSelezionate: [] });
    expect(result.voci.find(v => v.id === 'inps')!.importoAnnuo).toBeCloseTo(ral * 0.288, 2);
    expect(result.voci.find(v => v.id === 'inps')!.descrizione).not.toMatch(/netti da agevolazioni/i);
    expect(result.costoTotaleAnnuo).toBeCloseTo(senza.costoTotaleAnnuo, 2);
    expect(result.agevolazioniApplicate).toHaveLength(0);
  });

  test('ferie/permessi/festività non godute e Fondo Est', async () => {
    const result = await calculateCosto(input);
    const atteso = 261 * ((ral / 14) / 173);
    expect(result.voci.find(v => v.id === 'ferie_permessi_festivita')!.importoAnnuo).toBeCloseTo(atteso, 2);
    expect(result.voci.find(v => v.id === 'assistenza_sanitaria')!.importoAnnuo).toBeCloseTo(13 * 12, 2);
    expect(result.voci.find(v => v.id === 'assistenza_sanitaria')!.descrizione).toBe('Assistenza sanitaria integrativa');
    expect(result.voci.find(v => v.id === 'ente_bilaterale_ebiter')).toBeDefined();
  });

  test('netto con bonus cuneo e INPS dipendente 9,19%', async () => {
    const result = await calculateCosto(input);
    expect(result.nettoDipendente.bonusCuneoFiscale).toBeGreaterThan(0);
    expect(result.nettoDipendente.inpsDipendente).toBeCloseTo(ral * 0.0919, 2);
    expect(result.nettoDipendente.irpefNetta).toBeCloseTo(
      Math.max(0, result.nettoDipendente.irpefLorda - result.nettoDipendente.detrazioneLavoroDip - result.nettoDipendente.bonusCuneoFiscale),
      2,
    );
  });

  test('quota non godute 0% azzera il costo ferie', async () => {
    const result = await calculateCosto({ ...input, quotaNonGodute: 0 });
    expect(result.voci.find(v => v.id === 'ferie_permessi_festivita')!.importoAnnuo).toBeCloseTo(0, 2);
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
    expect(pagaMensileBase(liv)).toBeCloseTo(2472.19, 2);
    expect(pagaMensileBase(liv)).toBeCloseTo(
      liv.minimoTabellare + (liv.contingenza ?? 0) + (liv.edr ?? 0) + (liv.altreIndennitaFisse ?? 0),
      2,
    );
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
  expect(ui).not.toContain('agricoltura_impiegati');
  expect(ui).not.toContain('agricoltura_operai');
  expect(ui.length).toBe(listCcnlIds().length - 4);
});
