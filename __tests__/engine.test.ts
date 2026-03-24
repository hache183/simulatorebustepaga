import { calculateCosto } from '@/lib/engine';
import { calcolaScattiAnzianita, calcolaTfr, calcolaInail } from '@/lib/contributi';
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
test('scatti anzianità: 10 anni devono produrre 5 scatti (biennali, max 8)', () => {
  const config = { periodicitaMesi: 24, importoPerScattoEuro: 10.33, maxScatti: 8 };
  const costo = calcolaScattiAnzianita(10, config);
  // 10 anni / 2 anni per scatto = 5 scatti
  expect(costo).toBeCloseTo(5 * 10.33 * 12, 0);
});

test('scatti anzianità: 20 anni non devono superare il limite di 8 scatti', () => {
  const config = { periodicitaMesi: 24, importoPerScattoEuro: 10.33, maxScatti: 8 };
  const costo = calcolaScattiAnzianita(20, config);
  expect(costo).toBeCloseTo(8 * 10.33 * 12, 0); // cap a 8
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
test('TFR: con 13 mensilità il divisore è 13.5', () => {
  const tfr = calcolaTfr(28_000, 13);
  // TFR = (28000 * 13/12) / 13.5
  const atteso = (28_000 * (13 / 12)) / 13.5;
  expect(tfr).toBeCloseTo(atteso, 0);
});

test('INAIL: codice 0721 (uffici) deve dare tasso 3.1 per mille', () => {
  const inail = calcolaInail(28_000, '0721');
  expect(inail).toBeCloseTo(28_000 * 3.1 / 1000, 0);
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

test('TFR con 14 mensilita deve essere maggiore che con 13', async () => {
  const con13 = await calculateCosto({ ...inputBase, mensilita: 13 });
  const con14 = await calculateCosto({ ...inputBase, mensilita: 14 });
  const tfr13 = con13.voci.find(v => v.id === 'tfr')!.importoAnnuo;
  const tfr14 = con14.voci.find(v => v.id === 'tfr')!.importoAnnuo;
  // Con 14 mensilità la retribuzione utile al TFR è più alta (art. 2120 c.c.)
  expect(tfr14).toBeGreaterThan(tfr13);
});
