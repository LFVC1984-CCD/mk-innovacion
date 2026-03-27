'use client'
import type { Miembro } from '@/lib/types'
import { MIEMBRO_ESTADO_LABELS, MIEMBRO_ESTADO_COLORS } from '@/lib/types'

interface Props {
  miembro: Miembro
  proyectoColor?: string
  onEdit: () => void
  onDelete: () => void
}

export default function MiembroCard({ miembro: m, proyectoColor, onEdit, onDelete }: Props) {
  const estColor = MIEMBRO_ESTADO_COLORS[m.estado]

  return (
    <div
      className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: m.estado === 'disponible' ? '#D97706' : (proyectoColor || '#94A3B8') }}
    >
      <div className="p-4">
        <h3 className="text-[14px] font-semibold text-ink">{m.nombre}</h3>
        <p className="text-[12px] text-cobalt font-semibold">{m.cargo}</p>

        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
          {m.proyecto_nombre ? (
            <>
              <span
                className="w-[6px] h-[6px] rounded-full shrink-0"
                style={{ background: proyectoColor || '#94A3B8' }}
              />
              {m.proyecto_nombre}
            </>
          ) : (
            <span className="text-amber font-semibold">Sin proyecto asignado</span>
          )}
        </div>

        <p className="text-[10px] font-bold mt-1.5" style={{ color: estColor }}>
          {m.estado === 'activo' ? '●' : m.estado === 'disponible' ? '◌' : '○'} {MIEMBRO_ESTADO_LABELS[m.estado]}
        </p>

        {m.contacto && (
          <p className="text-[10px] text-slate-400 mt-1">{m.contacto}</p>
        )}

        <div className="flex gap-1.5 mt-3">
          <button
            onClick={onEdit}
            className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[11px] font-semibold hover:bg-slate-50 transition-colors"
          >
            Editar
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-danger text-[11px] font-semibold hover:bg-red-100 transition-colors"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
