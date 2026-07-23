// Live SMS preview with a character counter that shifts neutral -> amber -> red
// at the 140/160 thresholds (140 = approaching the single-segment limit, 160 =
// over it and billed as a second segment).
function smsCharColor(len: number) {
  if (len > 160) return 'text-error-fg'
  if (len > 140) return 'text-warning-fg'
  return 'text-warm-500'
}

interface SmsPreviewProps {
  message: string
  label?: string
  helpText?: string
}

export function SmsPreview({ message, label = 'SMS preview', helpText }: SmsPreviewProps) {
  const len = message.length

  return (
    <div>
      <p className="text-micro font-semibold text-warm-500 uppercase tracking-eyebrow mb-2.5">{label}</p>
      <div className="bg-white border border-warm-300 rounded-18 p-3.5">
        <p className="bg-[#E7EEF4] text-[#1A2A33] rounded-[14px_14px_14px_4px] px-3.5 py-3 text-body leading-relaxed">
          {message}
        </p>
        <div className="flex items-center justify-between mt-2.5">
          <span className={`tnum text-caption font-medium ${smsCharColor(len)}`}>
            {len} / 160 chars · {len <= 160 ? 'Fits comfortably' : 'Too long'}
          </span>
          <span className="text-caption text-warm-400">{len <= 160 ? '1 SMS segment' : '2 SMS segments'}</span>
        </div>
      </div>
      {helpText && <p className="text-caption text-warm-400 mt-2">{helpText}</p>}
    </div>
  )
}
