import { calculateCosto } from '@/lib/engine';
import { getSettoreContributivo } from '@/lib/contributi';
import { calcolaNettoDaRedditoLordoEinpsPerc, DISCLAIMER_NETTO_DIPENDENTE } from '@/lib/irpef-lavoro-dipendente';
import aci from '@/data/aci-2026.json';
import { cercaVeicoli } from '@/lib/aci';
import { calcolaSoci, defaultStateSoci } from '@/lib/societari';

const inputMirrorEngine = {
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
  agevolazioniSelezionate: [] as string[],
  includiAssistenzaSanitaria: true,
  aliquotaInps: 0.2928,
};

describe('IRPEF condiviso: parità con netto dipendente engine', () => {
  test('stesso RAL effettiva, INPS dipendente e tipo contratto devono dare stesso netto annuo', async () => {
    const result = await calculateCosto(inputMirrorEngine);
    const settore = getSettoreContributivo(inputMirrorEngine.ccnlId, inputMirrorEngine.numeroDipendenti)!;
    const ralEffettiva = inputMirrorEngine.ral * (inputMirrorEngine.oreLavoro / 40);
    const fromLib = calcolaNettoDaRedditoLordoEinpsPerc(
      ralEffettiva,
      settore.aliquotaDipendente,
      inputMirrorEngine.tipoContratto,
      inputMirrorEngine.mensilita,
      DISCLAIMER_NETTO_DIPENDENTE,
      true,
    );
    expect(fromLib.nettoAnnuo).toBeCloseTo(result.nettoDipendente.nettoAnnuo, 0);
    expect(fromLib.irpefNetta).toBeCloseTo(result.nettoDipendente.irpefNetta, 0);
  });
});

describe('calcolaSoci — Gestione separata', () => {
  test('12.000 € al 35,03%: quota società 2.802,40 e costo 14.802,40', () => {
    const o = calcolaSoci(defaultStateSoci());
    expect(o.quotaSocieta).toBeCloseTo(2_802.40, 2);
    expect(o.costoTotaleDatore).toBeCloseTo(14_802.40, 2);
    expect(o.aliquotaInpsApplicata).toBeCloseTo(0.3503, 4);
    expect(o.dettaglioFiscale?.bonusCuneoFiscale).toBe(0);
    expect(o.dettaglioFiscale?.detrazioneLavoroDip ?? 0).toBeGreaterThan(0);
  });

  test('12.000 € al 24%: quota società 1.920 e costo 13.920', () => {
    const o = calcolaSoci({ ...defaultStateSoci(), haAltraCoperturaInps: true });
    expect(o.quotaSocieta).toBeCloseTo(1_920, 2);
    expect(o.costoTotaleDatore).toBeCloseTo(13_920, 2);
    expect(o.aliquotaInpsApplicata).toBeCloseTo(0.24, 4);
  });

  test('senza compenso, 10 giorni nazionali a 46,48: 464,80', () => {
    const o = calcolaSoci({
      ...defaultStateSoci(),
      modalita: 'senza_compenso',
      lordoAnnuo: 12_000,
      giorniTrasfertaNazionale: 10,
      importoTrasfertaNazionale: 46.48,
    });
    expect(o.compensoLordo).toBe(0);
    expect(o.quotaSocieta).toBe(0);
    expect(o.trasferteNazionali).toBeCloseTo(464.80, 2);
    expect(o.costoTotaleDatore).toBeCloseTo(464.80, 2);
    expect(o.nettoTotalePercepito).toBeCloseTo(464.80, 2);
  });

  test('100 km Grande Panda 1.2: rimborso 43,73', () => {
    const panda = aci.veicoli.find(v =>
      v.marca === 'FIAT'
      && v.modello === 'GRANDE PANDA 1.2 100CV MOD 2025'
      && v.costoKm === 0.4373,
    );
    expect(panda).toBeDefined();
    const o = calcolaSoci({
      ...defaultStateSoci(),
      modalita: 'senza_compenso',
      km: 100,
      costoKm: panda!.costoKm,
    });
    expect(o.rimborsoKm).toBeCloseTo(43.73, 2);
  });
});

describe('tabelle ACI 2026', () => {
  test('migliaia di veicoli e i quattro costi km di controllo', () => {
    expect(aci.veicoli.length).toBeGreaterThan(1000);
    const costo = (marca: string, modello: string) =>
      aci.veicoli.find(v => v.marca === marca && v.modello === modello && v.alimentazione === 'benzina' && v.inProduzione)?.costoKm;
    expect(costo('DACIA', 'SANDERO 2021 1.0 SCE 65CV')).toBe(0.3810);
    expect(costo('FIAT', 'GRANDE PANDA 1.2 100CV MOD 2025')).toBe(0.4373);
    expect(costo('RENAULT', 'CLIO 1.0 90CV MOD 2024')).toBe(0.4091);
    expect(costo('CITROEN', 'C3 1.2 100 CV MOD 2024')).toBe(0.4208);
  });

  test('la ricerca trova un modello da un pezzo di stringa', () => {
    const hits = cercaVeicoli(aci.veicoli, 'panda');
    expect(hits.some(v => v.modello.includes('GRANDE PANDA'))).toBe(true);
    expect(hits.every(v => `${v.marca} ${v.modello}`.toLowerCase().includes('panda'))).toBe(true);
  });
});
