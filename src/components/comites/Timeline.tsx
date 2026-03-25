'use client'
import { VENCIMIENTOS, fmtShort } from '@/lib/comites/data'

function urgencyColor(dias: number) {
  if (dias <= 15) return '#DC2626'
  if (dias <= 30) return '#D97706'
  return '#94A3B8'
}

export default function Timeline() {
  return (
    <div className="bg-white rounded-[14px] border border-[#E2E8F0] p-5">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate mb-3">
        Próximos vencimientos
      </h3>
      <div className="flex flex-col">
        {VENCIMIENTOS.map((v, i) => {
          const c = urgencyColor(v.dias)
          return (
            <div key={i} className={`flex items-start gap-2.5 py-2 ${i < VENCIMIENTOS.length - 1 ? 'border-b border-[#E2E8F0]' : ''}`}>
              <div className="text-center min-w-[44px]" style={{ color: c }}>
                <span className="font-condensed text-[14px] font-bold leading-none">{v.date}</span>
                <span className="block text-[9px] font-semibold text-slate">{v.month}</span>
              </div>
              <div className="w-[3px] min-h-[28px] rounded-full self-stretch" style={{ background: c }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{v.proyecto}</p>
                <p className="text-[10px] text-slate">{v.detalle} · {v.dias}d</p>
              </div>
              <span className="font-condensed text-sm font-extrabold whitespace-nowrap" style={{ color: c }}>
                {fmtShort(v.monto)}MM
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
