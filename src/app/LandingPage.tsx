'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const FAQS = [
  {
    q: 'What happens when the network goes down?',
    a: "Rinsion needs internet, and we won't pretend otherwise. If the network drops, write it on paper and enter it when you're back. Nothing already recorded is lost.",
  },
  {
    q: 'How do I pay you?',
    a: 'Mobile money. We send you the number when your trial ends. No card, ever.',
  },
  {
    q: 'Do I need a computer?',
    a: 'No. Rinsion runs in the browser on the phone in your pocket. Nothing to install.',
  },
  {
    q: 'What if I send more than 400 texts?',
    a: 'They keep sending at GHS 0.05 each, added to your next month.',
  },
  {
    q: 'Will my staff actually use it?',
    a: 'They already send WhatsApp messages all day. Marking an order Ready is one tap, fewer steps than writing the line in the book. And because every action carries their name, the ones doing the work get the credit for it.',
  },
  {
    q: 'Can I get my records out?',
    a: 'Yes. Export your orders, customers and payments to a spreadsheet whenever you want. Your records are yours.',
  },
  {
    q: 'Do I have to enter all my old customers first?',
    a: "No. Start with today's orders and let the customer list build itself. Keep the book on the counter until you notice you've stopped reaching for it.",
  },
  {
    q: 'What if I stop paying?',
    a: "You get twelve days. For the first six everything keeps working. After that it goes read-only, so you can still open every record, you just can't add new ones.",
  },
]

const TODAY_ORDERS = [
  { name: 'Ama Owusu', order: 'ORD-4KP7MX2A', status: 'Ready', pillBg: '#E3EDE8', pillFg: '#0F3D2E', dot: '#0F3D2E', ready: 'Ready by 28 Jun', readyColor: '#57514A', bg: '#FFFFFF' },
  { name: 'Kwabena Mensah', order: 'ORD-3J8LTRNX', status: 'Processing', pillBg: '#F7EFD9', pillFg: '#6B4A10', dot: '#B8801F', ready: 'Ready by 29 Jun', readyColor: '#57514A', bg: '#FFFFFF' },
  { name: 'Akosua Boateng', order: 'ORD-M6YJT9ZK', status: 'Received', pillBg: '#EEEAE3', pillFg: '#4A443C', dot: '#8C857B', ready: 'Overdue', readyColor: '#A8382F', bg: '#FBF6F4' },
  { name: 'Yaw Darko', order: 'ORD-LE97YSNY', status: 'Collected', pillBg: '#EAEDE9', pillFg: '#455749', dot: '#5E7A6B', ready: 'Ready by 27 Jun', readyColor: '#57514A', bg: '#FFFFFF' },
]

