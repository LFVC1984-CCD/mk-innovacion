'use client'
import { motion } from 'framer-motion'

interface HBarProps {
  label: string
  value: number
  max: number
  color: string
  delay?: number
  formatValue?: (v: number) => string
}

const defaultFormat = (v: number): string => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}MM`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toLocaleString('es-CL')
}

export default function HBar({ label, value, max, color, delay = 0, formatValue = defaultFormat }: HBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold w-36 truncate">{label}</span>
      <div className="flex-1 h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: color }}
        />
      </div>
      <span className="text-[11px] font-bold min-w-[50px] text-right" style={{ color }}>
        {formatValue(value)}
      </span>
    </div>
  )
}
