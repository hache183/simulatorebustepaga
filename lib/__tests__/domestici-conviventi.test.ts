import { calcolaRetribuzioneDomestici } from '@/lib/domestici';

describe('conviventi part-time tab. A proporzionale', () => {
  test('livello D a 35 h: mensile = tab. A × 35/54', () => {
    const ret = calcolaRetribuzioneDomestici({
      convivente: true,
      livello: 'D',
      oreSettimanali: 35,
      sostituzioneTitolare: false,
    });
    const attesoMensile = (1404.51 + 207.69) * (35 / 54);
    expect(ret.mensile).toBeCloseTo(attesoMensile, 2);
    expect(ret.oreSettimanali).toBe(35);
  });
});
