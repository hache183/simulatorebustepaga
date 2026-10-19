import { calculateCosto } from '@/lib/engine';
import { getCcnlData, pagaMensileBase } from '@/lib/ccnl';
import { round2 } from '@/lib/domestici';
import { ASSISTENZA_SANITARIA_FORFAIT_ANNUO, NOTA_ASSISTENZA_SANITARIA_FORFAIT } from '@/lib/costanti-consulente';

describe('note consulente — commercio e studi', () => {
  test('commercio liv.4 Puglia INAIL 0112 calcola senza errore', async () => {
    const ccnl = getCcnlData('commercio');
    const liv = ccnl.livelli.find(l => l.codice === '4')!;
    const ral = pagaMensileBase(liv) * 14;
    const result = await calculateCosto({
      ccnlId: 'commercio',
      livello: '4',
      ral,
      tipoContratto: 'tempo_indeterminato',
      oreLavoro: 40,
      mensilita: 14,
      anzianitaAnni: 0,
      numeroDipendenti: 10,
      regione: 'Puglia',
      codiceInail: '0112',
      agevolazioniSelezionate: [],
      includiAssistenzaSanitaria: true,
      aliquotaInps: 0.288,
      quotaNonGodute: 1,
    });
    expect(result.costoTotaleAnnuo).toBeGreaterThan(ral);
    const san = result.voci.find(v => v.id === 'assistenza_sanitaria')!;
    expect(san.importoAnnuo).toBeCloseTo(ASSISTENZA_SANITARIA_FORFAIT_ANNUO, 2);
    expect(san.notaLegge).toBe(NOTA_ASSISTENZA_SANITARIA_FORFAIT);
    expect(result.nettoDipendente.bonusCuneoFiscale).toBeGreaterThan(0);
  });

  test('studi professionali liv.4: CADIPROF 4,65 × 14 mesi', async () => {
    const ccnl = getCcnlData('studi_professionali');
    const liv = ccnl.livelli.find(l => l.codice === '4')!;
    const ral = pagaMensileBase(liv) * 14;
    const result = await calculateCosto({
      ccnlId: 'studi_professionali',
      livello: '4',
      ral,
      tipoContratto: 'tempo_indeterminato',
      oreLavoro: 40,
      mensilita: 14,
      anzianitaAnni: 0,
      numeroDipendenti: 5,
      regione: 'Puglia',
      codiceInail: '0723',
      agevolazioniSelezionate: [],
      includiAssistenzaSanitaria: true,
      aliquotaInps: 0.2928,
    });
    expect(result.voci.find(v => v.id === 'assistenza_sanitaria')!.importoAnnuo).toBeCloseTo(ASSISTENZA_SANITARIA_FORFAIT_ANNUO, 2);
  });
});

describe('note consulente — FR domestici non conviventi', () => {
  test('ferie = (173×25/40) × paga oraria', async () => {
    const paga = 9.57;
    const ore = 25;
    const y = round2((173 * ore) / 40);
    const result = await calculateCosto({
      ccnlId: 'domestici',
      livello: 'D',
      ral: paga * ore * 52,
      tipoContratto: 'tempo_indeterminato',
      oreLavoro: ore,
      oreSettimanali: ore,
      mensilita: 13,
      pagaOraria: paga,
      convivente: false,
      anzianitaAnni: 0,
      numeroDipendenti: 1,
      regione: 'Lazio',
      codiceInail: '',
      agevolazioniSelezionate: [],
      includiAssistenzaSanitaria: false,
      aliquotaInps: 0,
      quotaNonGodute: 1,
    });
    const ferie = result.voci.find(v => v.id === 'ferie_permessi_festivita')!;
    expect(ferie.importoAnnuo).toBeCloseTo(y * paga, 2);
  });
});
