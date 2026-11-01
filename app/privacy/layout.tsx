import { AppHeader } from '@/components/AppHeader';

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
