import { permanentRedirect } from 'next/navigation';

export default function CompensiSocietariRedirect() {
  permanentRedirect('/calcolatore?tab=soci');
}
