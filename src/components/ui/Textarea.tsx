interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helpText?: string
  error?: string
}

export function Textarea({ label, helpText, error, className = '', id, ...rest }: TextareaProps) {
  const textareaId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className="flex flex-col gap-[7px]">
      {label && (
        <label htmlFor={textareaId} className="text-label font-medium text-warm-950">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`
          w-full min-h-[70px] resize-y font-sans text-ui px-[13px] py-[11px]
          border border-warm-400 rounded-7 bg-white text-warm-950
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
