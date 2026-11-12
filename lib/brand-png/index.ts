/**
 * PNG del marchio Costi Lavoro Italia (brand pack approvato), conservati in base64
 * e serviti byte per byte da /brand/<nome>.png, /icon, /apple-icon e /opengraph-image.
 */
import { PNG_FAVICON_32 } from './favicon-32';
import { PNG_LOCKUP_DARK } from './lockup-dark';
import { PNG_LOCKUP_LIGHT } from './lockup-light';
import { PNG_OG } from './og';
import { PNG_SEAL_CLEAN_180 } from './seal-clean-180';
import { PNG_SEAL_CLEAN_192 } from './seal-clean-192';
import { PNG_SEAL_CLEAN_512 } from './seal-clean-512';

/** File pubblicati sotto /brand. */
export const BRAND_FILES: Record<string, string> = {
  'lockup-dark.png': PNG_LOCKUP_DARK,
  'lockup-light.png': PNG_LOCKUP_LIGHT,
  'seal-clean-192.png': PNG_SEAL_CLEAN_192,
  'seal-clean-512.png': PNG_SEAL_CLEAN_512,
};

export { PNG_FAVICON_32, PNG_OG, PNG_SEAL_CLEAN_180 };

export function pngResponse(base64: string): Response {
  return new Response(Buffer.from(base64, 'base64'), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
