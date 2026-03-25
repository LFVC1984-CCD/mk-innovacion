'use client'
import { useEffect, useState } from 'react'
import { INSTR_BARS, FIN_COLORS, fmtShort } from '@/lib/comites/data'

const data = INSTR_BARS.map(b => ({
  name: b.name,
  aprobado: b.aprobado,
  comprometido: b.comprometido,
  disponible: b.aprobado - b.comprometido,
  pct: Math.round((b.comprometido / b.aprobado) * 100),
}))

const maxApr = Math.max(...data.map(x => x.aprobado))

export default function InstrumentBars() {
  // Animate bars on mount
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="bg-white rounded-[14px] border border-[#E2E8F0] p-5">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1.5">
        Distribución por instrumento
      </h3>
      {/* Legend */}
      <div className="flex gap-4 mb-4 text-[10px] font-bold">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm" style={{ background: FIN_COLORS.aprobado }} />
          <span style={{ color: FIN_COLORS.aprobado }}>Aprobado</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm" style={{ background: FIN_COLORS.comprometido }} />
          <span style={{ color: FIN_COLORS.comprometido }}>Comprometido</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm" style={{ background: FIN_COLORS.disponible }} />
          <span style={{ color: FIN_COLORS.disponible }}>Disponible</span>
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {data.map((d, i) => {
          const basePct = (d.aprobado / maxApr) * 100
          const fillPct = (d.comprometido / maxApr) * 100
          const fillColor = d.pct > 80 ? FIN_COLORS.critico : FIN_COLORS.comprometido

          return (
            <div key={i} className="flex items-center gap-3 group">
              <span className="min-w-[130px] text-xs font-bold truncate">{d.name}</span>

              {/* Animated bar */}
              <div className="flex-1 relative h-[22px] bg-[#F1F5F9] rounded-md overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full rounded-md"
                  style={{
                    width: mounted ? `${basePct}%` : '0%',
                    background: FIN_COLORS.aprobado,
                    opacity: 0.12,
                    transition: `width 0.8s cubic-bezier(0.4,0,0.2,1) ${i * 0.1}s`,
                  }}
                />
                <div
                  className="absolute top-0 left-0 h-full rounded-md"
                  style={{
                    width: mounted ? `${fillPct}%` : '0%',
                    background: fillColor,
                    transition: `width 1s cubic-bezier(0.4,0,0.2,1) ${i * 0.1 + 0.2}s`,
                  }}
                />
                {/* % inside — appears after animation */}
                <span
                  className="absolute top-1/2 font-condensed text-[11px] font-extrabold"
                  style={{
                    left: `${fillPct / 2}%`,
                    transform: 'translate(-50%, -50%)',
                    color: fillPct > 15 ? '#fff' : fillColor,
                    opacity: mounted ? 1 : 0,
                    transition: `opacity 0.3s ease ${i * 0.1 + 1}s`,
                  }}
                >
                  {d.pct}%
                </span>
              </div>

              {/* Values */}
              <div className="flex gap-2.5 min-w-[180px] justify-end">
                <span className="font-condensed text-sm font-black min-w-[55px] text-right" style={{ color: FIN_COLORS.aprobado }}>
                  {fmtShort(d.aprobado)}
                </span>
                <span className="font-condensed text-sm font-black min-w-[55px] text-right" style={{ color: fillColor }}>
                  {fmtShort(d.comprometido)}
                </span>
                <span className="font-condensed text-sm font-black min-w-[55px] text-right" style={{ color: FIN_COLORS.disponible }}>
                  {fmtShort(d.disponible)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
