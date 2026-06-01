const SIZE_CLS = {
  sm: 'h-9 rounded-input px-3 text-xs',
  md: 'h-11 rounded-input px-5 text-sm',
  lg: 'h-12 rounded-badge px-6 text-sm',
};

const VARIANT_CLS = {
  primary:   'bg-primary text-white hover:bg-[#255c43]',
  secondary: 'border border-[#d8d0c4] bg-white text-primary hover:bg-[#f5f0ea]',
  ghost:     'border border-[#ded7cd] bg-white/70 text-primary shadow-card backdrop-blur-xl hover:bg-white',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-extrabold transition-colors disabled:opacity-50 ${SIZE_CLS[size] ?? SIZE_CLS.md} ${VARIANT_CLS[variant] ?? VARIANT_CLS.primary} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
