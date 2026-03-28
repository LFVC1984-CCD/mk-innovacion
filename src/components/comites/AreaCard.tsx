'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import type { AreaDef } from '@/lib/comites/data'

function Pill({ children, variant }: { children: React.ReactNode; variant: 'info' | 'bad' | 'warn' | 'ok' }) {
  const styles = {
    info: 'bg-cobalt-light text-cobalt',
    bad: 'bg-red-50 text-danger pulse-critical',
    warn: 'bg-amber-50 text-amber',
    ok: 'bg-green-50 text-success',
  }
  return <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${styles[variant]}`}>{children}</span>
}

const AREA_ICONS: Record<string, JSX.Element> = {
  finanzas: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>),
  rrhh: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
  legal: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22" /><path d="M4 7h16" /><path d="M4 7L1 14c0 1.7 1.3 3 3 3s3-1.3 3-3L4 7z" /><path d="M20 7l-3 7c0 1.7 1.3 3 3 3s3-1.3 3-3l-3-7z" /><line x1="8" y1="22" x2="16" y2="22" /></svg>),
  prevencion: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>),
  estudios: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>),
  obras: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="8" width="16" height="14" rx="1" /><path d="M8 8V6a4 4 0 0 1 8 0v2" /><line x1="4" y1="22" x2="20" y2="22" /><rect x="7" y="11" width="3" height="3" /><rect x="14" y="11" width="3" height="3" /><rect x="7" y="17" width="3" height="3" /><rect x="14" y="17" width="3" height="3" /><line x1="12" y1="1" x2="12" y2="4" /><line x1="10" y1="2" x2="14" y2="2" /></svg>),
  eti: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>),
}

interface Props {
  area: AreaDef
  index: number
  editHref?: string
  presentHref?: string
}

export default function AreaCard({ area, index, editHref, presentHref }: Props) {
  const icon = AREA_ICONS[area.id]
  const hasBad = area.bad > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-[14px] border-2 border-[#E2E8F0] overflow-hidden hover:shadow-xl hover:shadow-[#E8000D]/10 hover:-translate-y-1 hover:border-[#E8000D]/30 transition-all duration-200 cursor-pointer group relative"
    >
      {/* Top accent bar with gradient */}
      <div className="h-1.5 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${area.color}, ${area.color}99)` }} />
        {hasBad && <div className="absolute inset-0 animate-pulse" style={{ background: `linear-gradient(90deg, transparent 60%, #DC262640)` }} />}
      </div>

      {/* Decorative icon */}
      {icon && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
          animate={{ opacity: 0.08, scale: 1, rotate: 0 }}
          transition={{ delay: index * 0.07 + 0.2, duration: 0.5 }}
          className="absolute top-3 right-3 w-16 h-16 pointer-events-none group-hover:opacity-[0.22] group-hover:scale-110 transition-all duration-300"
          style={{ color: area.color }}
        >
          {icon}
        </motion.div>
      )}

      <div className="p-4 relative">
        {/* Area name + freq */}
        <h3 className="font-condensed text-[17px] font-bold leading-tight group-hover:text-cobalt transition-colors duration-200">{area.name}</h3>
        <p className="text-[10px] text-slate font-semibold mb-2.5">{area.freq}</p>

        {/* Stats pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.07 + 0.15, duration: 0.3 }}
          className="flex flex-wrap gap-1 mb-3"
        >
          {area.kpis > 0 && <Pill variant="info">{area.kpis} KPIs</Pill>}
          {area.bad > 0 && <Pill variant="bad">{area.bad} crítico{area.bad > 1 ? 's' : ''}</Pill>}
          {area.warn > 0 && <Pill variant="warn">{area.warn} alerta{area.warn > 1 ? 's' : ''}</Pill>}
          {area.activas > 0 && <Pill variant="ok">{area.activas} activa{area.activas > 1 ? 's' : ''}</Pill>}
          {area.sinFecha > 0 && <Pill variant="warn">{area.sinFecha} sin fecha</Pill>}
        </motion.div>

        {/* Action buttons */}
        <div className="flex gap-1.5">
          {editHref ? (
            <Link href={editHref} className="px-3 py-1.5 rounded-lg bg-cobalt text-white text-[10px] font-semibold hover:bg-cobalt-dark hover:shadow-md transition-all btn-scale">
              Editar
            </Link>
          ) : (
            <span className="text-[10px] text-slate italic py-1.5">Solo lectura</span>
          )}
          {presentHref && (
            <Link href={presentHref} className="px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[10px] font-semibold hover:bg-[#F1F5F9] hover:border-[#CBD5E1] transition-all btn-scale">
              Presentación
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  )
}
