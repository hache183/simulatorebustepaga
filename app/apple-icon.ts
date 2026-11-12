import { PNG_SEAL_CLEAN_180, pngResponse } from '@/lib/brand-png';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return pngResponse(PNG_SEAL_CLEAN_180);
}
