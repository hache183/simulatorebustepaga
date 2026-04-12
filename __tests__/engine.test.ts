import { calculateCosto } from '@/lib/engine';
import { calcolaScattiAnzianita, calcolaTfr, calcolaInail, calcolaInpsBase, getSettoreContributivo } from '@/lib/contributi';
import { ZodError } from 'zod';

// Input di base riutilizzato in più test
const inputBase = {
  ccnlId: 'commercio',
  livello: 'Q',
  ral: 28_000,
  tipoContratto: 'tempo_indeterminato' as const,
  oreLavoro: 40,
  mensilita: 13,
  anzianitaAnni: 0,
  numeroDipendenti: 10,
  regione: 'Lombardia',
  codiceInail: '0721',
  agevolazioniSelezionate: [],
  includiAssistenzaSanitaria: true,
  aliquotaInps: 0.288,
};

// ─── CASO 1: Costo base realistico ───────────────────────────────────────
test('costo base: deve essere tra 128% e 150% della RAL', async () => {
  const result = await calculateCosto(inputBase);
  expect(result.costoTotaleAnnuo).toBeGreaterThan(28_000 * 1.28);
  expect(result.costoTotaleAnnuo).toBeLessThan(28_000 * 1.50);
  expect(result.costoTotaleMensile).toBeCloseTo(result.costoTotaleAnnuo / 12, 0);
});

test('costo base: INPS datoriale deve essere circa 28.80% della RAL', async () => {
  const result = await calculateCosto(inputBase);
  const inps = result.voci.find(v => v.id === 'inps');
  expect(inps).toBeDefined();
  expect(inps!.importoAnnuo).toBeCloseTo(28_000 * 0.288, -1);
});

// ─── CASO 2: Agevolazione under36 ────────────────────────────────────────
test('under36: deve applicare risparmio positivo entro il massimale di 6.000 euro', async () => {
  const result = await calculateCosto({ ...inputBase, agevolazioniSelezionate: ['under36'] });
  const agev = result.agevolazioniApplicate.find(a => a.id === 'under36');
  expect(agev).toBeDefined();
  expect(agev!.risparmioAnnuo).toBeGreaterThan(0);
  expect(agev!.risparmioAnnuo).toBeLessThanOrEqual(6_000);
  // Il costo totale deve essere inferiore al caso senza agevolazioni
  const resultBase = await calculateCosto(inputBase);
  expect(result.costoTotaleAnnuo).toBeLessThan(resultBase.costoTotaleAnnuo);
});

// ─── CASO 3: Part-time 20 ore ─────────────────────────────────────────────
test('part-time 20h: il costo deve essere circa la metà del full-time (±10%)', async () => {
  const resultFull = await calculateCosto(inputBase);
  const resultPart = await calculateCosto({ ...inputBase, oreLavoro: 20 });
  const rapporto = resultPart.costoTotaleAnnuo / resultFull.costoTotaleAnnuo;
  expect(rapporto).toBeGreaterThan(0.40);
  expect(rapporto).toBeLessThan(0.60);
});

// ─── CASO 4: Scatti di anzianità ─────────────────────────────────────────
test('scatti anzianità: 10 anni devono produrre scatti corretti (triennali, max 10)', () => {
  const config = { periodicitaMesi: 36, importoPerScattoEuro: 19.73, maxScatti: 10 };
  const costo = calcolaScattiAnzianita(10, config);
  // 10 anni / 3 anni per scatto = 3 scatti
  expect(costo).toBeCloseTo(3 * 19.73 * 12, 0);
});

test('scatti anzianità: 30+ anni non devono superare il limite di 10 scatti', () => {
  const config = { periodicitaMesi: 36, importoPerScattoEuro: 19.73, maxScatti: 10 };
  const costo = calcolaScattiAnzianita(35, config);
  expect(costo).toBeCloseTo(10 * 19.73 * 12, 0); // cap a 10
});

