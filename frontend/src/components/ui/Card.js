const VARIANT_CLS = {
  // Most glass content cards
  elevated: 'border border-[#ded7cd] bg-white/72 shadow-[0_24px_80px_rgba(45,37,24,0.08)] backdrop-blur-2xl transition-shadow duration-micro hover:shadow-card-hover',
  // Lighter cards (skill tiles, compact items)
  flat:     'border border-[#ded7cd] bg-white/72 shadow-card backdrop-blur-xl transition-shadow duration-micro hover:shadow-card-hover',
};

export function Card({ variant = 'elevated', className = '', children, ...rest }) {
  return (
    <div
      className={`rounded-input ${VARIANT_CLS[variant] ?? VARIANT_CLS.elevated} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
