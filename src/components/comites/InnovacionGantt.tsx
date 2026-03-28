'use client'
import { motion } from 'framer-motion'
import type { ProyectoInnovacion, EtapaInnovacion } from '@/lib/types'
import { ETAPAS_DESARROLLO, ETAPAS_CONTRATACION, ETAPA_CONFIG } from '@/lib/types'

interface Props {
  proyectos: ProyectoInnovacion[]
  onEdit?: (p: ProyectoInnovacion) => void
}

function fmtShortDate(d: string | null): string {
  if (!d) return '—'
  const dt = new Date(d + 'T12:00:00')
  return dt.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }).replace('.', '')
}

export default function InnovacionGantt({ proyectos, onEdit }: Props) {
  if (proyectos.length === 0) return null

  const internos = proyectos.filter(p => p.tipo_ruta !== 'contratacion_servicio' && p.etapa !== 'descartado')
  const contratados = proyectos.filter(p => p.tipo_ruta === 'contratacion_servicio' && p.etapa !== 'descartado')
  const descartados = proyectos.filter(p => p.etapa === 'descartado')

  return (
    <div className="space-y-4">
      {/* Leyenda */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {Object.entries(ETAPA_CONFIG).filter(([k]) => k !== 'descartado').map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1 text-[9px] font-bold">
            <span className="w-2.5 h-2.5 rounded" style={{ background: cfg.color }} />
            {cfg.label}
          </span>
        ))}
      </div>

      {internos.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-2">Desarrollo interno</p>
          <GanttBlock proyectos={internos} etapas={ETAPAS_DESARROLLO} onEdit={onEdit} />
        </div>
      )}

      {contratados.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-2">Contratación de servicio</p>
          <GanttBlock proyectos={contratados} etapas={ETAPAS_CONTRATACION} onEdit={onEdit} />
        </div>
      )}

      {descartados.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-2">Descartados ({descartados.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {descartados.map(p => (
              <span key={p.id} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate line-through cursor-pointer hover:bg-slate-200"
                onClick={() => onEdit?.(p)}>
                {p.nombre}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GanttBlock({ proyectos, etapas, onEdit }: {
  proyectos: ProyectoInnovacion[]
  etapas: EtapaInnovacion[]
  onEdit?: (p: ProyectoInnovacion) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
      {/* Header */}
      <div className="flex border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="w-[150px] shrink-0 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate">
          Proyecto
        </div>
        <div className="flex-1 flex min-w-[300px]">
          {etapas.map(e => {
            const cfg = ETAPA_CONFIG[e]
            return (
              <div key={e} className="flex-1 px-1 py-2 text-center text-[9px] font-bold uppercase" style={{ color: cfg.color }}>
                {cfg.short}
              </div>
            )
          })}
        </div>
        <div className="w-[130px] shrink-0 px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate text-center">
          Fechas
        </div>
      </div>

      {/* Rows */}
      {proyectos.map((p, pi) => {
        const currentIdx = etapas.indexOf(p.etapa)
        const totalEtapas = etapas.length
        const pct = totalEtapas > 1 ? Math.round((currentIdx / (totalEtapas - 1)) * 100) : 0

        return (
          <div
            key={p.id}
            className="flex border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
            onClick={() => onEdit?.(p)}
          >
            {/* Name */}
            <div className="w-[150px] shrink-0 px-3 py-2.5 flex flex-col justify-center">
              <span className="text-xs font-bold text-ink truncate group-hover:text-cobalt transition-colors">{p.nombre}</span>
              {p.responsable && <span className="text-[10px] text-slate truncate">{p.responsable}</span>}
            </div>

            {/* Gantt bar */}
            <div className="flex-1 flex items-center py-1.5 min-w-[300px]">
              {etapas.map((e, ei) => {
                const cfg = ETAPA_CONFIG[e]
                const isCurrent = ei === currentIdx
                const isFuture = ei > currentIdx

                return (
                  <div key={e} className="flex-1 px-0.5 flex items-center justify-center" style={{ height: 28 }}>
                    {isFuture ? (
                      <div className="w-full h-2 rounded-full bg-[#F1F5F9]" />
                    ) : (
                      <motion.div
                        className="w-full rounded-full flex items-center justify-center"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: '100%', opacity: 1 }}
                        transition={{ duration: 0.4, delay: pi * 0.05 + ei * 0.06, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                          height: isCurrent ? 22 : 8,
                          background: isCurrent ? cfg.color : cfg.color + '60',
                        }}
                      >
                        {isCurrent && (
                          <span className="text-[8px] font-bold text-white leading-none">{cfg.short}</span>
                        )}
                      </motion.div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Dates column */}
            <div className="w-[130px] shrink-0 px-2 py-2.5 flex flex-col items-center justify-center text-[10px]">
              <div className="flex items-center gap-1">
                <span className="text-slate">Inicio:</span>
                <span className="font-semibold text-ink">{fmtShortDate(p.fecha_inicio)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate">Meta:</span>
                <span className={`font-semibold ${p.fecha_objetivo && new Date(p.fecha_objetivo) < new Date() ? 'text-danger' : 'text-cobalt'}`}>
                  {fmtShortDate(p.fecha_objetivo)}
                </span>
              </div>
              <span className="text-[9px] font-bold mt-0.5" style={{ color: ETAPA_CONFIG[p.etapa]?.color }}>{pct}%</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
