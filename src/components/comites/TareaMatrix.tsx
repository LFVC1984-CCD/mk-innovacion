'use client'
import { useState } from 'react'
import { fmtFecha } from '@/lib/comites/data'
import type { Tarea, TareaTipo } from '@/lib/types'
import { TAREA_TIPO_LABELS, TAREA_TIPO_COLORS } from '@/lib/types'

const ESTADO_CFG: Record<string, { color: string; label: string; order: number }> = {
  'bloqueada': { color: '#DC2626', label: 'Bloqueadas', order: 0 },
  'en-proceso': { color: '#0B5ED7', label: 'En Proceso', order: 1 },
  'pendiente': { color: '#D97706', label: 'Pendientes', order: 2 },
  'completada': { color: '#16A34A', label: 'Completadas', order: 3 },
}

interface Props {
  tareas: Tarea[]
  compact?: boolean
}

export default function TareaMatrix({ tareas, compact = false }: Props) {
  const [filterTipo, setFilterTipo] = useState<TareaTipo | 'todas'>('todas')

  const filtered = filterTipo === 'todas' ? tareas : tareas.filter(t => t.tipo === filterTipo)

  // Group by estado
  const grupos = Object.entries(ESTADO_CFG)
    .map(([estado, cfg]) => ({
      estado,
      ...cfg,
      tareas: filtered.filter(t => t.estado === estado),
    }))
    .filter(g => g.tareas.length > 0)
    .sort((a, b) => a.order - b.order)

  // Count by tipo
  const tipoCounts: Record<string, number> = { todas: tareas.length }
  const tipoKeys: TareaTipo[] = ['seguimiento', 'acuerdo', 'accion_correctiva', 'solicitud']
  tipoKeys.forEach(t => { tipoCounts[t] = tareas.filter(ta => ta.tipo === t).length })

  return (
    <div>
      {/* Tipo filter pills */}
      <div className="flex gap-1 flex-wrap mb-4">
        <button
          onClick={() => setFilterTipo('todas')}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
            filterTipo === 'todas' ? 'border-cobalt text-cobalt bg-cobalt-light' : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
          }`}>
          Todas <span className="text-[9px] font-extrabold opacity-70">{tipoCounts.todas}</span>
        </button>
        {tipoKeys.map(tipo => {
          if (tipoCounts[tipo] === 0) return null
          const color = TAREA_TIPO_COLORS[tipo]
          const active = filterTipo === tipo
          return (
            <button key={tipo} onClick={() => setFilterTipo(tipo)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                active ? 'text-white' : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
              }`}
              style={active ? { background: color, borderColor: color } : {}}>
              {TAREA_TIPO_LABELS[tipo]} <span className="text-[9px] font-extrabold opacity-70">{tipoCounts[tipo]}</span>
            </button>
          )
        })}
      </div>

      {/* Groups by estado */}
      {grupos.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 text-center text-slate text-sm">
          Sin tareas{filterTipo !== 'todas' ? ` de tipo "${TAREA_TIPO_LABELS[filterTipo]}"` : ''}.
        </div>
      ) : (
        <div className={compact ? 'space-y-3' : 'grid grid-cols-1 lg:grid-cols-2 gap-3'}>
          {grupos.map(g => (
            <div key={g.estado} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
              <div className="px-4 py-2.5 flex items-center gap-2 border-b border-[#E2E8F0]" style={{ borderLeftWidth: 3, borderLeftColor: g.color }}>
                <span className="w-2 h-2 rounded-full" style={{ background: g.color }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: g.color }}>{g.label}</span>
                <span className="text-[10px] font-bold text-slate ml-auto">{g.tareas.length}</span>
              </div>
              <div className="divide-y divide-[#F1F5F9]">
                {g.tareas.map(t => (
                  <div key={t.id} className="px-4 py-2.5 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: TAREA_TIPO_COLORS[t.tipo || 'seguimiento'] + '15', color: TAREA_TIPO_COLORS[t.tipo || 'seguimiento'] }}>
                          {TAREA_TIPO_LABELS[t.tipo || 'seguimiento']}
                        </span>
                        {t.area_id !== t.area_destino && t.area_destino && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0891B2]/10 text-[#0891B2]">
                            ← {t.area_id.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink leading-snug">{t.texto}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate">
                        {t.responsable && <span>{t.responsable}</span>}
                        {t.fecha_compromiso && <span className="text-cobalt font-semibold">{fmtFecha(t.fecha_compromiso)}</span>}
                        {!t.fecha_compromiso && t.estado !== 'completada' && <span className="text-danger font-semibold">Sin fecha</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
