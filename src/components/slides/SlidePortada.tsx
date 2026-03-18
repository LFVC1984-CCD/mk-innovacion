'use client'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }
const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } }

export default function SlidePortada() {
  const { week } = useAppStore()
  return (
    <div className="relative w-full h-full bg-cobalt overflow-hidden flex flex-col justify-center">
      <div className="absolute left-0 top-0 bottom-0 w-3 bg-gold z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-white/[.04] to-transparent" />
      <div className="absolute bottom-0 right-0 w-24 h-24 bg-mkred" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
      <motion.div variants={container} initial="hidden" animate="show" className="pl-10 pr-8 relative z-10">
        <motion.div variants={item} className="mb-5">
          <div className="inline-flex items-center gap-3">
            <div className="w-10 h-10 bg-white/90 rounded flex items-center justify-center">
              <span className="font-condensed font-black text-mkred text-xl">MK</span>
            </div>
            <span className="font-condensed text-white/70 text-sm tracking-widest uppercase">Ingeniería y Construcción</span>
          </div>
        </motion.div>
        <motion.h1 variants={item} className="font-condensed font-black uppercase leading-none text-white" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
          Gestión de Innovación
        </motion.h1>
        <motion.h1 variants={item} className="font-condensed font-black uppercase leading-none text-gold" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
          y Eficiencia Operacional
        </motion.h1>
        <motion.div variants={item} className="mt-6 text-white/70 text-sm leading-relaxed">
          <span className="text-white font-semibold">Felipe Valenzuela</span> · Gerente de Innovación, Gestión y Eficiencia Operacional<br />
          Luis Macri (Dev Azure / Blazor) · Rafael Castillo (Dev Power Apps)
        </motion.div>
        <motion.div variants={item} className="mt-4 flex items-center gap-3">
          <div className="bg-white/10 border border-white/20 text-white/70 text-xs px-3 py-1.5 rounded font-semibold tracking-wide">Semana {week}</div>
          <div className="text-white/40 text-xs">&lt; 6 meses de implementación</div>
        </motion.div>
      </motion.div>
      <div className="absolute bottom-3 right-6 text-white/25 text-[10px] tracking-widest">Semana {week}</div>
    </div>
  )
}