const CheckIcon = ({ className = '', fill = '#0F3D2E' }: { className?: string; fill?: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill={fill} className={`flex-none mt-[5px] ${className}`} aria-hidden="true">
    <path d="M9 16.17 5.53 12.7a1 1 0 0 0-1.42 1.42l4.18 4.17a1 1 0 0 0 1.42 0L20.3 7.88a1 1 0 1 0-1.42-1.42L9 16.17Z" />
  </svg>
)

const RingLogo = ({ size = 20, stroke = '#FAF8F5' }: { size?: number; stroke?: string }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} className="block">
    <circle cx="50" cy="50" r="37" fill="none" stroke={stroke} strokeWidth="16" strokeLinecap="round" pathLength="100" strokeDasharray="86 14" transform="rotate(-56 50 50)" />
  </svg>
)

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({})
  const [reducedMotion, setReducedMotion] = useState(false)
  const [howP, setHowP] = useState(0)
  const [howActive, setHowActive] = useState(0)

  const stageWrapRef = useRef<HTMLDivElement>(null)
  const stageInnerRef = useRef<HTMLDivElement>(null)
  const howSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrap = stageWrapRef.current
    const inner = stageInnerRef.current
    if (!wrap || !inner) return
    const fit = () => {
      const scale = Math.min(1, wrap.clientWidth / 380)
      inner.style.transform = `scale(${scale})`
      wrap.style.height = `${500 * scale}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reducedMotion) return
    let raf: number | null = null
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = null
        const el = howSectionRef.current
        if (!el) return
        const total = el.offsetHeight - window.innerHeight
        if (total <= 0) return
        const scrolled = Math.min(Math.max(-el.getBoundingClientRect().top, 0), total)
        const t = scrolled / total
        const p = Math.min(t / 0.9, 1) * 2
        setHowP(p)
        setHowActive(Math.round(p))
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reducedMotion])

  const jumpTo = (i: number) => {
    const el = howSectionRef.current
    if (!el) return
    const total = el.offsetHeight - window.innerHeight
    if (total <= 0) return
    const top = window.scrollY + el.getBoundingClientRect().top + (i / 2) * 0.9 * total
    window.scrollTo({ top, behavior: 'smooth' })
  }

  const cardStyle = (i: number): React.CSSProperties | undefined => {
    if (reducedMotion) return undefined
    const dx = ((i - howP) * 100).toFixed(2)
    const op = Math.max(0, 1 - Math.min(1, Math.abs(i - howP) * 1.35))
    return {
      transform: `translateY(${dx}%)`,
      opacity: op,
      pointerEvents: howActive === i ? 'auto' : 'none',
    }
  }

  return (
    <div className="bg-canvas text-warm-950">
      {/* ============ HERO + NAV ============ */}
      <section id="top" className="relative overflow-hidden bg-[linear-gradient(168deg,#124a38_0%,#0F3D2E_46%,#0E3629_100%)] text-canvas">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(760px_520px_at_92%_-12%,rgba(255,255,255,.07),rgba(255,255,255,0)_60%),radial-gradient(520px_420px_at_4%_108%,rgba(194,90,60,.16),rgba(194,90,60,0)_62%)]" />

        <div className="relative z-20 mx-auto max-w-[1160px] px-[clamp(20px,5vw,40px)] pt-[22px]">
          <nav className="hidden md:flex items-center gap-7">
            <a href="#top" className="flex items-center gap-2 text-canvas font-extrabold text-[22px] tracking-[-0.04em]">
              <RingLogo size={20} />
              Rinsion
            </a>
            <a href="#top" className="text-canvas font-bold text-[15px] py-1.5 px-0.5 border-b-2 border-clay">Home</a>
            <a href="#how" className="text-canvas/70 font-medium text-[15px] py-1.5 px-0.5">How it works</a>
            <div className="flex-1" />
            <Link href="/login" className="text-canvas font-semibold text-[15px] py-2.5 px-1.5">Log in</Link>
          </nav>

          <nav className="flex md:hidden items-center justify-between">
            <a href="#top" className="flex items-center gap-2 text-canvas font-extrabold text-[21px] tracking-[-0.04em]">
              <RingLogo size={19} />
              Rinsion
            </a>
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="flex flex-col justify-center gap-[5px] w-11 h-11 px-2.5 bg-canvas/10 border-0 rounded-12 cursor-pointer"
            >
              <span className="block h-0.5 w-full bg-canvas rounded-sm" />
              <span className="block h-0.5 w-full bg-canvas rounded-sm" />
              <span className="block h-0.5 w-full bg-canvas rounded-sm" />
            </button>
          </nav>
        </div>

        <div className="relative z-10 mx-auto max-w-[1160px] px-[clamp(20px,5vw,40px)] pt-[clamp(52px,9vw,104px)] flex flex-wrap items-center gap-[clamp(36px,5vw,64px)]">
          <div className="flex-[1_1_400px] min-w-[min(100%,360px)] pb-[clamp(20px,4vw,48px)]">
            <h1 className="m-0 text-[clamp(34px,6vw,60px)] font-extrabold tracking-[-0.035em] leading-[1.03] text-balance">
              Know who took the order,<br />
              <span className="text-[#8FD3B4]">and who took the money.</span>
            </h1>
            <p className="mt-[clamp(22px,3vw,30px)] text-[clamp(16.5px,2vw,19px)] leading-[1.55] text-canvas/80 max-w-[40ch]">
              Rinsion replaces the exercise book. Every order and payment saved with a name and a time.
            </p>
            <div className="mt-[clamp(32px,4vw,44px)]">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2.5 bg-canvas text-brand font-bold text-[17px] py-4 px-[30px] rounded-12 shadow-[0_18px_40px_-18px_rgba(0,0,0,.55)] hover:bg-white hover:-translate-y-0.5 transition"
              >
                Start free trial
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F3D2E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
            </div>
            <p className="mt-[22px] flex items-center gap-2 text-[14px] text-canvas/70">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#C25A3C" aria-hidden="true"><path d="M9 16.17 5.53 12.7a1 1 0 0 0-1.42 1.42l4.18 4.17a1 1 0 0 0 1.42 0L20.3 7.88a1 1 0 1 0-1.42-1.42L9 16.17Z" /></svg>
              <span><b className="text-canvas font-bold">14 days free.</b> No mobile money or card upfront.</span>
            </p>
          </div>

          <div ref={stageWrapRef} className="flex-[1_1_380px] min-w-[min(100%,300px)] max-w-[480px] mx-auto self-end flex justify-center">
            <div ref={stageInnerRef} className="w-[380px] h-[500px] relative origin-top flex-none">
              {/* BACK: New order */}
              <div className="absolute -right-2 top-[26px] w-[272px] bg-white text-warm-950 rounded-22 shadow-[0_40px_70px_-34px_rgba(0,0,0,.55)] rotate-[4.5deg] overflow-hidden">
                <div className="px-[17px] pt-4 pb-[18px]">
                  <div className="text-[15px] font-extrabold tracking-[-0.02em] mb-[13px]">New order</div>
                  <div className="text-[10.5px] font-semibold tracking-[0.06em] uppercase text-warm-600 mb-1.5">Customer</div>
                  <div className="border border-warm-300 rounded-10 px-[11px] py-[9px] text-[12.5px] font-semibold mb-[11px]">Ama Owusu</div>
                  <div className="text-[10.5px] font-semibold tracking-[0.06em] uppercase text-warm-600 mb-1.5">Items</div>
                  <div className="flex gap-[7px] mb-1.5">
                    <div className="flex-1 border border-warm-300 rounded-10 px-2.5 py-[9px] text-xs font-semibold">Wash &amp; iron</div>
                    <div className="flex-1 border border-warm-300 rounded-10 px-2.5 py-[9px] text-xs text-warm-800">Shirt &times; 5</div>
                  </div>
                  <div className="flex gap-[7px]">
                    <div className="flex-1 border border-warm-300 rounded-10 px-2.5 py-[9px] text-xs font-semibold">Wash by weight</div>
                    <div className="flex-1 border border-warm-300 rounded-10 px-2.5 py-[9px] text-xs text-warm-800">6 kg</div>
                  </div>
                  <div className="flex items-center justify-between mt-[13px] pt-3 border-t border-warm-200">
                    <span className="tnum text-[16px] font-extrabold">GHS 90.00</span>
                    <span className="bg-brand text-canvas rounded-10 px-3.5 py-[9px] text-xs font-bold">Create Order</span>
                  </div>
                </div>
              </div>

              {/* FRONT: Dashboard */}
              <div className="absolute left-0 top-[70px] w-[300px] bg-white text-warm-950 rounded-22 shadow-[0_50px_90px_-34px_rgba(0,0,0,.62)] -rotate-3 overflow-hidden">
                <div className="flex items-center justify-between px-[15px] pt-[13px] pb-3 border-b border-warm-200">
                  <span className="flex items-center gap-1.5 font-extrabold text-[16px] tracking-[-0.04em]">
                    <RingLogo size={14} stroke="#0F3D2E" />
                    Rinsion
                  </span>
                  <span className="flex gap-1.5">
                    <span className="w-[27px] h-[27px] rounded-12 bg-warm-100 flex items-center justify-center">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#57514A" strokeWidth="2.4"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" strokeLinecap="round" /></svg>
                    </span>
                    <span className="w-[27px] h-[27px] rounded-12 bg-warm-100 flex items-center justify-center">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#57514A" strokeWidth="2.2"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" strokeLinejoin="round" /><path d="M10.3 21a2 2 0 0 0 3.4 0" strokeLinecap="round" /></svg>
                    </span>
                  </span>
                </div>
                <div className="px-[15px] pt-3.5 bg-canvas">
                  <div className="text-[18px] font-extrabold tracking-[-0.03em]">Clean Pro Laundry</div>
                  <div className="text-[11.5px] text-warm-700 mt-0.5">Friday, 17 July 2026</div>

                  <div className="bg-white border border-warm-300 rounded-18 mt-[13px]">
                    <div className="flex items-center justify-between px-[13px] py-[11px] border-b border-warm-200">
                      <span className="text-[12.5px] font-bold flex items-center gap-1.5">
                        Ready for collection
                        <span className="bg-brand text-canvas rounded-full min-w-[18px] h-[18px] inline-flex items-center justify-center text-[10.5px] font-bold">2</span>
                      </span>
                      <span className="text-[11px] text-warm-700">View all</span>
                    </div>
                    <div className="px-[13px] py-[11px] flex justify-between items-start gap-2">
                      <span>
                        <span className="block text-[13px] font-bold">Ama Owusu</span>
                        <span className="tnum block text-[10.5px] text-warm-700 mt-px">0244 567 890 &middot; Osu</span>
                      </span>
                      <span className="text-right">
                        <span className="block text-[8.5px] font-bold tracking-[0.1em] text-warm-700">CODE</span>
                        <span className="tnum block text-[15px] font-extrabold text-brand tracking-[0.08em]">K7MQ2P</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2.5">
                    <div className="bg-white border border-warm-300 rounded-18 px-3 py-[11px]">
                      <div className="text-[10.5px] text-warm-700 leading-[1.3]">Orders today</div>
                      <div className="tnum text-[20px] font-extrabold tracking-[-0.03em] mt-0.5">8</div>
                    </div>
                    <div className="bg-white border border-warm-300 rounded-18 px-3 py-[11px]">
                      <div className="text-[10.5px] text-warm-700 leading-[1.3]">Active customers this week</div>
                      <div className="tnum text-[20px] font-extrabold tracking-[-0.03em] mt-0.5">26</div>
                    </div>
                  </div>

                  <div className="bg-white border border-warm-300 rounded-18 mt-2.5 px-[13px] py-[11px]">
                    <div className="text-[12.5px] font-bold mb-[7px]">Recent activity</div>
                    <div className="flex gap-2 text-[10.5px] leading-[1.45] py-[3px] text-warm-800"><span className="tnum text-warm-700 flex-none">16:30</span><span><b className="text-warm-950 font-semibold">Adjoa</b> marked ORD-4KP7MX2A Ready. Text sent.</span></div>
                    <div className="flex gap-2 text-[10.5px] leading-[1.45] py-[3px] text-warm-800"><span className="tnum text-warm-700 flex-none">14:02</span><span><b className="text-warm-950 font-semibold">Adjoa</b> moved ORD-4KP7MX2A to Processing.</span></div>
                    <div className="flex gap-2 text-[10.5px] leading-[1.45] py-[3px] text-warm-800"><span className="tnum text-warm-700 flex-none">09:14</span><span><b className="text-warm-950 font-semibold">Kwesi</b> created order ORD-4KP7MX2A.</span></div>
                  </div>
                  <div className="h-[14px]" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="h-[clamp(30px,5vw,60px)]" />
      </section>

      {/* ============ THE BOOK ============ */}
      <section className="relative z-[2] -mt-[3.6vw] bg-white [clip-path:polygon(0_3.6vw,100%_0,100%_100%,0_100%)] pt-[calc(3.6vw+clamp(56px,8vw,92px))] px-[clamp(20px,5vw,40px)] pb-[clamp(56px,8vw,92px)]">
        <div className="max-w-[1120px] mx-auto">
          <div className="max-w-[640px] mb-[clamp(30px,4.5vw,48px)]">
            <div className="text-xs font-bold tracking-eyebrow-lg uppercase text-clay mb-3">The book</div>
            <h2 className="m-0 text-[clamp(25px,4.4vw,40px)] font-extrabold tracking-[-0.03em] leading-[1.1] text-balance">Your book holds the order. It holds nothing else.</h2>
          </div>
          <div className="flex flex-wrap gap-[clamp(28px,4vw,52px)] items-center">
            <div className="flex-[1_1_340px] min-w-[min(100%,300px)]">
              <div
                role="img"
                aria-label="A page from a laundry exercise book with incomplete entries."
                className="bg-[#FCFBF7] border border-[#DED8CC] rounded-md shadow-[0_26px_52px_-30px_rgba(26,26,26,.45)] pt-5 pb-5 pl-0 pr-[18px] relative overflow-hidden -rotate-[0.6deg]"
              >
                <div className="absolute top-0 bottom-0 left-12 w-px bg-clay/35" />
                <div className="pl-[62px] pr-4 [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_35px,#DCE4E8_35px,#DCE4E8_36px)]">
                  <div className="h-9 flex items-center gap-[7px] italic text-sm text-[#2E3A44] whitespace-nowrap overflow-hidden text-ellipsis">
                    Ama, 3 shirt 1 suit, 280, paid 100 <span className="text-[#A8382F] font-bold not-italic">?</span>
                  </div>
                  <div className="h-9 flex items-center gap-[7px] italic text-sm text-[#2E3A44]">Kwabena, 6kg, 60 <span className="text-[#A8382F] font-bold not-italic">?</span></div>
                  <div className="h-9 flex items-center gap-[7px] italic text-sm text-[#2E3A44]">Akosua, curtains, Friday <span className="text-[#A8382F] font-bold not-italic">??</span></div>
                  <div className="h-9 flex items-center gap-[7px] italic text-sm text-[#2E3A44]">Yaw, collected <span className="text-[#A8382F] font-bold not-italic">?</span></div>
                  <div className="h-9" />
                </div>
                <div className="mt-3 pl-[62px] text-xs text-warm-700 italic">Tuesday</div>
              </div>
            </div>
            <div className="flex-[1_1_340px] min-w-[min(100%,300px)]">
              <ul className="list-none m-0 p-0 flex flex-col gap-3">
                <li className="flex gap-2.5 items-start text-[16px] leading-[1.45]"><CheckIcon fill="#A8382F" /><span>Who wrote this line?</span></li>
                <li className="flex gap-2.5 items-start text-[16px] leading-[1.45]"><CheckIcon fill="#A8382F" /><span>Who took the GHS 100?</span></li>
                <li className="flex gap-2.5 items-start text-[16px] leading-[1.45]"><CheckIcon fill="#A8382F" /><span>Which of these is ready right now?</span></li>
              </ul>
              <p className="mt-[22px] text-[clamp(16px,2vw,18px)] leading-[1.55] text-warm-800 max-w-[44ch]">By Friday, nobody remembers Tuesday. Rinsion does.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="bg-canvas">
        <div ref={howSectionRef} className={reducedMotion ? 'static' : 'relative h-[280vh]'}>
          <div className={reducedMotion ? 'static pb-[clamp(20px,4vw,40px)]' : 'sticky top-0 h-screen overflow-hidden flex flex-col'}>
            <div className="flex-none max-w-[1120px] w-full mx-auto px-[clamp(20px,5vw,40px)] pt-[clamp(34px,7vh,72px)] pb-[clamp(12px,2.5vh,24px)] box-border">
              <div className="text-xs font-bold tracking-eyebrow-lg uppercase text-clay mb-3">How it works</div>
              <h2 className="m-0 text-[clamp(25px,4.4vw,40px)] font-extrabold tracking-[-0.03em] leading-[1.1] text-balance">From the counter to collected, in three steps.</h2>
              {!reducedMotion && (
                <div className="flex gap-2.5 mt-[clamp(14px,2.5vh,22px)]">
                  {[0, 1, 2].map((i) => (
                    <button
                      key={i}
                      onClick={() => jumpTo(i)}
                      aria-label="Go to step"
                      className={`h-[9px] rounded-full border-0 cursor-pointer p-0 transition-[width,background-color] duration-300 ease-out ${howActive === i ? 'w-[26px] bg-brand' : 'w-[9px] bg-[#CDD8D0]'}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className={reducedMotion ? 'static' : 'relative flex-1 min-h-0 overflow-hidden'}>
              {[
                {
                  n: 1,
                  title: 'Take the order.',
                  body: "Pick the customer, add the items by piece or by weight, and note who's paying now or on collection. The order gets a code the moment you save it.",
                  mock: (
                    <div className="w-full max-w-[320px] bg-white border border-warm-300 rounded-22 overflow-hidden shadow-[0_30px_60px_-34px_rgba(15,61,46,.4)]">
                      <div className="px-[18px] pt-[18px] pb-4">
                        <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-warm-700 mb-3">New order</div>
                        <div className="border border-warm-300 rounded-10 px-[13px] py-[11px] text-[13px] font-semibold mb-2.5">Ama Owusu &middot; 0244 567 890</div>
                        <div className="flex gap-2 mb-2">
                          <div className="flex-1 border border-warm-300 rounded-10 px-3 py-[11px] text-[13px] font-semibold">Wash &amp; iron</div>
                          <div className="flex-1 border border-warm-300 rounded-10 px-3 py-[11px] text-[13px] font-semibold">Shirt &times; 5</div>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1 border border-warm-300 rounded-10 px-3 py-[11px] text-[13px] font-semibold">Wash by weight</div>
                          <div className="flex-1 border border-warm-300 rounded-10 px-3 py-[11px] text-[13px] font-semibold">6 kg</div>
                        </div>
                        <div className="flex items-center justify-between mt-3.5 pt-[13px] border-t border-warm-200">
                          <span className="tnum text-[17px] font-extrabold">GHS 90.00</span>
                          <span className="bg-brand text-canvas rounded-10 px-[17px] py-[11px] text-[13px] font-bold">Create Order</span>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  n: 2,
                  title: 'Move it along.',
                  body: "Received, Processing, Ready, Collected. One tap moves the order forward, and every move is saved under the name of whoever tapped it. Mark it Ready and the customer gets a text.",
                  mock: (
                    <div className="w-full max-w-[320px] bg-white border border-warm-300 rounded-22 overflow-hidden shadow-[0_30px_60px_-34px_rgba(15,61,46,.4)]">
                      <div className="bg-[linear-gradient(160deg,#17604A,#0F3D2E)] text-canvas px-[18px] pt-4 pb-[18px]">
                        <div className="flex justify-end">
                          <span className="inline-flex items-center gap-1.5 bg-clay/25 text-[#E8B88A] rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.04em]"><span className="w-1.5 h-1.5 rounded-full bg-clay" />RECEIVED</span>
                        </div>
                        <div className="text-[10px] font-bold tracking-[0.12em] text-[#8FB6A5] mt-3">ORDER</div>
                        <div className="tnum text-[25px] font-extrabold tracking-[0.01em] mt-0.5">ORD-WT4AMV72</div>
                        <div className="text-xs text-[#A8C3B6] mt-[3px]">Pickup code S4TWJ5 &middot; Maltiti Rashid</div>
                      </div>
                      <div className="p-4">
                        <div className="flex gap-[11px] items-start py-[3px]">
                          <div className="w-[22px] flex-none flex flex-col items-center">
                            <div className="w-5 h-5 rounded-full border-2 border-brand bg-brand flex items-center justify-center"><i className="w-[7px] h-[7px] rounded-full bg-canvas block" /></div>
                            <div className="w-0.5 h-5 bg-brand mt-px" />
                          </div>
                          <div><div className="text-[13px] font-bold">Received</div><div className="tnum text-[10.5px] text-warm-700">16 Jul, 11:51</div></div>
                        </div>
                        <div className="flex gap-[11px] items-start py-[3px]">
                          <div className="w-[22px] flex-none flex flex-col items-center">
                            <div className="w-5 h-5 rounded-full border-2 border-warm-400 flex items-center justify-center"><i className="w-[7px] h-[7px] rounded-full bg-warm-400 block" /></div>
                            <div className="w-0.5 h-5 bg-warm-200 mt-px" />
                          </div>
                          <div><div className="text-[13px] font-semibold text-warm-700">Processing</div><div className="text-[10.5px] text-warm-700">Pending</div></div>
                        </div>
                        <div className="flex gap-[11px] items-start py-[3px]">
                          <div className="w-[22px] flex-none flex flex-col items-center">
                            <div className="w-5 h-5 rounded-full border-2 border-warm-400 flex items-center justify-center"><i className="w-[7px] h-[7px] rounded-full bg-warm-400 block" /></div>
                            <div className="w-0.5 h-5 bg-warm-200 mt-px" />
                          </div>
                          <div><div className="text-[13px] font-semibold text-warm-700">Ready</div><div className="text-[10.5px] text-warm-700">Pending</div></div>
                        </div>
                        <div className="flex gap-[11px] items-start py-[3px]">
                          <div className="w-[22px] flex-none flex flex-col items-center">
                            <div className="w-5 h-5 rounded-full border-2 border-warm-400 flex items-center justify-center"><i className="w-[7px] h-[7px] rounded-full bg-warm-400 block" /></div>
                          </div>
                          <div><div className="text-[13px] font-semibold text-warm-700">Collected</div><div className="text-[10.5px] text-warm-700">Pending</div></div>
                        </div>
                      </div>
                      <div className="flex gap-2 px-4 pb-4">
                        <span className="flex-1 bg-brand text-canvas rounded-10 px-3 py-2.5 text-xs font-bold text-center">Mark Processing</span>
                        <span className="flex-1 bg-clay text-white rounded-10 px-3 py-2.5 text-xs font-bold text-center">Record Payment</span>
                      </div>
                    </div>
                  ),
                },
                {
                  n: 3,
                  title: 'See everything at once.',
                  body: "Every order in one list, searchable by name or code. What's ready and what's still in the wash. Nothing lives in one person's head.",
                  mock: (
                    <div className="w-full max-w-[320px] bg-white border border-warm-300 rounded-22 overflow-hidden shadow-[0_30px_60px_-34px_rgba(15,61,46,.4)]">
                      <div className="px-[18px] pt-[18px] pb-1.5">
                        <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-warm-700 mb-2">Orders</div>
                        <div className="border border-warm-300 rounded-10 px-3 py-2.5 text-[12.5px] text-warm-600 mb-0.5">Search by name or code</div>
                      </div>
                      <div className="px-4 pb-4">
                        <div className="flex justify-between items-center py-2.5 border-b border-warm-200">
                          <span><span className="text-[13px] font-bold">Kwame</span><br /><span className="tnum text-[10.5px] text-warm-700">ORD-LE97YSNY</span></span>
                          <span className="text-right"><span className="inline-flex items-center gap-1 bg-[#EAEDE9] text-[#455749] rounded-full text-[10.5px] font-bold px-2.5 py-[3px]"><span className="w-1.5 h-1.5 rounded-full bg-[#5E7A6B]" />Collected</span><br /><span className="tnum text-xs font-bold">GHS 60.00</span></span>
                        </div>
                        <div className="flex justify-between items-center py-2.5 border-b border-warm-200">
                          <span><span className="text-[13px] font-bold">Ama Owusu</span><br /><span className="tnum text-[10.5px] text-warm-700">ORD-3J8LTRNX</span></span>
                          <span className="text-right"><span className="inline-flex items-center gap-1 bg-brand-tint text-brand rounded-full text-[10.5px] font-bold px-2.5 py-[3px]"><span className="w-1.5 h-1.5 rounded-full bg-brand" />Ready</span><br /><span className="tnum text-xs font-bold">GHS 50.00</span></span>
                        </div>
                        <div className="flex justify-between items-center py-2.5">
                          <span><span className="text-[13px] font-bold">Zoya</span><br /><span className="tnum text-[10.5px] text-warm-700">ORD-M6YJT9ZK</span></span>
                          <span className="text-right"><span className="inline-flex items-center gap-1 bg-[#F7EFD9] text-[#6B4A10] rounded-full text-[10.5px] font-bold px-2.5 py-[3px]"><span className="w-1.5 h-1.5 rounded-full bg-[#B8801F]" />Processing</span><br /><span className="tnum text-xs font-bold">GHS 30.00</span></span>
                        </div>
                      </div>
                    </div>
                  ),
                },
              ].map((step, i) => (
                <div
                  key={step.n}
                  className={
                    reducedMotion
                      ? 'static mb-[clamp(44px,7vw,80px)]'
                      : 'absolute inset-0 flex items-center justify-center px-[clamp(20px,5vw,40px)] box-border will-change-transform'
                  }
                  style={cardStyle(i)}
                >
                  <div className="w-full max-w-[1120px] mx-auto flex flex-wrap gap-[clamp(28px,4vw,56px)] items-center justify-center">
                    <div className="flex-[1_1_340px] min-w-[min(100%,300px)]">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-brand-tint text-brand font-extrabold text-[16px] mb-4">{step.n}</span>
                      <div className="text-[clamp(21px,2.7vw,27px)] font-extrabold tracking-[-0.03em] leading-[1.15]">{step.title}</div>
                      <p className="mt-3 text-[16px] leading-[1.55] text-warm-800 max-w-[44ch]">{step.body}</p>
                    </div>
                    <div className="flex-[1_1_300px] min-w-[min(100%,280px)] flex justify-center">{step.mock}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ THE RECORD ============ */}
      <section className="bg-white px-[clamp(20px,5vw,40px)] py-[clamp(56px,8vw,92px)]">
        <div className="max-w-[1120px] mx-auto">
          <div className="max-w-[640px] mb-[clamp(30px,4.5vw,48px)]">
            <div className="text-xs font-bold tracking-eyebrow-lg uppercase text-clay mb-3">The record</div>
            <h2 className="m-0 text-[clamp(25px,4.4vw,40px)] font-extrabold tracking-[-0.03em] leading-[1.1]">Every action carries a name.</h2>
          </div>
          <div className="bg-[linear-gradient(160deg,#232323,#141414)] text-canvas rounded-18 p-[clamp(22px,3vw,32px)] max-w-[640px] shadow-[0_30px_60px_-40px_rgba(0,0,0,.6)]">
            <div className="text-[18px] font-bold mb-4">Who did what, when</div>
            <div className="flex gap-3 py-2.5 border-b border-canvas/10 text-sm leading-[1.45]"><span className="tnum text-[12.5px] text-warm-600 w-[42px] flex-none">09:14</span><span><b className="font-semibold">Kwesi Appiah</b> created order ORD-4KP7MX2A</span></div>
            <div className="flex gap-3 py-2.5 border-b border-canvas/10 text-sm leading-[1.45]"><span className="tnum text-[12.5px] text-warm-600 w-[42px] flex-none">09:16</span><span><b className="font-semibold">Kwesi Appiah</b> recorded <span className="tnum">GHS 100.00</span></span></div>
            <div className="flex gap-3 py-2.5 border-b border-canvas/10 text-sm leading-[1.45]"><span className="tnum text-[12.5px] text-warm-600 w-[42px] flex-none">14:02</span><span><b className="font-semibold">Adjoa Frimpong</b> moved it to <span className="text-[#E8B88A] font-semibold">Processing</span></span></div>
            <div className="flex gap-3 py-2.5 text-sm leading-[1.45]"><span className="tnum text-[12.5px] text-warm-600 w-[42px] flex-none">16:30</span><span><b className="font-semibold">Adjoa Frimpong</b> marked it <span className="text-[#7FD6AE] font-bold">Ready</span>. Text sent.</span></div>
            <div className="mt-3.5 pt-[13px] border-t border-canvas/10 text-[13px] text-warm-600">Nobody has to remember Tuesday.</div>
          </div>
        </div>
      </section>

      {/* ============ YOUR MORNING ============ */}
      <section className="bg-canvas px-[clamp(20px,5vw,40px)] py-[clamp(56px,8vw,92px)]">
        <div className="max-w-[1120px] mx-auto">
          <div className="max-w-[640px] mb-[clamp(30px,4.5vw,48px)]">
            <div className="text-xs font-bold tracking-eyebrow-lg uppercase text-clay mb-3">Your morning</div>
            <h2 className="m-0 text-[clamp(25px,4.4vw,40px)] font-extrabold tracking-[-0.03em] leading-[1.1]">Open one screen and see the whole shop.</h2>
          </div>
          <div className="border border-warm-300 rounded-18 overflow-hidden bg-white">
            <div className="flex items-center justify-between gap-3 flex-wrap px-[22px] py-4 border-b border-warm-300">
              <div className="text-[15.5px] font-bold">Today</div>
              <div className="flex gap-[26px]">
                <div><div className="tnum text-[17px] font-bold">12</div><div className="text-[11.5px] text-warm-700">orders</div></div>
                <div><div className="tnum text-[17px] font-bold text-brand">GHS 840.00</div><div className="text-[11.5px] text-warm-700">collected</div></div>
              </div>
            </div>
            {TODAY_ORDERS.map((o) => (
              <div key={o.order} className="flex items-center justify-between gap-3 px-[22px] py-[15px] border-b border-warm-200 last:border-b-0" style={{ background: o.bg }}>
                <div className="min-w-0"><div className="text-[14.5px] font-semibold">{o.name}</div><div className="tnum text-xs text-warm-800">{o.order}</div></div>
                <div className="text-right flex-none">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-[11px] py-1 text-xs font-bold" style={{ background: o.pillBg, color: o.pillFg }}>
                    <span className="w-[7px] h-[7px] rounded-full" style={{ background: o.dot }} />
                    {o.status}
                  </span>
                  <div className="tnum text-xs mt-[3px]" style={{ color: o.readyColor }}>{o.ready}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BUILT FOR HERE ============ */}
      <section className="bg-white px-[clamp(20px,5vw,40px)] py-[clamp(56px,8vw,92px)]">
        <div className="max-w-[1120px] mx-auto flex flex-wrap gap-[clamp(28px,4vw,52px)] items-center">
          <div className="flex-[1_1_340px] min-w-[min(100%,300px)]">
            <div className="text-xs font-bold tracking-eyebrow-lg uppercase text-clay mb-3">Built for here</div>
            <h2 className="m-0 text-[clamp(25px,4.4vw,40px)] font-extrabold tracking-[-0.03em] leading-[1.1]">One text. The one that stops the calls.</h2>
            <ul className="list-none mt-[22px] p-0 flex flex-col gap-3">
              <li className="flex gap-2.5 items-start text-[16px] leading-[1.45]"><CheckIcon /><span>Sent through <b>mNotify</b>, a Ghanaian SMS network.</span></li>
              <li className="flex gap-2.5 items-start text-[16px] leading-[1.45]"><CheckIcon /><span>Cedis, local numbers, day-month dates.</span></li>
              <li className="flex gap-2.5 items-start text-[16px] leading-[1.45]"><CheckIcon /><span>Want a text on drop-off too? Switch it on.</span></li>
            </ul>
          </div>
          <div className="flex-[1_1_320px] min-w-[min(100%,280px)]">
            <div className="bg-[linear-gradient(150deg,#17604A,#0F3D2E)] rounded-18 p-[clamp(22px,3vw,30px)] text-canvas shadow-[0_32px_60px_-34px_rgba(15,61,46,.55)]">
              <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#8FB6A5] mb-3">What Ama receives</div>
              <div className="bg-canvas text-warm-950 rounded-12 px-[15px] py-[13px] text-sm leading-[1.5]">Clean Pro Laundry: Hi Ama, your order is ready for pickup. See you soon.</div>
              <div className="flex justify-between mt-2.5 text-[11.5px] text-[#A8C3B6]"><span>Today 16:30</span><span>via mNotify</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ BEFORE YOU ASK ============ */}
      <section className="bg-canvas px-[clamp(20px,5vw,40px)] py-[clamp(56px,8vw,92px)]">
        <div className="max-w-[1120px] mx-auto">
          <div className="max-w-[640px] mb-[clamp(24px,4vw,40px)]">
            <div className="text-xs font-bold tracking-eyebrow-lg uppercase text-clay mb-3">Before you ask</div>
            <h2 className="m-0 text-[clamp(25px,4.4vw,40px)] font-extrabold tracking-[-0.03em] leading-[1.1]">The questions every owner asks us.</h2>
          </div>
          <div className="flex flex-wrap gap-x-11">
            {FAQS.map((f, i) => (
              <div key={f.q} className="flex-[1_1_440px] min-w-[min(100%,300px)] border-b border-warm-300">
                <button
                  onClick={() => setFaqOpen((s) => ({ ...s, [i]: !s[i] }))}
                  className="w-full text-left cursor-pointer bg-transparent border-0 py-4 font-sans text-[16px] font-semibold text-warm-950 flex items-center justify-between gap-3.5"
                >
                  <span>{f.q}</span>
                  <span className="text-[22px] font-normal text-clay flex-none leading-none">{faqOpen[i] ? '–' : '+'}</span>
                </button>
                {faqOpen[i] && (
                  <p className="m-0 pb-4 text-[15px] leading-[1.55] text-warm-800 max-w-[52ch]">{f.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="bg-white px-[clamp(20px,5vw,40px)] py-[clamp(56px,8vw,92px)]">
        <div className="max-w-[1120px] mx-auto">
          <div className="text-center max-w-[520px] mx-auto mb-[clamp(30px,4.5vw,46px)]">
            <div className="text-xs font-bold tracking-eyebrow-lg uppercase text-clay mb-3">Pricing</div>
            <h2 className="m-0 text-[clamp(25px,4.4vw,40px)] font-extrabold tracking-[-0.03em] leading-[1.1]">One plan. That&apos;s the whole menu.</h2>
          </div>
          <div className="max-w-[480px] mx-auto">
            <div className="bg-white border border-warm-300 rounded-18 p-[clamp(26px,4vw,36px)] shadow-[0_30px_64px_-40px_rgba(26,26,26,.32)]">
              <div className="flex items-baseline gap-2 justify-center"><span className="tnum text-[clamp(36px,7vw,48px)] font-extrabold tracking-[-0.03em]">GHS 120</span><span className="text-[15px] text-warm-800 font-medium">/ month</span></div>
              <div className="mt-2.5 text-center text-[15px] font-bold">Fourteen days free first.</div>
              <ul className="list-none mt-[26px] p-0 flex flex-col gap-[13px]">
                <li className="flex gap-2.5 items-start text-[15.5px] leading-[1.45]"><CheckIcon /><span>You, plus up to <b>5 staff</b></span></li>
                <li className="flex gap-2.5 items-start text-[15.5px] leading-[1.45]"><CheckIcon /><span><b>400 texts</b> a month</span></li>
                <li className="flex gap-2.5 items-start text-[15.5px] leading-[1.45]"><CheckIcon /><span>Unlimited orders, customers and payments</span></li>
                <li className="flex gap-2.5 items-start text-[15.5px] leading-[1.45]"><CheckIcon /><span>Every action logged. Export any time.</span></li>
              </ul>
              <Link href="/signup" className="flex items-center justify-center w-full mt-[26px] bg-brand text-canvas font-bold text-[16px] py-[15px] px-6 rounded-12 shadow-[0_14px_30px_-16px_rgba(15,61,46,.6)] hover:bg-brand-hover transition">
                Start free trial
              </Link>
            </div>
            <div className="max-w-[480px] mx-auto mt-4 text-center text-sm text-warm-800 border border-dashed border-warm-400 rounded-12 px-[18px] py-3.5">
              More than 5 staff? <a href="https://wa.me/233257528042" target="_blank" rel="noopener" className="font-semibold border-b border-brand/30">Message us on WhatsApp</a>.
            </div>
          </div>
        </div>
      </section>

      {/* ============ WHO WE ARE ============ */}
      <section className="bg-canvas px-[clamp(20px,5vw,40px)] py-[clamp(56px,8vw,92px)]">
        <div className="max-w-[1120px] mx-auto flex flex-wrap gap-[clamp(24px,4vw,48px)] items-center">
          <div className="flex-none">
            <div className="w-[clamp(160px,26vw,240px)] aspect-square rounded-2xl bg-[linear-gradient(150deg,#33735C,#0F3D2E)] flex items-center justify-center text-[#8FB6A5] text-[12.5px] text-center p-[18px]">Founder photo</div>
          </div>
          <div className="flex-[1_1_340px] min-w-[min(100%,300px)]">
            <div className="text-xs font-bold tracking-eyebrow-lg uppercase text-clay mb-3">Who we are</div>
            <h2 className="m-0 text-[clamp(25px,4.4vw,40px)] font-extrabold tracking-[-0.03em] leading-[1.1]">We&apos;re new, and we pick up the phone.</h2>
            <p className="mt-4 text-[clamp(16px,2vw,18px)] leading-[1.55] text-warm-800 max-w-[54ch]">Rinsion is built in Kumasi by Mansur Alidu. We&apos;re taking on our first laundries now and working with each one directly. When something breaks, you message a person, and that person is us.</p>
            <p className="mt-3.5 text-[clamp(16px,2vw,18px)] leading-[1.55] text-warm-800 max-w-[54ch]">We&apos;d rather say that plainly than pretend to be a big company.</p>
            <a href="https://wa.me/233257528042" target="_blank" rel="noopener" className="inline-flex items-center gap-2.5 mt-5 bg-white border border-warm-300 rounded-12 px-[18px] py-3 font-semibold text-[14.5px] text-brand hover:border-brand transition">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="#0F3D2E" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.05L2 22l5.1-1.34A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.03.8.81-2.95-.2-.31A8.2 8.2 0 1 1 12 20.2Zm4.5-6.13c-.25-.13-1.46-.72-1.68-.8-.23-.08-.39-.12-.55.13-.17.24-.64.8-.78.96-.14.17-.29.19-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.22-1.46-1.37-1.7-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.14.17-.24.25-.41.09-.16.04-.31-.02-.44-.06-.12-.55-1.34-.76-1.83-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.31-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.17 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.19 1.1.16 1.52.1.46-.07 1.46-.6 1.66-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.29Z" /></svg>
              Message us on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ============ CLOSING ============ */}
      <section className="bg-[linear-gradient(165deg,#17604A,#0F3D2E)] text-center text-canvas px-[clamp(20px,5vw,40px)] py-[clamp(60px,9vw,104px)]">
        <div className="max-w-[1120px] mx-auto">
          <h2 className="m-0 text-[clamp(26px,4.6vw,42px)] font-extrabold tracking-[-0.03em] leading-[1.1]">Start with tomorrow&apos;s first order.</h2>
          <p className="mt-3.5 mx-auto max-w-[40ch] text-[16px] text-[#A8C3B6]">Set up your laundry, add your staff, and take your first tracked order before the day ends.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2.5 mt-7 bg-canvas text-brand font-bold text-[17px] py-4 px-[30px] rounded-12 shadow-[0_18px_40px_-18px_rgba(0,0,0,.4)] hover:bg-white hover:-translate-y-0.5 transition"
          >
            Start free trial
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F3D2E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-warm-950 text-[#A8A29A]">
        <div className="max-w-[1120px] mx-auto px-[clamp(20px,5vw,40px)] py-[30px] flex items-center justify-between gap-4 flex-wrap">
          <a href="#top" className="flex items-center gap-2 text-canvas font-extrabold text-[21px] tracking-[-0.04em]">
            <RingLogo size={19} />
            Rinsion
          </a>
          <div className="flex gap-[22px] flex-wrap">
            <Link href="/privacy" className="text-[13px] text-[#A8A29A] hover:text-canvas transition">Privacy policy</Link>
            <Link href="/terms" className="text-[13px] text-[#A8A29A] hover:text-canvas transition">Terms of service</Link>
            <a href="https://wa.me/233257528042" target="_blank" rel="noopener" className="text-[13px] text-[#A8A29A] hover:text-canvas transition">WhatsApp</a>
          </div>
        </div>
        <div className="border-t border-canvas/10">
          <div className="max-w-[1120px] mx-auto px-[clamp(20px,5vw,40px)] py-3.5 text-xs text-warm-600">&copy; 2026 Rinsion. Built in Ghana.</div>
        </div>
      </footer>

      {/* ============ MOBILE MENU OVERLAY ============ */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] bg-[linear-gradient(168deg,#124a38,#0F3D2E)] text-canvas flex flex-col px-[clamp(20px,6vw,32px)] py-[22px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-extrabold text-[21px] tracking-[-0.04em]">
              <RingLogo size={19} />
              Rinsion
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="w-11 h-11 bg-canvas/10 border-0 rounded-12 cursor-pointer flex items-center justify-center"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#FAF8F5"><path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6 6.4 5Z" /></svg>
            </button>
          </div>
          <div className="flex-1 flex flex-col items-end justify-center gap-[22px] text-right">
            <a href="#top" onClick={() => setMenuOpen(false)} className="text-[30px] font-extrabold tracking-[-0.03em] text-canvas">Home</a>
            <a href="#how" onClick={() => setMenuOpen(false)} className="text-[30px] font-extrabold tracking-[-0.03em] text-canvas/60">How it works</a>
            <Link href="/signup" className="text-[30px] font-extrabold tracking-[-0.03em] text-canvas/60">Sign up</Link>
            <Link href="/login" className="text-[30px] font-extrabold tracking-[-0.03em] text-canvas/60">Log in</Link>
          </div>
        </div>
      )}
    </div>
  )
}
