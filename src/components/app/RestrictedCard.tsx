export function RestrictedCard() {
  return (
    <div className="bg-white border border-warm-300 rounded-18 py-[62px] px-[30px] flex flex-col items-center text-center">
      <span className="w-[60px] h-[60px] rounded-full bg-warm-150 flex items-center justify-center mb-[18px]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#9A9088">
          <path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5Zm3 8H9V6a3 3 0 0 1 6 0v3Z" />
        </svg>
      </span>
      <p className="text-[20px] font-semibold text-warm-950 mb-[7px]">Admin access only</p>
      <p className="text-ui-sm text-warm-800 max-w-[350px] leading-relaxed">
        This section is available to administrators. Ask an admin on your team if you need access.
      </p>
    </div>
  )
}
