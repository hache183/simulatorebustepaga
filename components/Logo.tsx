type Props = {
  variant?: 'full' | 'mark';
  tone?: 'navy' | 'cream';
  markSize?: number;
};

const NAVY = '#0C2340';
const GREEN = '#1B7A45';
const RED = '#C8102E';

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      className="logo-mark"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="48" height="48" rx="8" fill={NAVY} />
      <rect x="9" y="27" width="8" height="12" rx="1.2" fill={GREEN} />
      <rect x="20" y="16" width="8" height="23" rx="1.2" fill="#FFFFFF" />
      <rect x="31" y="8" width="8" height="31" rx="1.2" fill={RED} />
    </svg>
  );
}

export function Logo({ variant = 'full', tone = 'navy', markSize = 40 }: Props) {
  if (variant === 'mark') return <LogoMark size={markSize} />;
  const ink = tone === 'cream' ? '#F6F3EE' : NAVY;
  return (
    <span className={`logo logo--${tone}`}>
      <LogoMark size={markSize} />
      <span className="logo__word" style={{ color: ink }}>
        <span className="logo__strong">CostiLavoro</span>
        <span className="logo__light"> Italia</span>
      </span>
    </span>
  );
}
