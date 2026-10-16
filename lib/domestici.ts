import { getCcnlData } from './ccnl';

/** Ore settimanali → retribuzione mensile. 8,91 × 25 × 4,33 = 964,51. */
export const COEFFICIENTE_ORE_MESE_DEFAULT = 4.33;
export const ORE_PIENO_CONVIVENTE = 54;
export const ORE_MIN_PART_TIME_CONVIVENTE = 30;

export const ERRORE_PART_TIME_LIVELLO = 'part-time convivente ammesso solo C, B, BS (tab. B)';

export type RegimeDomestico = 'non_convivente' | 'convivente_a' | 'convivente_b' | 'convivente_c';

export interface ParametriRetribuzioneDomestici {
  convivente: boolean;
  livello: string;
  oreSettimanali: number;
  pagaOrariaInserita?: number;
  sostituzioneTitolare?: boolean;
  mensilita?: number;
}

export interface RetribuzioneDomestici {
  regime: RegimeDomestico;
  mensile: number;
  pagaOraria: number;
  oreSettimanali: number;
  mensilita: number;
  ral: number;
  descrizioneRal: string;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function coefficienteOreMese(): number {
  const n = getCcnlData('domestici').coefficienteOreMese;
  return typeof n === 'number' && n > 0 ? n : COEFFICIENTE_ORE_MESE_DEFAULT;
}

/**
 * Retribuzione domestici secondo i fogli del 16/09/2026.
 * Non conviventi e tab. C: orario × ore × 4,33, poi × mensilità del JSON.
 * Conviventi tempo pieno: mensile tab. A (più indennità di funzione), ore bloccate a 54.
 * Conviventi part-time: mensile tab. B per 30 h, proporzionato sulle ore.
 */
export function calcolaRetribuzioneDomestici(p: ParametriRetribuzioneDomestici): RetribuzioneDomestici {
  const nonConv = getCcnlData('domestici');
  const conv = getCcnlData('domestici_conviventi');
  const mensilita = p.mensilita ?? (p.convivente ? conv.mensilita : nonConv.mensilita);
  const coefficiente = coefficienteOreMese();

  if (!p.convivente) {
    const liv = nonConv.livelli.find(l => l.codice === p.livello);
    if (!liv) throw new Error(`Livello '${p.livello}' non trovato per i collaboratori non conviventi`);
    const pagaOraria = p.pagaOrariaInserita && p.pagaOrariaInserita > 0
      ? p.pagaOrariaInserita
      : liv.minimoTabellare;
    const mensile = round2(pagaOraria * p.oreSettimanali * coefficiente);
    const ral = round2(mensile * mensilita);
    return {
      regime: 'non_convivente',
      mensile,
      pagaOraria,
      oreSettimanali: p.oreSettimanali,
      mensilita,
      ral,
      descrizioneRal: `Retribuzione annua (${pagaOraria.toFixed(2)}€/ora × ${p.oreSettimanali}h/sett × ${coefficiente.toFixed(2)} × ${mensilita} mensilità)`,
    };
  }

  if (p.sostituzioneTitolare) {
    const riga = (conv.tabellaC ?? []).find(r => r.codice === p.livello);
    if (!riga) {
      throw new Error('Sostituzione titolare (tab. C) ammessa solo per i livelli CS e DS');
    }
    const pagaOraria = riga.orario;
    const mensile = round2(pagaOraria * p.oreSettimanali * coefficiente);
    const ral = round2(mensile * mensilita);
    return {
      regime: 'convivente_c',
      mensile,
      pagaOraria,
      oreSettimanali: p.oreSettimanali,
      mensilita,
      ral,
      descrizioneRal: `Retribuzione annua tab. C (${pagaOraria.toFixed(2)}€/ora × ${p.oreSettimanali}h/sett × ${coefficiente.toFixed(2)} × ${mensilita} mensilità)`,
    };
  }

  if (p.oreSettimanali < ORE_PIENO_CONVIVENTE) {
    if (p.oreSettimanali < ORE_MIN_PART_TIME_CONVIVENTE) {
      throw new Error('Part-time convivente: ore settimanali da 30 a meno di 54 (tab. B)');
    }
    const riga = (conv.tabellaB ?? []).find(r => r.codice === p.livello);
    if (!riga) throw new Error(ERRORE_PART_TIME_LIVELLO);
    const oreBase = riga.oreBase ?? ORE_MIN_PART_TIME_CONVIVENTE;
    const mensile = round2(riga.mensile30h * (p.oreSettimanali / oreBase));
    const pagaOraria = p.oreSettimanali > 0 ? mensile / (p.oreSettimanali * coefficiente) : 0;
    const ral = round2(mensile * mensilita);
    return {
      regime: 'convivente_b',
      mensile,
      pagaOraria,
      oreSettimanali: p.oreSettimanali,
      mensilita,
      ral,
      descrizioneRal: `Retribuzione annua tab. B (${riga.mensile30h.toFixed(2)}€ per ${oreBase}h × ${p.oreSettimanali}/${oreBase} × ${mensilita} mensilità)`,
    };
  }

  const rigaA = (conv.tabellaA ?? []).find(r => r.codice === p.livello);
  if (!rigaA) throw new Error(`Livello '${p.livello}' non trovato in tab. A conviventi`);
  const indennita = rigaA.indennitaFunzione > 0 ? rigaA.indennitaFunzione : 0;
  const mensile = round2(rigaA.mensile + indennita);
  const ral = round2(mensile * mensilita);
  const pagaOraria = ORE_PIENO_CONVIVENTE > 0 ? mensile / (ORE_PIENO_CONVIVENTE * coefficiente) : 0;
  return {
    regime: 'convivente_a',
    mensile,
    pagaOraria,
    oreSettimanali: ORE_PIENO_CONVIVENTE,
    mensilita,
    ral,
    descrizioneRal: `Retribuzione annua tab. A (${mensile.toFixed(2)}€/mese × ${mensilita} mensilità, tempo pieno ${ORE_PIENO_CONVIVENTE}h)`,
  };
}
