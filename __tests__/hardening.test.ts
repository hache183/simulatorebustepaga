import { NextRequest } from 'next/server';
import { ipRichiesta } from '@/lib/client-ip';
import { escapeHtml } from '@/lib/html';
import { troppoFrequente } from '@/lib/rate-limit';
import { GET as cercaAci } from '@/app/api/aci/route';

beforeEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

test('escape HTML nell\'email', () => {
  expect(escapeHtml(`<img src=x onerror="alert(1)">`)).toBe(
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
  );
});

test('IP: x-real-ip vince su x-forwarded-for', () => {
  const headers = new Headers({
    'x-real-ip': '198.51.100.10',
    'x-forwarded-for': '203.0.113.5, 10.0.0.1',
  });
  expect(ipRichiesta({ headers })).toBe('198.51.100.10');
  expect(ipRichiesta({ headers: new Headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }) })).toBe('203.0.113.5');
});

test('rate limit in memoria blocca oltre la soglia', async () => {
  const ip = `203.0.113.${Math.floor(Math.random() * 200) + 20}`;
  expect(await troppoFrequente('test', ip, 2, 60_000)).toBe(false);
  expect(await troppoFrequente('test', ip, 2, 60_000)).toBe(false);
  expect(await troppoFrequente('test', ip, 2, 60_000)).toBe(true);
});

test('ricerca ACI non restituisce il catalogo intero', async () => {
  const res = await cercaAci(new NextRequest('http://localhost/api/aci?q=panda'));
  expect(res.status).toBe(200);
  const json = await res.json() as { veicoli: { marca: string; modello: string }[]; troncato: boolean };
  expect(json.veicoli.length).toBeGreaterThan(0);
  expect(json.veicoli.length).toBeLessThanOrEqual(40);
  expect(json.veicoli.every(v => `${v.marca} ${v.modello}`.toLowerCase().includes('panda'))).toBe(true);
});
