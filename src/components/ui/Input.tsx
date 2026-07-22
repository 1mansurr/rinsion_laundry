// Standard text input. Focus ring: emerald border + 3px soft glow (matches .rin-field:focus).

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helpText?: string
  error?: string
}

export function Input({ label, helpText, error, className = '', id, ...rest }: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className="flex flex-col gap-[7px]">
      {label && (
        <label htmlFor={inputId} className="text-label font-medium text-warm-950">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full font-sans text-ui px-[13px] py-[11px]
          border border-warm-400 rounded-12 bg-white text-warm-950
          placeholder:text-warm-600
          focus:outline-none focus:border-brand focus:shadow-focus-ring
          disabled:bg-warm-200 disabled:text-warm-500 disabled:cursor-not-allowed
          ${error ? 'border-error' : ''}
          ${className}
        `}
        {...rest}
      />
      {helpText && !error && (
        <p className="text-caption text-warm-800">{helpText}</p>
      )}
      {error && (
        <p className="text-caption text-error">{error}</p>
      )}
    </div>
  )
}
