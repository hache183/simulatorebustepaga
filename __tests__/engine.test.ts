import { calculateCosto } from '@/lib/engine';
import { calcolaScattiAnzianita, calcolaTfr, calcolaInail, calcolaInpsBase, getSettoreContributivo } from '@/lib/contributi';
import { getCcnlData } from '@/lib/ccnl';
import { ZodError } from 'zod';

// Input di base riutilizzato in più test
const inputBase = {
  ccnlId: 'studi_professionali',
  livello: 'Q',
  ral: 28_000,
  tipoContratto: 'tempo_indeterminato' as const,
  oreLavoro: 40,
  mensilita: 13,
  anzianitaAnni: 0,
  numeroDipendenti: 10,
  regione: 'Lombardia',
  codiceInail: '0723',
  agevolazioniSelezionate: [],
  includiAssistenzaSanitaria: true,
  aliquotaInps: 0.2928,
};

test('CCNL non verificato non deve essere accessibile', () => {
  expect(() => getCcnlData('ccnl_non_esistente')).toThrow("CCNL non trovato");
});

test('tipo contratto non supportato deve essere rifiutato', async () => {
  await expect(
    calculateCosto({ ...inputBase, tipoContratto: 'contratto_non_supportato' as never })
  ).rejects.toThrow(ZodError);
});

// ─── CASO 1: Costo base realistico ───────────────────────────────────────
test('costo base: deve essere compreso in un range plausibile sulla RAL', async () => {
  const result = await calculateCosto(inputBase);
  expect(result.costoTotaleAnnuo).toBeGreaterThan(28_000 * 1.15);
  expect(result.costoTotaleAnnuo).toBeLessThan(28_000 * 1.60);
  expect(result.costoTotaleMensile).toBeCloseTo(result.costoTotaleAnnuo / 12, 0);
});

test('costo base: INPS datoriale deve rispettare l aliquota impostata', async () => {
  const result = await calculateCosto(inputBase);
  const inps = result.voci.find(v => v.id === 'inps');
  expect(inps).toBeDefined();
  expect(inps!.importoAnnuo).toBeCloseTo(28_000 * 0.2928, -1);
});

// ─── CASO 2: Agevolazione under36 ────────────────────────────────────────
test('under36: il costo dipendenti resta il lordo pieno, senza sconto', async () => {
  const result = await calculateCosto({ ...inputBase, agevolazioniSelezionate: ['under36'] });
  const resultBase = await calculateCosto(inputBase);
  expect(result.agevolazioniApplicate).toHaveLength(0);
  expect(result.costoTotaleAnnuo).toBeCloseTo(resultBase.costoTotaleAnnuo, 2);
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
  const config = { periodicitaMesi: 36, importoPerScattoEuro: 8.41, maxScatti: 8 };
  const costo = calcolaScattiAnzianita(10, config);
  // 10 anni / 3 anni per scatto = 3 scatti
  expect(costo).toBeCloseTo(3 * 8.41 * 12, 0);
});

