import { LRUCache } from 'lru-cache';
import { redisCommand, redisConfigurato } from '@/lib/redis-rest';

/**
 * Limite condiviso tra le istanze serverless se UPSTASH_REDIS_REST_URL e
 * UPSTASH_REDIS_REST_TOKEN sono impostate. Senza Redis il contatore resta
 * nella memoria del processo: su Vercel non è condiviso e va considerato
 * solo un freno di emergenza.
 */
const memoria = new LRUCache<string, { n: number; reset: number }>({ max: 5000 });

export async function troppoFrequente(
  bucket: string,
  ip: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const key = `rl:${bucket}:${ip}`;
  if (redisConfigurato()) {
    try {
      const n = await redisCommand(['INCR', key]);
      if (n === 1) await redisCommand(['PEXPIRE', key, windowMs]);
      return typeof n === 'number' && n > max;
    } catch (e) {
      console.error('[rate-limit] Redis non disponibile, uso la memoria locale', e);
    }
  }
  return troppoFrequenteInMemoria(key, max, windowMs);
}

function troppoFrequenteInMemoria(key: string, max: number, windowMs: number): boolean {
  const ora = Date.now();
  const voce = memoria.get(key);
  if (!voce || ora >= voce.reset) {
    memoria.set(key, { n: 1, reset: ora + windowMs }, { ttl: windowMs });
    return false;
  }
  voce.n += 1;
  memoria.set(key, voce, { ttl: Math.max(1, voce.reset - ora) });
  return voce.n > max;
}
