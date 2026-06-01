import { RISK } from '@/lib/constants';

export function RiskBadge({ level, className = '' }) {
  const meta = RISK[level] ?? RISK.low;
  return (
    <span className={`rounded-badge px-3 py-1.5 text-xs font-extrabold ${meta.cls} ${className}`}>
      {meta.label}
    </span>
  );
}
