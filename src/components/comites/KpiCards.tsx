'use client'

interface KpiItem {
  label: string
  value: string | number
  color: string
  sub?: string
}

interface Props {
  items: KpiItem[]
}

/** KPI cards claras estilo DS — reemplaza hero-gradient oscuro */
export default function KpiCards({ items }: Props) {
  return (
    <div className={`grid gap-2 mb-4 ${items.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-5'}`}>
      {items.map((k, i) => (
        <div key={i} role="group" aria-label={k.label}
          className="bg-white rounded-xl border p-3 hover:shadow-md hover:-translate-y-0.5 transition-all"
          style={{ borderColor: '#E2E8F0', borderLeftWidth: 4, borderLeftColor: k.color }}>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate mb-1">{k.label}</p>
          <p className="font-condensed text-2xl font-black leading-tight" style={{ color: k.color }}>{k.value}</p>
          {k.sub && <p className="text-[10px] text-slate mt-0.5">{k.sub}</p>}
        </div>
      ))}
    </div>
  )
}
