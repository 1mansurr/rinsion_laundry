// Native <select> with custom chevron overlay. Do not swap for a custom dropdown
// unless a specific screen requires searchability (e.g. Create Order item selectors).

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  helpText?: string
  error?: string
}

export function Select({ label, helpText, error, className = '', children, id, ...rest }: SelectProps) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className="flex flex-col gap-[7px]">
      {label && (
        <label htmlFor={selectId} className="text-label font-medium text-warm-950">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`
            w-full appearance-none font-sans text-ui px-[13px] py-[11px] pr-9
            border border-warm-400 rounded-7 bg-white text-warm-950
            focus:outline-none focus:border-brand focus:shadow-focus-ring
            disabled:bg-warm-200 disabled:text-warm-500 disabled:cursor-not-allowed
            ${error ? 'border-error' : ''}
            ${className}
          `}
          {...rest}
        >
          {children}
        </select>
        {/* Custom chevron */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="#6B6259"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
          aria-hidden
        >
          <path d="M12 15.5 5.7 9.2a1 1 0 0 1 1.4-1.4l5.9 5.9 5.9-5.9a1 1 0 1 1 1.4 1.4L12 15.5Z" />
        </svg>
      </div>
      {helpText && !error && (
        <p className="text-caption text-warm-800">{helpText}</p>
      )}
      {error && (
        <p className="text-caption text-error">{error}</p>
      )}
    </div>
  )
}