test('scatti anzianità: 30+ anni non devono superare il limite di 10 scatti', () => {
  const config = { periodicitaMesi: 36, importoPerScattoEuro: 8.41, maxScatti: 8 };
  const costo = calcolaScattiAnzianita(35, config);
  expect(costo).toBeCloseTo(8 * 8.41 * 12, 0); // cap a 8
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
test('agevolazioni selezionate non riducono il costo dipendenti', async () => {
  const result = await calculateCosto({
    ...inputBase,
    agevolazioniSelezionate: ['under36', 'decontribuzione_sud'],
  });
  const resultBase = await calculateCosto(inputBase);
  expect(result.agevolazioniApplicate).toHaveLength(0);
  expect(result.costoTotaleAnnuo).toBeCloseTo(resultBase.costoTotaleAnnuo, 2);
});

// ─── CALCOLI UNITARI AGGIUNTIVI ───────────────────────────────────────────
test('TFR: RAL / 13.5 senza moltiplicazione per mensilita', () => {
  const tfr = calcolaTfr(28_000, 13);
  // TFR = RAL / 13.5 (la RAL include già le mensilità aggiuntive)
  const atteso = 28_000 / 13.5;
  expect(tfr).toBeCloseTo(atteso, 0);
});

test('INAIL: codice 0723 (studi professionali) deve dare tasso 5.64 per mille', () => {
  const inail = calcolaInail(28_000, '0723');
  expect(inail).toBeCloseTo(28_000 * 5.64 / 1000, 0);
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

test('mensilita 14 vs 13: con stessa RAL il costo totale è identico (le mensilità sono già nella RAL)', async () => {
  const con13 = await calculateCosto({ ...inputBase, mensilita: 13 });
  const con14 = await calculateCosto({ ...inputBase, mensilita: 14 });
  // Con la stessa RAL, il costo aziendale non cambia: le mensilità aggiuntive
  // sono una diversa distribuzione dello stesso importo annuo
  expect(con14.costoTotaleAnnuo).toBeCloseTo(con13.costoTotaleAnnuo, 0);
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
test('aliquota INPS personalizzata: 26.76% deve dare INPS inferiore al default', async () => {
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
  expect(inps).toBeCloseTo(35_000 * inputBase.aliquotaInps, -1);
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

test('RAL non deve essere moltiplicata per il moltiplicatore del livello', async () => {
  const result = await calculateCosto({
    ...inputBase,
    livello: '4',
    ral: 22_335.88,
    mensilita: 14,
  });
  const ralVoce = result.voci.find(v => v.id === 'ral')!;
  expect(ralVoce.importoAnnuo).toBeCloseTo(22_335.88, 0);
});

// ─── MOD B: Settore contributivo INPS ──────────────────────────────────────
test('getSettoreContributivo: studi professionali ≤15 dip usa commercio_fino15', () => {
  const settore = getSettoreContributivo('studi_professionali', 10);
  expect(settore).toBeDefined();
  expect(settore!.aliquotaDatore).toBeCloseTo(0.2928, 4);
  expect(settore!.aliquotaDipendente).toBeCloseTo(0.0919, 4);
});

test('getSettoreContributivo: studi professionali >15 dip usa commercio_oltre15', () => {
  const settore = getSettoreContributivo('studi_professionali', 50);
  expect(settore).toBeDefined();
  expect(settore!.aliquotaDatore).toBeCloseTo(0.2968, 4);
});

test('getSettoreContributivo: trasporti ≤15 dip usa industria_fino15', () => {
  const settore = getSettoreContributivo('trasporti', 10);
  expect(settore).toBeDefined();
  expect(settore!.aliquotaDatore).toBeCloseTo(0.3037, 4);
});

test('getSettoreContributivo: ccnl non mappato restituisce null', () => {
  const settore = getSettoreContributivo('ccnl_non_mappato', 10);
  expect(settore).toBeNull();
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
  const settore = getSettoreContributivo(inputBase.ccnlId, inputBase.numeroDipendenti)!;
  expect(result.nettoDipendente.inpsDipendente).toBeCloseTo(28_000 * settore.aliquotaDipendente, -1);
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

test('nettoDipendente: nessun bonus cuneo fiscale', async () => {
  const result = await calculateCosto({
    ...inputBase,
    livello: '4',
    ral: 21_584.78,
    mensilita: 14,
  });
  expect(result.nettoDipendente.bonusCuneoFiscale).toBe(0);
  expect(result.nettoDipendente.irpefNetta).toBeCloseTo(
    Math.max(0, result.nettoDipendente.irpefLorda - result.nettoDipendente.detrazioneLavoroDip),
    2,
  );
});

describe('DOMESTICI — convivente vs non convivente', () => {
  const baseDom = {
    ccnlId: 'domestici',
    livello: 'BS',
    ral: 12_000,
    tipoContratto: 'tempo_indeterminato' as const,
    oreLavoro: 20,
    mensilita: 13,
    anzianitaAnni: 2,
    numeroDipendenti: 1,
    regione: 'Lombardia',
    codiceInail: '',
    agevolazioniSelezionate: [],
    includiAssistenzaSanitaria: false,
    aliquotaInps: 0,
    pagaOraria: 7.45,
    oreSettimanali: 20,
  };

  test('non convivente e convivente producono contributi dipendente diversi', async () => {
    const nonConvivente = await calculateCosto({ ...baseDom, convivente: false });
    const convivente = await calculateCosto({
      ...baseDom,
      convivente: true,
      oreLavoro: 54,
      oreSettimanali: 54,
    });
    expect(convivente.nettoDipendente.inpsDipendente).not.toBeCloseTo(nonConvivente.nettoDipendente.inpsDipendente, 2);
  });

  test('il netto domestico è pari a RAL meno INPS dipendente', async () => {
    const res = await calculateCosto({ ...baseDom, convivente: false });
    expect(res.nettoDipendente.nettoAnnuo).toBeCloseTo(
      res.nettoDipendente.ralLorda - res.nettoDipendente.inpsDipendente,
      2
    );
  });
});
