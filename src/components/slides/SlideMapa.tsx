'use client'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { MAPA_DATA } from '@/lib/presentacion/data'

function DonutRing({ pct, color, size = 56 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={6} />
      <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
        strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }} />
    </svg>
  )
}

export default function SlideMapa() {
  const { week } = useAppStore()
  return (
    <div className="flex flex-col h-full bg-cobalt">
      <div className="px-5 py-3.5 border-b border-white/10 flex-shrink-0">
        <h2 className="font-condensed font-black text-white text-2xl uppercase tracking-wide">Mapa Global de Iniciativas</h2>
        <p className="text-white/40 text-[10px] mt-0.5 tracking-widest uppercase">Todas las áreas · {week}</p>
      </div>
      <div className="grid grid-cols-3 grid-rows-2 gap-2.5 p-3 flex-1">
        {MAPA_DATA.map((d, i) => (
          <motion.div key={d.name} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07, duration: 0.35 }}
            className="bg-white rounded-sm p-3 flex flex-col relative overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,.15)' }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: d.color }} />
            <div className="font-condensed font-extrabold text-sm uppercase tracking-wide mt-1" style={{ color: d.color }}>{d.name}</div>
            <div className="flex items-center justify-between mt-2 flex-1">
              <div>
                <div className="font-condensed font-black leading-none" style={{ fontSize: 42, color: d.color }}>{d.n}</div>
                <div className="text-[9.5px] text-slate-500">iniciativas</div>
              </div>
              <div className="relative flex items-center justify-center">
                <DonutRing pct={d.pct} color={d.color} />
                <div className="absolute font-condensed font-black text-[13px]" style={{ color: d.color }}>{d.pct}%</div>
              </div>
            </div>
            <div className="mt-2">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: d.color }} initial={{ width: 0 }} animate={{ width: `${(d.done / d.n) * 100}%` }}
                  transition={{ delay: 0.4 + i * 0.05, duration: 0.7, ease: 'easeOut' }} />
              </div>
              <div className="text-[9px] text-slate-500 mt-1">{d.done}/{d.n} avanzadas</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
