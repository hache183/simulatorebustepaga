import { calculateCosto } from '@/lib/engine';
import { getSettoreContributivo } from '@/lib/contributi';
import { calcolaNettoDaRedditoLordoEinpsPerc, DISCLAIMER_NETTO_DIPENDENTE } from '@/lib/irpef-lavoro-dipendente';
import { calcolaSociScenario } from '@/lib/soci-amministratori';

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
    );
    expect(fromLib.nettoAnnuo).toBeCloseTo(result.nettoDipendente.nettoAnnuo, 0);
    expect(fromLib.irpefNetta).toBeCloseTo(result.nettoDipendente.irpefNetta, 0);
  });
});

describe('calcolaSociScenario', () => {
  const base = {
    lordoAnnuo: 12_000,
    aliquotaInpsId: 'p8' as const,
    haAltraCoperturaInps: false,
    tipoContrattoIrpef: 'tempo_indeterminato' as const,
    giorniTrasferte: 2,
    importoTrasfertaGiornaliera: 46.48,
    kmAutoPersonale: 0,
    tariffaKmEur: 0.37,
    giorniBuoniPasto: 10,
    importoBuonoPastoGiornaliero: 10,
  };

  test('senza compenso: costo datore = sola somma rimborsi', () => {
    const o = calcolaSociScenario({ ...base, modalita: 'senza_compenso' });
    const atteso = 2 * 46.48 + 10 * 10;
    expect(o.compensoLordo).toBe(0);
    expect(o.ritenutaInps).toBe(0);
    expect(o.costoTotaleDatore).toBeCloseTo(atteso, 2);
    expect(o.nettoTotalePercepito).toBeCloseTo(atteso, 2);
  });

  test('con compenso: costo datore = lordo + rimborsi', () => {
    const o = calcolaSociScenario({ ...base, modalita: 'con_compenso' });
    const rimborsi = 2 * 46.48 + 10 * 10;
    expect(o.costoTotaleDatore).toBeCloseTo(12_000 + rimborsi, 0);
    expect(o.nettoTotalePercepito).toBeGreaterThan(o.nettoDaCompenso);
    expect(o.dettaglioFiscale).not.toBeNull();
  });
});
