'use client'
import { motion } from 'framer-motion'

interface Segment {
  label: string
  value: number
  color: string
}

interface Props {
  segments: Segment[]
  total: number
  height?: number
}

export default function TaskStackedBar({ segments, total, height = 16 }: Props) {
  if (total === 0) return null

  return (
    <div>
      <div className="flex rounded-full overflow-hidden" style={{ height }}>
        {segments.map((s, i) => {
          const pct = (s.value / total) * 100
          if (pct === 0) return null
          return (
            <motion.div
              key={s.label}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, delay: 0.2 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-center"
              style={{ background: s.color, minWidth: pct > 0 ? 3 : 0 }}
            >
              {pct > 12 && <span className="text-[9px] font-bold text-white">{s.value}</span>}
            </motion.div>
          )
        })}
      </div>
      <div className="flex gap-3 mt-2 justify-center">
        {segments.filter(s => s.value > 0).map(s => (
          <div key={s.label} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            <span className="text-[9px] font-semibold text-slate">{s.label} ({s.value})</span>
          </div>
        ))}
      </div>
    </div>
  )
}
