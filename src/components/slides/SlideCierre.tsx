'use client'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { PROXIMOS } from '@/lib/presentacion/data'

export default function SlideCierre() {
  const { week } = useAppStore()
  return (
    <div className="flex h-full bg-cobalt">
      <div className="w-44 flex-shrink-0 bg-gold flex flex-col items-center justify-center px-4 gap-3">
        <div className="w-16 h-16 bg-cobalt rounded flex items-center justify-center">
          <span className="font-condensed font-black text-white text-2xl">MK</span>
        </div>
        <div className="font-condensed font-black text-cobalt text-center text-xl uppercase leading-tight">Próximos<br />Pasos</div>
      </div>
      <div className="flex-1 flex flex-col justify-center px-6 py-4 gap-0">
        {PROXIMOS.map((p, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08, duration: 0.35 }}>
            <div className="flex items-center gap-3 py-1.5">
              <div className="w-7 h-7 rounded-full bg-gold flex items-center justify-center flex-shrink-0">
                <span className="font-condensed font-black text-cobalt text-sm">{i + 1}</span>
              </div>
              <div className="bg-white/15 text-white text-[9.5px] font-bold px-2.5 py-1 rounded uppercase tracking-wide min-w-[68px] text-center flex-shrink-0">{p.area}</div>
              <div className="text-white text-[12px] leading-tight flex-1">{p.task}</div>
            </div>
            {i < PROXIMOS.length - 1 && <div className="w-px h-2 bg-white/20 ml-[13px]" />}
          </motion.div>
        ))}
        <div className="mt-3 text-white/30 text-[9px] tracking-widest pl-0.5">
          {week} · Felipe Valenzuela · Gerente de Innovación, Gestión y Eficiencia · MK Ingeniería
        </div>
      </div>
    </div>
  )
}
