'use client'
import { useEffect, useCallback, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { AREAS } from '@/lib/presentacion/data'
import { OBRAS } from '@/lib/presentacion/obras-data'
import Link from 'next/link'

import SlidePortada from '@/components/slides/SlidePortada'
import SlideAlcance from '@/components/slides/SlideAlcance'
import SlideArea from '@/components/slides/SlideArea'
import SlideLogros from '@/components/slides/SlideLogros'
import SlideObra from '@/components/slides/SlideObra'
import SlideObrasConsolidado from '@/components/slides/SlideObrasConsolidado'
import SlideAppsProduccion from '@/components/slides/SlideAppsProduccion'
import SlideAppsCola from '@/components/slides/SlideAppsCola'
import SlideMapa from '@/components/slides/SlideMapa'
import SlideCierre from '@/components/slides/SlideCierre'

const TOTAL = 16
const LABELS = [
  'Portada', 'Logros', 'Alcance',
  'Finanzas', 'RRHH', 'Legal', 'Prevención', 'Estudios',
  'Obras', 'PET CT', 'Corona MAM', 'Consolidado',
  'Apps Producción', 'Apps Cola',
  'Mapa Global', 'Próximos Pasos',
]

function getSlide(n: number) {
  if (n === 1) return <SlidePortada />
  if (n === 2) return <SlideLogros />
  if (n === 3) return <SlideAlcance />
  if (n >= 4 && n <= 9) return <SlideArea area={AREAS[n - 4]} />
  if (n === 10) return <SlideObra obra={OBRAS[0]} />
  if (n === 11) return <SlideObra obra={OBRAS[1]} />
  if (n === 12) return <SlideObrasConsolidado />
  if (n === 13) return <SlideAppsProduccion />
  if (n === 14) return <SlideAppsCola />
  if (n === 15) return <SlideMapa />
  if (n === 16) return <SlideCierre />
  return null
}

function useSlideScale(ref: React.RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    function calc() {
      if (!ref.current) return
      setScale(Math.min(1, ref.current.clientWidth / 1100))
    }
    calc()
    const ro = new ResizeObserver(calc)
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [ref])
  return scale
}

export default function PresentacionPage() {
  const { currentSlide, nextSlide, prevSlide, setSlide } = useAppStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const scale = useSlideScale(containerRef)
  const slideH = Math.round(1100 * 9 / 16)

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextSlide() }
    if (e.key === 'ArrowLeft') prevSlide()
  }, [nextSlide, prevSlide])

  useEffect(() => {
    useAppStore.setState({ totalSlides: TOTAL })
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  return (
    <>
      {/* TopBar for presentación */}
      <header className="sticky top-0 z-50 bg-navy border-b-2 border-gold">
        <div className="flex items-center justify-between px-5 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 bg-mkred rounded font-condensed font-black text-white text-lg">MK</div>
            <div>
              <span className="font-condensed font-bold text-white text-[17px] tracking-wide">
                Gestión de <span className="text-gold">Innovación</span> y Eficiencia
              </span>
              <div className="text-[10px] text-slate-400 -mt-0.5 tracking-wider uppercase">MK Ingeniería · Felipe Valenzuela</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/comites" className="px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider text-white/50 hover:text-white/80 transition-all">
              Comités
            </Link>
            <div className="text-xs font-semibold tracking-wider text-white/60 border border-white/15 bg-white/[.06] px-3 py-1.5 rounded-md">
              Semana {useAppStore.getState().week}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col items-center px-4 pt-4 pb-3 flex-1 min-h-0">
        <div ref={containerRef} className="w-full" style={{ maxWidth: 1100 }}>
          <div className="relative overflow-hidden rounded slide-shadow bg-white"
            style={{ width: 1100, height: slideH, transform: `scale(${scale})`, transformOrigin: 'top left', marginBottom: slideH * (scale - 1) }}>
            <AnimatePresence mode="wait">
              <motion.div key={currentSlide} className="absolute inset-0"
                initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}>
                {getSlide(currentSlide)}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3">
          <button onClick={prevSlide} disabled={currentSlide === 1}
            className="px-5 py-2 rounded-md bg-white/10 border border-white/20 text-white text-[13px] font-semibold disabled:opacity-30 hover:bg-cobalt hover:border-cobalt transition-all">
            ← Anterior
          </button>
          <div className="flex flex-col items-center gap-1.5">
            <div className="text-white/50 text-[12px] tabular-nums font-medium">
              {currentSlide} / {TOTAL} &nbsp;·&nbsp; {LABELS[currentSlide - 1]}
            </div>
            <div className="flex gap-1.5 flex-wrap justify-center max-w-sm">
              {Array.from({ length: TOTAL }).map((_, i) => (
                <button key={i} onClick={() => setSlide(i + 1)} title={LABELS[i]}
                  className={`rounded-full border-none transition-all ${i + 1 === currentSlide ? 'bg-gold w-3 h-3 scale-110' : 'bg-white/20 hover:bg-white/40 w-2 h-2'}`} />
              ))}
            </div>
          </div>
          <button onClick={nextSlide} disabled={currentSlide === TOTAL}
            className="px-5 py-2 rounded-md bg-white/10 border border-white/20 text-white text-[13px] font-semibold disabled:opacity-30 hover:bg-cobalt hover:border-cobalt transition-all">
            Siguiente →
          </button>
        </div>
        <div className="mt-1 text-white/20 text-[10px] tracking-wider">← → · barra espaciadora</div>
      </div>
    </>
  )
}
