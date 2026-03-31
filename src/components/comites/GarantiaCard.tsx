'use client'
import { motion } from 'framer-motion'
import type { Garantia } from '@/lib/comites/data'
import { ESTADO_CONFIG, fmtMM } from '@/lib/comites/data'

function daysColor(dias: number | null) {
  if (dias === null) return { bg: 'bg-cobalt-light', text: 'text-cobalt' }
  if (dias <= 0) return { bg: 'bg-red-50', text: 'text-danger' }
  if (dias <= 30) return { bg: 'bg-amber-50', text: 'text-amber' }
  return { bg: 'bg-green-50', text: 'text-success' }
}

export default function GarantiaCard({ g, index }: { g: Garantia; index: number }) {
  const estado = ESTADO_CONFIG[g.estado]
  const dc = daysColor(g.dias)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault() } }}
      className="bg-white rounded-xl border border-[#E2E8F0] p-4 relative overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
    >
      {/* Top stripe */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: estado.color }} />

      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-xs font-bold leading-tight">{g.proyecto}</p>
          <p className="text-[10px] text-slate mt-0.5">{g.instrumento} · {g.tipo}</p>
        </div>
        <span
          className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider"
          style={{ background: estado.color + '18', color: estado.color }}
        >
          {estado.label}
        </span>
      </div>

      {/* Body */}
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <div>
          <p className="text-[10px] text-slate">Monto</p>
          <p className="font-condensed text-xs font-extrabold">{fmtMM(g.monto)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate">Entidad</p>
          <p className="font-condensed text-xs font-extrabold">{g.entidad}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
        <span className="text-[10px] text-slate">
          {g.fechaInicio || '—'} → {g.fechaVencimiento || '—'}
        </span>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${dc.bg} ${dc.text}`}>
          {g.dias === null ? 'Pendiente' : g.dias <= 0 ? 'Vencida' : `${g.dias}d`}
        </span>
      </div>
    </motion.div>
  )
}
