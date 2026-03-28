'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useGarantias } from '@/lib/comites/use-garantias'
import { ESTADO_CONFIG, FIN_COLORS, fmtMM, fmtShort, fmtFecha } from '@/lib/comites/data'
import SummaryCard from '@/components/comites/SummaryCard'
import ViewToggle from '@/components/comites/ViewToggle'
import GarantiaModal from '@/components/comites/GarantiaModal'
import { toast } from '@/components/ui/Toast'

/**
 * Visor de garantias para areas distintas a Finanzas.
 * Muestra solo garantias vigentes/por_vencer + boton para solicitar nueva.
 * No permite editar ni eliminar — eso se hace desde Finanzas.
 */
export default function GarantiasViewer() {
  const { loading, garantias, entidades, proyectos, saveGarantia } = useGarantias()
  const [view, setView] = useState<'cards' | 'tabla'>('tabla')
  const [solicitarModal, setSolicitarModal] = useState(false)

  // Solo vigentes + por vencer + en renovacion
  const vigentes = garantias.filter(g =>
    g.estado === 'vigente' || g.estado === 'por_vencer' || g.estado === 'en_renovacion' || g.estado === 'solicitada'
  )

  const porVencer = vigentes.filter(g => g.dias !== null && g.dias > 0 && g.dias <= 30)
  const totalMonto = vigentes.reduce((s, g) => s + g.monto, 0)
  const totalVigentes = vigentes.filter(g => g.estado === 'vigente').length
  const totalPorVencer = porVencer.length
  const totalSolicitadas = vigentes.filter(g => g.estado === 'solicitada').length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-cobalt border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="mb-4">
        <h2 className="font-condensed text-xl font-extrabold">
          <span className="text-cobalt">Garantias</span> <span className="text-slate font-normal text-sm">vigentes</span>
        </h2>
        <p className="text-xs text-slate">Vista de garantias activas. Para gestion completa ir a Finanzas.</p>
      </div>

      {/* Alerta por vencer */}
      {porVencer.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 mb-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-danger flex items-center justify-center text-white text-base font-bold shrink-0">!</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-danger">{porVencer.length} garantia{porVencer.length > 1 ? 's' : ''} por vencer en 30 dias</p>
            <p className="text-[11px] text-red-800 truncate">{porVencer.map(g => `${g.proyecto} (${fmtShort(g.monto)}MM)`).join(' · ')}</p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <SummaryCard value={`${vigentes.length}`} label="Garantias activas" color="#1E293B" />
        <SummaryCard value={fmtMM(totalMonto)} label="Total comprometido" color={FIN_COLORS.comprometido} />
        <SummaryCard value={`${totalVigentes}`} label="Vigentes" color={FIN_COLORS.disponible} />
        <SummaryCard value={`${totalPorVencer}`} label="Por vencer (30d)" color={totalPorVencer > 0 ? FIN_COLORS.critico : '#94A3B8'} />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate">
          {vigentes.length} garantia{vigentes.length !== 1 ? 's' : ''} activa{vigentes.length !== 1 ? 's' : ''}
          {totalSolicitadas > 0 && <span className="text-cobalt ml-1">({totalSolicitadas} solicitada{totalSolicitadas > 1 ? 's' : ''})</span>}
        </p>
        <div className="flex gap-2 items-center">
          <ViewToggle view={view} onChange={v => setView(v as typeof view)} options={['cards', 'tabla']} />
          <button onClick={() => setSolicitarModal(true)}
            className="bg-cobalt text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-cobalt-dark transition-colors">
            Solicitar garantia
          </button>
        </div>
      </div>

      {/* Tabla */}
      {view === 'tabla' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
          <table className="w-full text-xs min-w-[650px]">
            <thead>
              <tr className="bg-[#F1F5F9] text-[10px] font-extrabold uppercase tracking-wider text-slate">
                <th className="text-left p-3">Proyecto</th>
                <th className="text-left p-3">Instrumento</th>
                <th className="text-left p-3">Entidad</th>
                <th className="text-right p-3" style={{ color: FIN_COLORS.aprobado }}>Monto</th>
                <th className="text-left p-3">Vencimiento</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-right p-3">Dias</th>
              </tr>
            </thead>
            <tbody>
              {vigentes.map(g => {
                const est = ESTADO_CONFIG[g.estado] || ESTADO_CONFIG.vigente
                return (
                  <tr key={g.id} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                    <td className="p-3 font-bold">{g.proyecto}</td>
                    <td className="p-3 text-[11px]">{g.instrumento_label}</td>
                    <td className="p-3 font-semibold">{g.entidad}</td>
                    <td className="p-3 text-right font-condensed text-sm font-extrabold" style={{ color: FIN_COLORS.aprobado }}>{fmtMM(g.monto)}</td>
                    <td className="p-3 text-[11px] text-slate">{g.fecha_vencimiento ? fmtFecha(g.fecha_vencimiento) : '—'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase"
                        style={{ background: est.color + '18', color: est.color }}>{est.label}</span>
                    </td>
                    <td className="p-3 text-right">
                      {g.dias !== null ? (
                        <span className={`text-[11px] font-bold ${g.dias <= 0 ? 'text-danger' : g.dias <= 30 ? 'text-amber' : 'text-success'}`}>
                          {g.dias <= 0 ? 'Vencida' : `${g.dias}d`}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-cobalt">Pendiente</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {vigentes.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-slate">Sin garantias vigentes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards */}
      {view === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {vigentes.map(g => {
            const est = ESTADO_CONFIG[g.estado] || ESTADO_CONFIG.vigente
            return (
              <motion.div key={g.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                className="bg-white rounded-xl border border-[#E2E8F0] p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-bold text-ink leading-tight">{g.proyecto}</p>
                  <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0"
                    style={{ background: est.color + '18', color: est.color }}>{est.label}</span>
                </div>
                <p className="text-[11px] text-slate mb-1">{g.instrumento_label} · {g.tipo_label}</p>
                <p className="text-[11px] text-slate mb-3">{g.entidad}</p>
                <div className="flex items-end justify-between">
                  <p className="font-condensed text-lg font-extrabold" style={{ color: FIN_COLORS.aprobado }}>{fmtMM(g.monto)}</p>
                  {g.dias !== null ? (
                    <span className={`text-[11px] font-bold ${g.dias <= 0 ? 'text-danger' : g.dias <= 30 ? 'text-amber' : 'text-success'}`}>
                      {g.dias <= 0 ? 'Vencida' : `${g.dias}d`}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-cobalt">Pendiente</span>
                  )}
                </div>
                {g.fecha_vencimiento && <p className="text-[10px] text-slate mt-1">Venc: {fmtFecha(g.fecha_vencimiento)}</p>}
              </motion.div>
            )
          })}
          {vigentes.length === 0 && (
            <div className="col-span-full bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate text-sm">
              Sin garantias vigentes.
            </div>
          )}
        </div>
      )}

      {/* Modal solicitar — reutiliza GarantiaModal en modo crear con estado "solicitada" */}
      <GarantiaModal
        open={solicitarModal}
        onClose={() => setSolicitarModal(false)}
        editing={null}
        proyectos={proyectos}
        entidades={entidades}
        defaultEstado="solicitada"
        onSave={async (input, id) => {
          await saveGarantia({ ...input, estado: 'solicitada' }, id)
          setSolicitarModal(false)
          toast('Garantia solicitada — Finanzas la gestionara')
        }}
        onDelete={async () => {}}
      />
    </>
  )
}