// ─── CASO 5: Input invalidi ───────────────────────────────────────────────
test('input invalido: RAL negativa deve lanciare ZodError', async () => {
  await expect(calculateCosto({ ...inputBase, ral: -1000 })).rejects.toThrow(ZodError);
});

test('input invalido: ccnlId vuoto deve lanciare ZodError', async () => {
  await expect(calculateCosto({ ...inputBase, ccnlId: '' })).rejects.toThrow(ZodError);
});

test('input invalido: codice INAIL inesistente deve lanciare Error', async () => {
  await expect(calculateCosto({ ...inputBase, codiceInail: 'XXXX' })).rejects.toThrow('non trovato');
});

// ─── CASO 6: Agevolazioni non cumulabili ─────────────────────────────────
test('non cumulabilità: under36 + decontribuzione_sud devono produrre solo 1 agevolazione con risparmio', async () => {
  const result = await calculateCosto({
    ...inputBase,
    agevolazioniSelezionate: ['under36', 'decontribuzione_sud'],
  });
  const conRisparmio = result.agevolazioniApplicate.filter(a => a.risparmioAnnuo > 0);
  expect(conRisparmio).toHaveLength(1);
  // Quella esclusa deve avere avvertenza
  const conAvvertenza = result.agevolazioniApplicate.filter(a => a.avvertenza);
  expect(conAvvertenza.length).toBeGreaterThanOrEqual(1);
});

// ─── CALCOLI UNITARI AGGIUNTIVI ───────────────────────────────────────────
test('TFR: RAL / 13.5 senza moltiplicazione per mensilita', () => {
  const tfr = calcolaTfr(28_000, 13);
  // TFR = RAL / 13.5 (la RAL include già le mensilità aggiuntive)
  const atteso = 28_000 / 13.5;
  expect(tfr).toBeCloseTo(atteso, 0);
});

test('INAIL: codice 0721 (uffici) deve dare tasso 12.09 per mille', () => {
  const inail = calcolaInail(28_000, '0721');
  expect(inail).toBeCloseTo(28_000 * 12.09 / 1000, 0);
});

// ─── VALIDAZIONE MENSILITÀ ────────────────────────────────────────────────

test('mensilita 12: deve lanciare ZodError — sotto il minimo di legge', async () => {
  await expect(
    calculateCosto({ ...inputBase, mensilita: 12 })
  ).rejects.toThrow(ZodError);
});

test('mensilita 17: deve lanciare ZodError — sopra il massimo ammesso', async () => {
  await expect(
    calculateCosto({ ...inputBase, mensilita: 17 })
  ).rejects.toThrow(ZodError);
});

test('mensilita 14: costo deve essere maggiore di mensilita 13 (quattordicesima inclusa)', async () => {
  const con13 = await calculateCosto({ ...inputBase, mensilita: 13 });
  const con14 = await calculateCosto({ ...inputBase, mensilita: 14 });
  expect(con14.costoTotaleAnnuo).toBeGreaterThan(con13.costoTotaleAnnuo);
  // La differenza deve essere circa una mensilità netta (RAL/12 + contributi)
  const differenza = con14.costoTotaleAnnuo - con13.costoTotaleAnnuo;
  expect(differenza).toBeGreaterThan(28_000 / 12); // almeno il lordo di una mensilità
});

test('mensilita 16: deve contenere voce mensilita_extra con importo corretto', async () => {
  const result = await calculateCosto({ ...inputBase, mensilita: 16 });
  const extra = result.voci.find(v => v.id === 'mensilita_extra');
  expect(extra).toBeDefined();
  // 16 - 14 = 2 mensilità extra, ognuna pari a RAL_effettiva / 12
  expect(extra!.importoAnnuo).toBeGreaterThan(0);
});

