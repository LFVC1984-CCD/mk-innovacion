'use client'
import { motion } from 'framer-motion'
import type { AutoKPI } from '@/lib/comites/use-auto-kpis'

const STATUS_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  ok: { text: '#16A34A', bg: '#F0FDF4', border: '#16A34A' },
  warn: { text: '#D97706', bg: '#FFFBEB', border: '#D97706' },
  bad: { text: '#DC2626', bg: '#FEF2F2', border: '#DC2626' },
}

interface Props {
  kpis: AutoKPI[]
  areaColor?: string
}

export default function KPIDashboard({ kpis, areaColor = '#0B5ED7' }: Props) {
  if (kpis.length === 0) {
    return (
      <div className="rounded-xl p-8 text-center text-sm bg-white border border-[#E2E8F0] text-slate">
        Sin datos para calcular indicadores
      </div>
    )
  }

  return (
    <div className={`grid gap-2.5 ${kpis.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' : kpis.length <= 5 ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-' + Math.min(kpis.length, 7)}`}>
      {kpis.map((kpi, i) => {
        const sc = STATUS_COLORS[kpi.status] || STATUS_COLORS.ok
        return (
          <motion.div
            key={kpi.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white rounded-xl border p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
            style={{ borderColor: '#E2E8F0', borderLeftWidth: 4, borderLeftColor: sc.border }}
          >
            {/* Label + status dot */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${kpi.status === 'bad' ? 'pulse-critical' : ''}`} style={{ background: sc.text }} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate truncate">
                {kpi.nombre}
              </span>
            </div>

            {/* Value */}
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 + 0.15, duration: 0.3 }}
              className="font-condensed text-2xl font-black leading-tight"
              style={{ color: kpi.formato === 'zero' ? sc.text : areaColor }}
            >
              {kpi.valor}
            </motion.p>

            {/* Meta */}
            {kpi.meta && (
              <p className="text-[10px] text-slate mt-1">
                Meta: {kpi.meta}
              </p>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
