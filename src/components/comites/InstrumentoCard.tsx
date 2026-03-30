'use client'
import { motion } from 'framer-motion'
import type { Instrumento } from '@/lib/comites/data'
import { INSTR_BARS, FIN_COLORS, fmtMM, fmtShort } from '@/lib/comites/data'

export default function InstrumentoCard({ inst, index, onClick }: { inst: Instrumento; index: number; onClick: () => void }) {
  const bar = INSTR_BARS.find(b => b.name === inst.nombre)
  const aprobado = bar?.aprobado ?? 0
  const comprometido = bar?.comprometido ?? 0
  const disponible = aprobado - comprometido
  const pct = aprobado > 0 ? Math.round(comprometido / aprobado * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      onClick={onClick}
      className="bg-white rounded-xl border border-[#E2E8F0] p-4 relative overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#94A3B8]" />
      <p className="text-xs font-bold mb-1">{inst.nombre}</p>
      <p className="text-[10px] text-slate mb-2">{inst.entidades.length} entidades · {inst.tipos.length} tipos</p>
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <div><p className="text-[10px] text-slate">Activas</p><p className="font-condensed text-lg font-black">{inst.activas}</p></div>
        <div><p className="text-[10px] text-slate">Monto total</p><p className="font-condensed text-lg font-black">{fmtMM(inst.monto)}</p></div>
      </div>
      <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden mb-1.5">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct > 80 ? FIN_COLORS.critico : FIN_COLORS.comprometido }} />
      </div>
      <div className="flex justify-between text-[10px] font-bold">
        <span style={{ color: FIN_COLORS.aprobado }}>{fmtShort(aprobado)}MM</span>
        <span style={{ color: FIN_COLORS.comprometido }}>{pct}%</span>
        <span style={{ color: FIN_COLORS.disponible }}>{fmtShort(disponible)}MM</span>
      </div>
    </motion.div>
  )
}