test('TFR con 14 mensilita: RAL/13.5 non dipende da mensilita', async () => {
  const con13 = await calculateCosto({ ...inputBase, mensilita: 13 });
  const con14 = await calculateCosto({ ...inputBase, mensilita: 14 });
  const tfr13 = con13.voci.find(v => v.id === 'tfr')!.importoAnnuo;
  const tfr14 = con14.voci.find(v => v.id === 'tfr')!.importoAnnuo;
  // TFR = RAL / 13.5 — stessa RAL → stesso TFR (la RAL non cambia con le mensilità)
  expect(tfr14).toBeCloseTo(tfr13, 0);
});

// ─── MOD2: Assistenza sanitaria ────────────────────────────────────────────
test('assistenza sanitaria esclusa: costo deve essere inferiore', async () => {
  const conSanitaria = await calculateCosto({ ...inputBase, includiAssistenzaSanitaria: true });
  const senzaSanitaria = await calculateCosto({ ...inputBase, includiAssistenzaSanitaria: false });
  expect(senzaSanitaria.costoTotaleAnnuo).toBeLessThan(conSanitaria.costoTotaleAnnuo);
});

// ─── MOD3: Aliquota INPS personalizzata ────────────────────────────────────
test('aliquota INPS personalizzata: 26.76% deve dare INPS inferiore al default 28.80%', async () => {
  const resultDefault = await calculateCosto(inputBase);
  const resultCustom = await calculateCosto({ ...inputBase, aliquotaInps: 0.2676 });
  const inpsDefault = resultDefault.voci.find(v => v.id === 'inps')!.importoAnnuo;
  const inpsCustom = resultCustom.voci.find(v => v.id === 'inps')!.importoAnnuo;
  expect(inpsCustom).toBeLessThan(inpsDefault);
  expect(inpsCustom).toBeCloseTo(28_000 * 0.2676, -1);
});

test('calcolaInpsBase con aliquotaOverride usa il valore fornito', () => {
  const inps = calcolaInpsBase(28_000, 0.25);
  expect(inps).toBeCloseTo(28_000 * 0.25, 0);
});

test('input invalido: aliquotaInps > 50% deve lanciare ZodError', async () => {
  await expect(
    calculateCosto({ ...inputBase, aliquotaInps: 0.55 })
  ).rejects.toThrow(ZodError);
});

// ─── MOD4: Retribuzione personalizzata ─────────────────────────────────────
test('retribuzione personalizzata: RAL effettiva deve usare il valore fornito', async () => {
  const result = await calculateCosto({
    ...inputBase,
    retribuzionePersonalizzata: 35_000,
  });
  // Con retribuzione personalizzata 35k, il costo INPS si basa su 35k
  const inps = result.voci.find(v => v.id === 'inps')!.importoAnnuo;
  expect(inps).toBeCloseTo(35_000 * 0.288, -1);
  // Il costo totale deve essere superiore a quello base (28k)
  const resultBase = await calculateCosto(inputBase);
  expect(result.costoTotaleAnnuo).toBeGreaterThan(resultBase.costoTotaleAnnuo);
});

test('retribuzione personalizzata: voce superminimo presente nei dettagli', async () => {
  const result = await calculateCosto({
    ...inputBase,
    retribuzionePersonalizzata: 35_000,
  });
  const superminimo = result.voci.find(v => v.id === 'superminimo');
  expect(superminimo).toBeDefined();
});

// ─── BUG 1 FIX: moltiplicatore non deve influenzare la RAL ────────────────
test('BUG1: RAL non deve essere moltiplicata per il moltiplicatore del livello', async () => {
  // Commercio livello 6: moltiplicatore 0.60, minimoTabellare 1541.77
  // RAL dal form: 1541.77 × 14 = 21584.78
  const result = await calculateCosto({
    ...inputBase,
    livello: '6',
    ral: 21_584.78,
    mensilita: 14,
  });
  // RAL effettiva deve essere 21584.78, NOT moltiplicata per 0.60
  const ralVoce = result.voci.find(v => v.id === 'ral')!;
  expect(ralVoce.importoAnnuo).toBeCloseTo(21_584.78, 0);
});

