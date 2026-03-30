'use client'
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useGarantias } from '@/lib/comites/use-garantias'
import { useProjects } from '@/lib/comites/use-projects'
import { ESTADO_CONFIG, FIN_COLORS, fmtMM, fmtShort, fmtFecha } from '@/lib/comites/data'
import SummaryCard from '@/components/comites/SummaryCard'
import ViewToggle from '@/components/comites/ViewToggle'
import GarantiaModal from '@/components/comites/GarantiaModal'
import { toast } from '@/components/ui/Toast'

/**
 * Visor de garantías para Estudios.
 * Solo muestra garantías de proyectos activos/adjudicados/cerrados con saldo (no Administración).
 * Permite ver y descargar documentos adjuntos. No permite editar — eso se hace desde Finanzas.
 */
export default function GarantiasViewer() {
  const { loading, garantias, entidades, proyectos: allProyectos, saveGarantia, uploadFile } = useGarantias()
  const { projects } = useProjects()
  const [view, setView] = useState<'cards' | 'tabla'>('tabla')
  const [solicitarModal, setSolicitarModal] = useState(false)
  const [devModal, setDevModal] = useState<string | null>(null) // garantia id for devolucion
  const [devFile, setDevFile] = useState<File | null>(null)
  const [devSaving, setDevSaving] = useState(false)

  async function handleDevolucion() {
    if (!devModal) return
    setDevSaving(true)
    let compUrl = ''
    let compNombre = ''
    if (devFile) {
      compUrl = await uploadFile(devFile, devModal, 'comprobante')
      compNombre = devFile.name
    }
    const g = garantias.find(x => x.id === devModal)
    if (g) {
      await saveGarantia({
        proyecto_id: g.proyecto_id, tipo: g.tipo, instrumento: g.instrumento,
        entidad: g.entidad, monto: g.monto,
        fecha_solicitud: g.fecha_solicitud, fecha_inicio: g.fecha_inicio,
        fecha_vencimiento: g.fecha_vencimiento,
        estado: 'devuelta', observacion: g.observacion,
        comprobante_url: compUrl, comprobante_nombre: compNombre,
        documento_url: g.documento_url, documento_nombre: g.documento_nombre,
      }, devModal)
    }
    setDevModal(null); setDevFile(null); setDevSaving(false)
    toast('Garantia marcada como devuelta')
  }

  // Todos los proyectos excepto Administración (Estudios necesita ver garantías de seriedad en licitaciones)
  const proyectosFiltro = useMemo(() =>
    projects.filter(p => p.nombre !== 'Administración'),
  [projects])

  const proyectoIds = useMemo(() => new Set(proyectosFiltro.map(p => p.id)), [proyectosFiltro])

  // Filtrar garantías: vigentes/por_vencer/en_renovacion/solicitada de todos los proyectos (no Administración)
  const vigentes = useMemo(() =>
    garantias.filter(g =>
      (g.estado === 'vigente' || g.estado === 'por_vencer' || g.estado === 'en_renovacion' || g.estado === 'solicitada') &&
      (!g.proyecto_id || proyectoIds.has(g.proyecto_id))
    ),
  [garantias, proyectoIds])

  const porVencer = vigentes.filter(g => g.dias !== null && g.dias > 0 && g.dias <= 30)
  const totalMonto = vigentes.reduce((s, g) => s + g.monto, 0)
  const totalVigentes = vigentes.filter(g => g.estado === 'vigente').length
  const totalPorVencer = porVencer.length
  const totalSolicitadas = vigentes.filter(g => g.estado === 'solicitada').length
  const conDocumento = vigentes.filter(g => g.documento_url).length

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
          <span style={{ color: 'var(--org-primary)' }}>Garantias</span> <span className="text-slate font-normal text-sm">activas</span>
        </h2>
        <p className="text-xs text-slate">Garantias vigentes de obras y licitaciones. Incluye seriedad de oferta. Gestion completa en Finanzas.</p>
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-4">
        <SummaryCard value={`${vigentes.length}`} label="Garantias activas" color="#1E293B" />
        <SummaryCard value={fmtMM(totalMonto)} label="Total comprometido" color={FIN_COLORS.comprometido} />
        <SummaryCard value={`${totalVigentes}`} label="Vigentes" color={FIN_COLORS.disponible} />
        <SummaryCard value={`${totalPorVencer}`} label="Por vencer (30d)" color={totalPorVencer > 0 ? FIN_COLORS.critico : '#94A3B8'} />
        <SummaryCard value={`${conDocumento}`} label="Con documento" color="#0B5ED7" />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate">
          {vigentes.length} garantia{vigentes.length !== 1 ? 's' : ''} · {proyectosFiltro.length} proyectos
          {totalSolicitadas > 0 && <span className="ml-1" style={{ color: 'var(--org-primary)' }}>({totalSolicitadas} solicitada{totalSolicitadas > 1 ? 's' : ''})</span>}
        </p>
        <div className="flex gap-2 items-center">
          <ViewToggle view={view} onChange={v => setView(v as typeof view)} options={['cards', 'tabla']} />
          <button onClick={() => setSolicitarModal(true)}
            className="text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
            style={{ background: 'var(--org-primary)' }}>
            Solicitar garantia
          </button>
        </div>
      </div>

      {/* Tabla */}
      {view === 'tabla' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
          <table className="w-full text-xs min-w-[750px]">
            <thead>
              <tr className="bg-[#F1F5F9] text-[10px] font-extrabold uppercase tracking-wider text-slate">
                <th className="text-left p-3">Proyecto</th>
                <th className="text-left p-3">Instrumento</th>
                <th className="text-left p-3">Entidad</th>
                <th className="text-right p-3" style={{ color: FIN_COLORS.aprobado }}>Monto</th>
                <th className="text-left p-3">Vencimiento</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-center p-3">Docs</th>
                <th className="text-right p-3">Dias</th>
                <th className="text-center p-3"></th>
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
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase"
                        style={{ background: est.color + '18', color: est.color }}>{est.label}</span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {g.documento_url && (
                          <a href={g.documento_url} target="_blank" rel="noopener noreferrer" title={g.documento_nombre || 'Documento'}
                            className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#F1F5F9] transition-colors text-[11px]" style={{ color: 'var(--org-primary)' }}>📄</a>
                        )}
                        {g.comprobante_url && (
                          <a href={g.comprobante_url} target="_blank" rel="noopener noreferrer" title={g.comprobante_nombre || 'Comprobante'}
                            className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#F1F5F9] transition-colors text-[11px] text-green-600">📋</a>
                        )}
                        {!g.documento_url && !g.comprobante_url && <span className="text-[10px] text-[#CBD5E1]">—</span>}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      {g.dias !== null ? (
                        <span className={`text-[11px] font-bold ${g.dias <= 0 ? 'text-danger' : g.dias <= 30 ? 'text-amber' : 'text-success'}`}>
                          {g.dias <= 0 ? 'Vencida' : `${g.dias}d`}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold" style={{ color: 'var(--org-primary)' }}>Pendiente</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {g.estado !== 'solicitada' && (
                        <button onClick={() => setDevModal(g.id)} className="text-[10px] font-semibold text-green-600 hover:underline">Devolver</button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {vigentes.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-slate">Sin garantias vigentes.</td></tr>
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
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0"
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
                    <span className="text-[11px] font-bold" style={{ color: 'var(--org-primary)' }}>Pendiente</span>
                  )}
                </div>
                {g.fecha_vencimiento && <p className="text-[10px] text-slate mt-1">Venc: {fmtFecha(g.fecha_vencimiento)}</p>}
                {(g.documento_url || g.comprobante_url) && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-[#F1F5F9]">
                    {g.documento_url && <a href={g.documento_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold hover:underline" style={{ color: 'var(--org-primary)' }}>📄 Ver documento</a>}
                    {g.comprobante_url && <a href={g.comprobante_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold text-green-600 hover:underline">📋 Ver comprobante</a>}
                  </div>
                )}
              </motion.div>
            )
          })}
          {vigentes.length === 0 && (
            <div className="col-span-full bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate text-sm">
              Sin garantias vigentes para obras activas.
            </div>
          )}
        </div>
      )}

      {/* Modal devolución */}
      {devModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setDevModal(null); setDevFile(null) }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[400px] mx-4 p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-condensed font-bold text-lg text-ink mb-3">Marcar como devuelta</h3>
            <p className="text-xs text-slate mb-4">La garantia se marcara como devuelta y los fondos se consideraran recuperados.</p>
            <label className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-[#CBD5E1] rounded-lg cursor-pointer hover:border-cobalt hover:bg-[#F8FAFC] transition-colors mb-4">
              <span className="text-[11px]">📎</span>
              <span className="text-[12px] text-[#9CA3AF]">{devFile ? devFile.name : 'Adjuntar evidencia (opcional)'}</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.eml" className="hidden" onChange={e => setDevFile(e.target.files?.[0] || null)} />
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setDevModal(null); setDevFile(null) }} className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-semibold">Cancelar</button>
              <button onClick={handleDevolucion} disabled={devSaving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors">
                {devSaving ? 'Guardando...' : 'Confirmar devolucion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal solicitar */}
      <GarantiaModal
        open={solicitarModal}
        onClose={() => setSolicitarModal(false)}
        editing={null}
        proyectos={allProyectos.filter(p => proyectoIds.has(p.id))}
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
