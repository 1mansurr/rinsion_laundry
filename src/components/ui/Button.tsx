'use client'

import { Spinner } from './Spinner'

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'destructive'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isPending?: boolean
  // For destructive variant: filled uses error-red bg (modal cancel confirmations)
  filled?: boolean
}

// Base: always on
const BASE =
  'inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:cursor-not-allowed rounded-12 focus:outline-none focus:shadow-focus-ring'

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-[14px] px-3.5 py-2.5',
  md: 'text-ui px-[18px] py-[11px]',
  lg: 'text-ui px-[22px] py-3',
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-brand text-[#FAF8F5] border-none hover:bg-brand-hover disabled:bg-warm-200 disabled:text-warm-500',
  accent: 'bg-clay text-[#FFF6F1] border-none hover:bg-clay-hover disabled:bg-warm-200 disabled:text-warm-500',
  secondary: 'bg-white text-warm-950 border border-warm-400 hover:bg-warm-200 disabled:bg-warm-200 disabled:text-warm-500',
  ghost: 'bg-transparent text-brand border-none hover:bg-[#E9F0EC] disabled:text-warm-500',
  destructive: 'bg-white text-error-fg border border-[#E0BBB6] hover:bg-[#F8ECEA] disabled:text-warm-500',
}

export function Button({
  variant = 'primary',
  size = 'md',
  isPending = false,
  filled = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || isPending

  // Filled destructive: red bg (for cancel-order confirmation dialogs)
  const variantClass =
    variant === 'destructive' && filled
      ? 'bg-error text-[#FFF1EF] border-none hover:bg-[#9A3730] disabled:bg-warm-200 disabled:text-warm-500'
      : VARIANT_CLASSES[variant]

  return (
    <button
      className={`${BASE} ${SIZE_CLASSES[size]} ${variantClass} ${className}`}
      disabled={isDisabled}
      {...rest}
    >
      {isPending ? <Spinner size={16} variant={variant === 'primary' || variant === 'accent' ? 'reversed' : 'default'} /> : children}
    </button>
  )
}