test('BUG1: Commercio livello 4, RAL deve corrispondere al valore inserito', async () => {
  // Commercio livello 4: minimoTabellare 1777.47, mensilità 14
  // RAL = 1777.47 × 14 = 24884.58
  const result = await calculateCosto({
    ...inputBase,
    livello: '4',
    ral: 24_884.58,
    mensilita: 14,
  });
  const ralVoce = result.voci.find(v => v.id === 'ral')!;
  expect(ralVoce.importoAnnuo).toBeCloseTo(24_884.58, 0);
});

// ─── MOD B: Settore contributivo INPS ──────────────────────────────────────
test('getSettoreContributivo: commercio ≤15 dip deve dare commercio_fino15', () => {
  const settore = getSettoreContributivo('commercio', 10);
  expect(settore).toBeDefined();
  expect(settore!.aliquotaDatore).toBeCloseTo(0.2928, 4);
});

test('getSettoreContributivo: commercio >15 dip deve dare commercio_oltre15', () => {
  const settore = getSettoreContributivo('commercio', 50);
  expect(settore).toBeDefined();
  expect(settore!.aliquotaDatore).toBeCloseTo(0.2968, 4);
});

test('getSettoreContributivo: metalmeccanici ≤15 dip deve dare industria_fino15', () => {
  const settore = getSettoreContributivo('metalmeccanici', 10);
  expect(settore).toBeDefined();
  expect(settore!.aliquotaDatore).toBeCloseTo(0.3037, 4);
});

test('getSettoreContributivo: edilizia deve dare edilizia_industria', () => {
  const settore = getSettoreContributivo('edilizia', 10);
  expect(settore).toBeDefined();
  expect(settore!.aliquotaDatore).toBeCloseTo(0.3447, 4);
});

// ─── MOD D: Netto dipendente ───────────────────────────────────────────────
test('nettoDipendente deve essere presente nel risultato', async () => {
  const result = await calculateCosto(inputBase);
  expect(result.nettoDipendente).toBeDefined();
  expect(result.nettoDipendente.nettoAnnuo).toBeGreaterThan(0);
  expect(result.nettoDipendente.nettoMensile12).toBeGreaterThan(0);
  expect(result.nettoDipendente.nettoPerMensilita).toBeGreaterThan(0);
});

test('nettoDipendente: netto annuo < RAL (contributi e tasse sottratti)', async () => {
  const result = await calculateCosto(inputBase);
  expect(result.nettoDipendente.nettoAnnuo).toBeLessThan(28_000);
});

test('nettoDipendente: INPS dipendente deve essere circa 9.19% della RAL', async () => {
  const result = await calculateCosto(inputBase);
  expect(result.nettoDipendente.inpsDipendente).toBeCloseTo(28_000 * 0.0919, -1);
});

test('nettoDipendente: imponibile IRPEF = RAL - INPS dipendente', async () => {
  const result = await calculateCosto(inputBase);
  const nd = result.nettoDipendente;
  expect(nd.imponibileIrpef).toBeCloseTo(nd.ralLorda - nd.inpsDipendente, 0);
});

test('nettoDipendente: IRPEF netta deve essere ≥ 0', async () => {
  const result = await calculateCosto(inputBase);
  expect(result.nettoDipendente.irpefNetta).toBeGreaterThanOrEqual(0);
});

test('nettoDipendente: disclaimer deve essere presente', async () => {
  const result = await calculateCosto(inputBase);
  expect(result.nettoDipendente.disclaimer).toBeTruthy();
});

test('nettoDipendente: part-time 20h netto annuo deve essere circa metà del full-time', async () => {
  const full = await calculateCosto(inputBase);
  const part = await calculateCosto({ ...inputBase, oreLavoro: 20 });
  const rapporto = part.nettoDipendente.nettoAnnuo / full.nettoDipendente.nettoAnnuo;
  // Non esattamente 0.50 perché le aliquote IRPEF sono progressive
  expect(rapporto).toBeGreaterThan(0.40);
  expect(rapporto).toBeLessThan(0.65);
});

