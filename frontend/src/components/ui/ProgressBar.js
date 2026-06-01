export function ProgressBar({ value, max = 100, className = '' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`h-2 overflow-hidden rounded-badge bg-[#e5ded4] ${className}`}>
      <div className="h-full rounded-badge bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}
