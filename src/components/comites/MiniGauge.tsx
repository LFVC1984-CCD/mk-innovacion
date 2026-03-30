'use client'
import { motion } from 'framer-motion'

interface Props {
  value: number
  max?: number
  label: string
  sublabel?: string
  size?: number
  color: string
}

export default function MiniGauge({ value, max = 2, label, sublabel, size = 64, color }: Props) {
  const pct = Math.min(value / max, 1)
  const r = (size - 8) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - pct)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={4} />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-condensed font-black text-sm" style={{ color }}>{value}</span>
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate">{label}</span>
      {sublabel && <span className="text-[8px] text-slate -mt-1">{sublabel}</span>}
    </div>
  )
}
