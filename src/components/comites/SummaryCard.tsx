'use client'
import { motion } from 'framer-motion'

interface Props {
  value: string
  label: string
  color: string
  delta?: string
  index?: number
}

export default function SummaryCard({ value, label, color, delta, index = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 hover:shadow-lg hover:-translate-y-0.5 transition-all group relative overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      {/* Subtle gradient glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(circle at 20% 50%, ${color}08, transparent 70%)` }}
      />
      <div className="relative">
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 + 0.15, duration: 0.4 }}
          className="font-condensed text-2xl font-black leading-none"
          style={{ color }}
        >
          {value}
        </motion.p>
        <p className="text-[10px] text-slate font-bold uppercase tracking-wider mt-0.5">{label}</p>
        {delta && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.05 + 0.3, duration: 0.3 }}
            className="text-[10px] font-bold mt-1"
            style={{ color }}
          >
            {delta}
          </motion.p>
        )}
      </div>
    </motion.div>
  )
}
