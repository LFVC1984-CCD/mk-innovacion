'use client'
import { motion } from 'framer-motion'
import type { AutoKPI } from '@/lib/comites/use-auto-kpis'

const STATUS_COLORS: Record<string, { text: string; bg: string; glow: string }> = {
  ok: { text: '#16A34A', bg: '#16A34A15', glow: '#16A34A20' },
  warn: { text: '#D97706', bg: '#D9770615', glow: '#D9770620' },
  bad: { text: '#DC2626', bg: '#DC262615', glow: '#DC262620' },
}

interface Props {
  kpis: AutoKPI[]
  areaColor?: string
  dark?: boolean
}

export default function KPIDashboard({ kpis, areaColor = '#0B5ED7', dark = true }: Props) {
  if (kpis.length === 0) {
    return (
      <div className={`rounded-xl p-8 text-center text-sm ${dark ? 'hero-gradient text-white/40' : 'bg-white border border-[#E2E8F0] text-slate'}`}>
        Sin datos para calcular indicadores
      </div>
    )
  }

  return (
    <div className={`rounded-xl p-5 ${dark ? 'hero-gradient' : 'bg-white border border-[#E2E8F0]'}`}>
      <div className={`grid gap-3 ${kpis.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' : kpis.length <= 5 ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-' + Math.min(kpis.length, 7)}`}>
        {kpis.map((kpi, i) => {
          const sc = STATUS_COLORS[kpi.status] || STATUS_COLORS.ok
          return (
            <motion.div
              key={kpi.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              {/* Status dot */}
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-2 h-2 rounded-full ${kpi.status === 'bad' ? 'pulse-critical' : ''}`} style={{ background: sc.text }} />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-white/40' : 'text-slate'}`}>
                  {kpi.nombre}
                </span>
              </div>

              {/* Value */}
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 + 0.15, duration: 0.3 }}
                className="font-condensed text-[26px] font-black leading-tight"
                style={{ color: kpi.formato === 'zero' ? sc.text : (dark ? '#fff' : areaColor) }}
              >
                {kpi.valor}
              </motion.p>

              {/* Meta */}
              {kpi.meta && (
                <p className={`text-[10px] mt-0.5 ${dark ? 'text-white/30' : 'text-slate'}`}>
                  Meta: {kpi.meta}
                </p>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
