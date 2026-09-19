import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'gradient' | 'secondary' | 'ghost' | 'danger' | 'success';

const VARIANT: Record<Variant, string> = {
  gradient:
    'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg',
  secondary: 'bg-gray-800 hover:bg-gray-700 text-white',
  ghost: 'text-gray-400 hover:text-white hover:bg-gray-800',
  danger: 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
  success: 'bg-green-500/20 text-green-400 hover:bg-green-500/30',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'gradient',
  loading = false,
  children,
  className = '',
  disabled,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2
                  text-sm font-medium transition-all duration-200 active:scale-[0.98]
                  disabled:cursor-not-allowed disabled:opacity-50
                  ${VARIANT[variant]} ${className}`}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
