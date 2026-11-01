import { LRUCache } from 'lru-cache';

const FINESTRA_MS = 900_000;
const MAX_INVII = 8;

const leadLimiter = new LRUCache<string, number[]>({ max: 2000, ttl: FINESTRA_MS });

export function leadRateLimited(ip: string): boolean {
  const ora = Date.now();
  const recenti = (leadLimiter.get(ip) ?? []).filter(t => ora - t < FINESTRA_MS);
  if (recenti.length >= MAX_INVII) return true;
  leadLimiter.set(ip, [...recenti, ora]);
  return false;
}
