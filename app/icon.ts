import { PNG_FAVICON_32, pngResponse } from '@/lib/brand-png';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return pngResponse(PNG_FAVICON_32);
}