test('nettoDipendente: bonus cuneo fiscale presente per redditi bassi', async () => {
  // RAL 21584.78 → imponibile ~19602 → sotto 20k → bonus 7.1%
  const result = await calculateCosto({
    ...inputBase,
    livello: '6',
    ral: 21_584.78,
    mensilita: 14,
  });
  expect(result.nettoDipendente.bonusCuneoFiscale).toBeGreaterThan(0);
});

// ─── GOLDEN TEST: CCNL Commercio Liv.6 (benchmark consulente) ─────────────
// Fonte: Wolters Kluwer One Lavoro RTF + correzioni consulente su CCF_000208.pdf
// Costo medio annuo target: ~30.891 € (dal RTF), almeno ~28.000–31.000 €
describe('GOLDEN TEST — CCNL Commercio Liv.6 full-time', () => {
  const goldenInput = {
    ccnlId: 'commercio',
    livello: '6',
    ral: 21_584.78, // 1541.77 × 14
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
  };

  test('RAL effettiva deve essere ~21.584,78 €', async () => {
    const result = await calculateCosto(goldenInput);
    const ral = result.voci.find(v => v.id === 'ral')!;
    expect(ral.importoAnnuo).toBeCloseTo(21_584.78, 0);
  });

  test('INPS datoriali deve essere ~6.216 € (28.80%)', async () => {
    const result = await calculateCosto(goldenInput);
    const inps = result.voci.find(v => v.id === 'inps')!;
    expect(inps.importoAnnuo).toBeCloseTo(21_584.78 * 0.288, -1);
  });

  test('TFR deve essere ~1.599 € (RAL / 13.5)', async () => {
    const result = await calculateCosto(goldenInput);
    const tfr = result.voci.find(v => v.id === 'tfr')!;
    expect(tfr.importoAnnuo).toBeCloseTo(21_584.78 / 13.5, -1);
  });

  test('INAIL deve essere ~157 € (tasso 7.31‰)', async () => {
    const result = await calculateCosto(goldenInput);
    const inail = result.voci.find(v => v.id === 'inail')!;
    expect(inail.importoAnnuo).toBeCloseTo(21_584.78 * 7.31 / 1000, 0);
  });

  test('Contributi CCNL fissi ~525 €/anno (fondi Est+Ebiter+Previcommercio)', async () => {
    const result = await calculateCosto(goldenInput);
    const ccnlContrib = result.voci.find(v => v.id === 'contributi_ccnl')!;
    // FondoEst 10.42 + Ebiter 4.58 + Previcommercio 28.85 = 43.85/mese × 12 = 526.20
    expect(ccnlContrib.importoAnnuo).toBeCloseTo((10.42 + 4.58 + 28.85) * 12, 0);
  });

  test('Costo totale annuo deve essere tra 28.000 € e 35.000 €', async () => {
    const result = await calculateCosto(goldenInput);
    expect(result.costoTotaleAnnuo).toBeGreaterThan(28_000);
    expect(result.costoTotaleAnnuo).toBeLessThan(35_000);
  });

  test('Elementi aggiuntivi CCNL presenti (ex festività, solidarietà)', async () => {
    const result = await calculateCosto(goldenInput);
    const elemAggiuntivi = result.voci.find(v => v.id === 'elementi_aggiuntivi');
    expect(elemAggiuntivi).toBeDefined();
    // exFestivita 5.07×12 + festivitaNonGodute 10.14×12 + contributoSolidarieta 2.89×12
    const atteso = (5.07 + 10.14 + 2.89) * 12;
    expect(elemAggiuntivi!.importoAnnuo).toBeCloseTo(atteso, 0);
  });
});
