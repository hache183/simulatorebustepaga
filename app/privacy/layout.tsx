import { AppHeader } from '@/components/AppHeader';
import { SiteFooter } from '@/components/SiteFooter';

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      {children}
      <SiteFooter />
    </>
  );
}
