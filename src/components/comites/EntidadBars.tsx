'use client'
import { useEffect, useState } from 'react'
import { ENTIDADES, FIN_COLORS, fmtShort } from '@/lib/comites/data'

const maxLinea = Math.max(...ENTIDADES.map(e => e.linea))

export default function EntidadBars() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t) }, [])

  return (
    <div className="bg-white rounded-[14px] border border-[#E2E8F0] p-5">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1.5">
        Utilización por entidad
      </h3>
      <div className="flex gap-4 mb-4 text-[10px] font-bold">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: FIN_COLORS.aprobado }} /> <span style={{ color: FIN_COLORS.aprobado }}>Línea aprobada</span></span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: FIN_COLORS.comprometido }} /> <span style={{ color: FIN_COLORS.comprometido }}>Comprometido</span></span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: FIN_COLORS.disponible }} /> <span style={{ color: FIN_COLORS.disponible }}>Disponible</span></span>
      </div>
      <div className="flex flex-col gap-2.5">
        {ENTIDADES.filter(e => e.linea > 0).map((e, i) => {
          const basePct = (e.linea / maxLinea) * 100
          const fillPct = (e.consumo / maxLinea) * 100
          const pct = Math.round((e.consumo / e.linea) * 100)
          const saldo = e.linea - e.consumo
          const fillColor = pct > 80 ? FIN_COLORS.critico : FIN_COLORS.comprometido
          return (
            <div key={e.nombre} className="flex items-center gap-3">
              <span className="min-w-[100px] text-xs font-bold truncate">{e.nombre}</span>
              <div className="flex-1 relative h-[22px] bg-[#F1F5F9] rounded-md overflow-hidden">
                <div className="absolute top-0 left-0 h-full rounded-md" style={{ width: mounted ? `${basePct}%` : '0%', background: FIN_COLORS.aprobado, opacity: 0.12, transition: `width 0.8s cubic-bezier(0.4,0,0.2,1) ${i * 0.1}s` }} />
                <div className="absolute top-0 left-0 h-full rounded-md" style={{ width: mounted ? `${fillPct}%` : '0%', background: fillColor, transition: `width 1s cubic-bezier(0.4,0,0.2,1) ${i * 0.1 + 0.2}s` }} />
                {fillPct > 12 && <span className="absolute top-1/2 font-condensed text-[11px] font-extrabold text-white" style={{ left: `${fillPct / 2}%`, transform: 'translate(-50%, -50%)', opacity: mounted ? 1 : 0, transition: `opacity 0.3s ease ${i * 0.1 + 1}s` }}>{pct}%</span>}
              </div>
              <div className="flex gap-2.5 min-w-[180px] justify-end">
                <span className="font-condensed text-sm font-black min-w-[55px] text-right" style={{ color: FIN_COLORS.aprobado }}>{fmtShort(e.linea)}</span>
                <span className="font-condensed text-sm font-black min-w-[55px] text-right" style={{ color: fillColor }}>{fmtShort(e.consumo)}</span>
                <span className="font-condensed text-sm font-black min-w-[55px] text-right" style={{ color: FIN_COLORS.disponible }}>{fmtShort(saldo)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
