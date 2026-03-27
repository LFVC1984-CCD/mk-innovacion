'use client'
import type { Proyecto } from '@/lib/types'
import { ESTADO_LABELS, ESTADO_COLORS, ESTADO_ICONS, isObra } from '@/lib/types'
import { fmtMM, fmtFecha } from '@/lib/comites/data'

interface Props {
  proyecto: Proyecto
  onEdit: () => void
  onDelete: () => void
}

export default function ProyectoCard({ proyecto: p, onEdit, onDelete }: Props) {
  const color = ESTADO_COLORS[p.estado]
  const obra = isObra(p)
  const spiColor = p.spi >= 1 ? '#16A34A' : p.spi >= 0.85 ? '#D97706' : '#DC2626'

  return (
    <div
      className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      <div className="p-4">
        {/* Name + Estado */}
        <h3 className="text-[15px] font-bold text-ink leading-tight">{p.nombre}</h3>
        <p className="text-[11px] font-bold mt-0.5" style={{ color }}>
          {ESTADO_ICONS[p.estado]} {ESTADO_LABELS[p.estado]}
        </p>

        {/* Mandante + Admin */}
        {p.mandante && (
          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
            <span className="font-semibold text-ink2">Mandante:</span> {p.mandante}
          </p>
        )}
        {p.administrador && (
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-ink2">Admin:</span> {p.administrador}
          </p>
        )}

        {/* Dates */}
        {(p.fecha_inicio || p.fecha_termino) && (
          <div className="flex gap-3 mt-1.5 text-[10px] text-slate-500 flex-wrap">
            {p.fecha_inicio && <span>📅 Inicio: {fmtFecha(p.fecha_inicio)}</span>}
            {p.fecha_termino && <span>🏁 Contractual: {fmtFecha(p.fecha_termino)}</span>}
            {p.fecha_fin_asbuilt && (
              <span style={{ color: new Date(p.fecha_fin_asbuilt) > new Date(p.fecha_termino || '') ? '#DC2626' : '#16A34A', fontWeight: 600 }}>
                🔧 Asbuilt: {fmtFecha(p.fecha_fin_asbuilt)}
              </span>
            )}
          </div>
        )}

        {/* Estudio pills */}
        {p.monto_licitacion > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cobalt-light text-cobalt font-semibold">
              Licit: {fmtMM(p.monto_licitacion)}
            </span>
            {p.margen_estudio_pct > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cobalt-light text-cobalt font-semibold">
                Margen est: {p.margen_estudio_pct}%
              </span>
            )}
          </div>
        )}

        {/* Adjudicación pills */}
        {p.monto_adjudicado > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-success font-semibold">
              Adjudicado: {fmtMM(p.monto_adjudicado)}
            </span>
            {p.meta_margen > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-success font-semibold">
                Meta: {fmtMM(p.meta_margen)}
              </span>
            )}
          </div>
        )}

        {/* Obra financial pills */}
        {obra && p.contrato > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cobalt-light text-cobalt font-semibold">
              Contrato: {fmtMM(p.contrato)}
            </span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: spiColor + '15', color: spiColor }}
            >
              SPI {p.spi}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cobalt-light text-cobalt font-semibold">
              {p.avance_real}%
            </span>
          </div>
        )}

        {/* Comprometido desglose */}
        {obra && p.comprometido > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber font-semibold">
              Comprometido: {fmtMM(p.comprometido)}
            </span>
          </div>
        )}

        {/* Observación */}
        {p.observacion && (
          <p className="text-[11px] text-ink2 mt-2 italic truncate">{p.observacion}</p>
        )}

        {/* Actions */}
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
