'use client'
import { motion } from 'framer-motion'
import type { Entidad } from '@/lib/comites/data'
import { FIN_COLORS, fmtMM } from '@/lib/comites/data'

export default function EntidadCard({ e, index, onClick }: { e: Entidad; index: number; onClick: () => void }) {
  const pct = e.linea > 0 ? Math.round(e.consumo / e.linea * 100) : 0
  const saldo = e.linea - e.consumo
  const barColor = pct > 80 ? FIN_COLORS.critico : pct > 50 ? FIN_COLORS.comprometido : '#94A3B8'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      onClick={onClick}
      className="bg-white rounded-xl border border-[#E2E8F0] p-4 relative overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: e.tipo === 'Banco' ? '#1E293B' : '#64748B' }} />
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-xs font-bold">{e.nombre}</p>
          <p className="text-[10px] text-slate">{e.tipo} · {e.instrumentos.length} instrumento{e.instrumentos.length > 1 ? 's' : ''}</p>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${e.tipo === 'Banco' ? 'bg-[#F1F5F9] text-ink' : 'bg-[#F1F5F9] text-slate'}`}>
          {e.tipo}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        <div><p className="text-[10px] text-slate">Línea</p><p className="font-condensed text-xs font-extrabold" style={{ color: FIN_COLORS.aprobado }}>{fmtMM(e.linea)}</p></div>
        <div><p className="text-[10px] text-slate">Comprometido</p><p className="font-condensed text-xs font-extrabold" style={{ color: barColor }}>{fmtMM(e.consumo)}</p></div>
        <div><p className="text-[10px] text-slate">Saldo</p><p className="font-condensed text-xs font-extrabold" style={{ color: saldo >= 0 ? FIN_COLORS.disponible : FIN_COLORS.critico }}>{fmtMM(saldo)}</p></div>
      </div>
      <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden mb-1.5">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="text-slate">{e.instrumentos.join(', ')}</span>
        <span className="font-bold" style={{ color: barColor }}>{pct}%</span>
      </div>
    </motion.div>
  )
}
