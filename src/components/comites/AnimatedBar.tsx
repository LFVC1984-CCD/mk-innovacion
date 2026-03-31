'use client'
import { motion } from 'framer-motion'

interface Props {
  value: number
  max?: number
  color: string
  bgColor?: string
  height?: number
  showLabel?: boolean
  delay?: number
  /** Optional second bar (e.g. programmed vs real) */
  secondValue?: number
  secondColor?: string
}

export default function AnimatedBar({
  value, max = 100, color, bgColor = '#E2E8F0', height = 10,
  showLabel = false, delay = 0, secondValue, secondColor = '#0B5ED730',
}: Props) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const pct2 = secondValue !== undefined && max > 0 ? Math.min((secondValue / max) * 100, 100) : 0

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
      aria-label="Progreso"
    >
      <div className="rounded-full overflow-hidden relative" style={{ height, background: bgColor }}>
        {secondValue !== undefined && (
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct2}%` }}
            transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: secondColor }}
          />
        )}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: delay + 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: color }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-[10px] text-slate mt-1">
          <span>{Math.round(pct)}%</span>
          {secondValue !== undefined && <span>Prog. {Math.round(pct2)}%</span>}
        </div>
      )}
    </div>
  )
}
