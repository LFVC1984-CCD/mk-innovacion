'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRRHH } from '@/lib/comites/use-rrhh'
import type { MetricaRRHH, MetricaRRHHInput, DocRRHH, DocRRHHInput, Capacitacion, CapacitacionInput, Auditoria, AuditoriaInput } from '@/lib/comites/use-rrhh'
import { useProjects } from '@/lib/comites/use-projects'
import { useAuth } from '@/lib/comites/hooks'
import Modal, { Field, Input, Select, Row2, Btn } from '@/components/comites/Modal'
import SummaryCard from '@/components/comites/SummaryCard'
import KpiCards from '@/components/comites/KpiCards'
import ViewToggle from '@/components/comites/ViewToggle'
import HBar from '@/components/comites/HBar'
import { toast } from '@/components/ui/Toast'

// ── Config ──

const ESTADO_DOC: Record<string, { label: string; color: string }> = {
  vigente: { label: 'Vigente', color: '#16A34A' },
  por_vencer: { label: 'Por vencer', color: '#D97706' },
  vencido: { label: 'Vencido', color: '#DC2626' },
  en_revision: { label: 'En revision', color: '#0B5ED7' },
  borrador: { label: 'Borrador', color: '#94A3B8' },
}
const TIPO_DOC: Record<string, string> = {
  procedimiento: 'Procedimiento', reglamento: 'Reglamento', certificacion: 'Certificacion',
  politica: 'Politica', contrato_marco: 'Contrato marco', otro: 'Otro',
}
const TIPO_CAP: Record<string, string> = {
  induccion: 'Induccion', tecnica: 'Tecnica', seguridad: 'Seguridad',
  liderazgo: 'Liderazgo', normativa: 'Normativa', otro: 'Otro',
}
const ESTADO_CAP: Record<string, { label: string; color: string }> = {
  programada: { label: 'Programada', color: '#0B5ED7' },
  completada: { label: 'Completada', color: '#16A34A' },
  cancelada: { label: 'Cancelada', color: '#DC2626' },
}
const RESULTADO_AUD: Record<string, { label: string; color: string }> = {
  aprobada: { label: 'Aprobada', color: '#16A34A' },
  aprobada_observaciones: { label: 'Aprobada c/obs', color: '#D97706' },
  reprobada: { label: 'Reprobada', color: '#DC2626' },
  pendiente: { label: 'Pendiente', color: '#94A3B8' },
  en_proceso: { label: 'En proceso', color: '#0B5ED7' },
}
const TIPO_AUD: Record<string, string> = {
  interna: 'Interna', externa: 'Externa', mutual: 'Mutual', ist: 'IST', achs: 'ACHS', otro: 'Otro',
}

function fmtMes(mes: string): string {
  const [y, m] = mes.split('-')
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${meses[parseInt(m) - 1]} ${y.slice(2)}`
}

type SubTab = 'dotacion' | 'auditorias' | 'documentacion' | 'capacitaciones'

export default function RRHHPanel() {
  const { metricas, docs, capacitaciones, auditorias, loading, saveMetrica, removeMetrica, saveDoc, removeDoc, saveCapacitacion, removeCapacitacion, saveAuditoria, removeAuditoria } = useRRHH()
  const { projects } = useProjects()
  const { canEdit } = useAuth()
  const ce = canEdit('rrhh')
  const [subTab, setSubTab] = useState<SubTab>('dotacion')

  // ── Último mes de métricas para consolidado ──
  const ultimo = metricas[0] // ya ordenado desc

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-20 skeleton rounded-xl" />
        <div className="h-48 skeleton rounded-xl" />
      </div>
    )
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 mb-5 border-b border-[#E2E8F0] pb-0">
        {([
          { id: 'dotacion' as const, label: 'Dotacion', count: metricas.length },
          { id: 'auditorias' as const, label: 'Auditorias', count: auditorias.length },
          { id: 'documentacion' as const, label: 'Documentacion', count: docs.length },
          { id: 'capacitaciones' as const, label: 'Capacitaciones', count: capacitaciones.length },
        ]).map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`relative px-4 py-2.5 text-xs font-bold transition-all ${
              subTab === t.id ? 'text-cobalt' : 'text-slate hover:text-ink'
            }`}>
            {t.label}
            <span className={`ml-1.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
              subTab === t.id ? 'bg-cobalt/10 text-cobalt' : 'bg-slate-100 text-slate'
            }`}>{t.count}</span>
            {subTab === t.id && (
              <motion.div layoutId="rrhh-subtab"
                className="absolute bottom-0 left-2 right-2 h-0.5 bg-cobalt rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {subTab === 'dotacion' && (
          <motion.div key="dotacion" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            <DotacionTab metricas={metricas} ultimo={ultimo} canEdit={ce}
              onSave={saveMetrica} onRemove={removeMetrica}
              docs={docs} capacitaciones={capacitaciones} />
          </motion.div>
        )}
        {subTab === 'auditorias' && (
          <motion.div key="auditorias" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            <AuditoriasTab auditorias={auditorias} canEdit={ce}
              onSave={saveAuditoria} onRemove={removeAuditoria} />
          </motion.div>
        )}
        {subTab === 'documentacion' && (
          <motion.div key="documentacion" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            <DocumentacionTab docs={docs} canEdit={ce} onSave={saveDoc} onRemove={removeDoc} />
          </motion.div>
        )}
        {subTab === 'capacitaciones' && (
          <motion.div key="capacitaciones" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            <CapacitacionesTab capacitaciones={capacitaciones} projects={projects} canEdit={ce}
              onSave={saveCapacitacion} onRemove={removeCapacitacion} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════
//  DOTACIÓN — Métricas consolidadas mensuales
// ══════════════════════════════════════

function DotacionTab({ metricas, ultimo, canEdit, onSave, onRemove, docs, capacitaciones }: {
  metricas: MetricaRRHH[]; ultimo: MetricaRRHH | undefined; canEdit: boolean
  onSave: (m: MetricaRRHHInput & { id?: string }) => Promise<void>; onRemove: (id: string) => Promise<void>
  docs: DocRRHH[]; capacitaciones: Capacitacion[]
}) {
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<MetricaRRHH | null>(null)
  const [dotView, setDotView] = useState<'tabla' | 'grafico'>('tabla')

  // Data for grafico: last 6 months reversed (oldest first)
  const last6 = useMemo(() => metricas.slice(0, 6).reverse(), [metricas])
  const maxDot = useMemo(() => Math.max(...last6.map(m => Math.max(m.dotacion_constructora, m.dotacion_subcontrato)), 1), [last6])

  return (
    <>
      {/* Consolidado último mes */}
      <KpiCards items={[
        { label: 'Constructora', value: ultimo?.dotacion_constructora ?? '—', color: '#0B5ED7', sub: ultimo ? fmtMes(ultimo.mes) : 'Sin datos' },
        { label: 'Subcontratos', value: ultimo?.dotacion_subcontrato ?? '—', color: '#D97706' },
        { label: 'Total vigentes', value: ultimo?.trabajadores_vigentes ?? '—', color: '#E1BA10' },
        { label: 'Tasa Asistencia', value: ultimo?.tasa_asistencia ? `${ultimo.tasa_asistencia}%` : '—', color: (ultimo?.tasa_asistencia ?? 0) >= 90 ? '#16A34A' : (ultimo?.tasa_asistencia ?? 0) >= 80 ? '#D97706' : '#DC2626' },
        { label: 'Movimientos', value: `+${ultimo?.contrataciones ?? 0} / -${ultimo?.desvinculaciones ?? 0}`, color: '#0B5ED7', sub: `${ultimo?.licencias_medicas ?? 0} lic · ${ultimo?.vacaciones ?? 0} vac` },
      ]} />

      {/* Insight narrativo dotacion */}
      {ultimo && (() => {
        const totalDot = (ultimo.dotacion_constructora || 0) + (ultimo.dotacion_subcontrato || 0)
        const docsVencidos = docs.filter(d => d.estado === 'vencido').length
        const docsPorVencer = docs.filter(d => d.estado === 'por_vencer').length
        const horasCompletadas = capacitaciones.filter(c => c.estado === 'completada').reduce((s, c) => s + c.horas, 0)
        const horasProgramadas = capacitaciones.filter(c => c.estado === 'programada').reduce((s, c) => s + c.horas, 0)
        return (
          <div className="mt-0 mb-4 p-3 rounded-lg bg-cobalt-light border border-cobalt/10">
            <p className="text-[11px] text-cobalt-dark leading-relaxed">
              <span className="font-bold">Dotacion total: {totalDot} personas</span>
              {' — '}{ultimo.dotacion_constructora} Constructora + {ultimo.dotacion_subcontrato} subcontratos ({fmtMes(ultimo.mes)}).
              {(docsVencidos > 0 || docsPorVencer > 0) && <><br /><span className={docsVencidos > 0 ? 'text-red-600 font-bold' : 'font-bold'}>{docsVencidos > 0 ? `${docsVencidos} documento${docsVencidos !== 1 ? 's' : ''} vencido${docsVencidos !== 1 ? 's' : ''}` : ''}{docsVencidos > 0 && docsPorVencer > 0 ? ' y ' : ''}{docsPorVencer > 0 ? `${docsPorVencer} por vencer` : ''}</span> — requiere atencion.</>}
              {(horasCompletadas > 0 || horasProgramadas > 0) && <><br />Capacitacion: <b>{horasCompletadas}h realizadas</b>{horasProgramadas > 0 ? `, ${horasProgramadas}h programadas` : ''}.</>}
            </p>
          </div>
        )
      })()}

      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate">{metricas.length} mes{metricas.length !== 1 ? 'es' : ''} registrado{metricas.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2 items-center">
          <ViewToggle view={dotView} onChange={v => setDotView(v as 'tabla' | 'grafico')} options={['tabla', 'grafico']} />
          {canEdit && (
            <button onClick={() => { setEditing(null); setModal(true) }}
              className="bg-cobalt text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-cobalt-dark btn-scale">
              + Registrar mes
            </button>
          )}
        </div>
      </div>

      {/* Tabla histórica */}
      {dotView === 'tabla' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
          <table className="w-full text-xs min-w-[750px]">
            <thead>
              <tr className="bg-[#F1F5F9] text-[10px] font-extrabold uppercase tracking-wider text-slate">
                <th className="text-left p-3">Mes</th>
                <th className="text-right p-3">Constructora</th>
                <th className="text-right p-3">Subcontrato</th>
                <th className="text-right p-3">Total</th>
                <th className="text-right p-3">Asistencia</th>
                <th className="text-right p-3">Lic. med.</th>
                <th className="text-right p-3">Vac.</th>
                <th className="text-right p-3">Ingresos</th>
                <th className="text-right p-3">Salidas</th>
                <th className="text-left p-3">Obs.</th>
              </tr>
            </thead>
            <tbody>
              {metricas.map(m => (
                <tr key={m.id} onClick={() => { setEditing(m); setModal(true) }}
                  className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                  <td className="p-3 font-bold">{fmtMes(m.mes)}</td>
                  <td className="p-3 text-right font-condensed font-bold text-[#0B5ED7]">{m.dotacion_constructora}</td>
                  <td className="p-3 text-right font-condensed font-bold text-[#D97706]">{m.dotacion_subcontrato}</td>
                  <td className="p-3 text-right font-condensed font-bold text-ink">{m.trabajadores_vigentes}</td>
                  <td className="p-3 text-right font-bold" style={{ color: m.tasa_asistencia >= 90 ? '#16A34A' : m.tasa_asistencia >= 80 ? '#D97706' : '#DC2626' }}>
                    {m.tasa_asistencia > 0 ? `${m.tasa_asistencia}%` : '—'}
                  </td>
                  <td className="p-3 text-right">{m.licencias_medicas || '—'}</td>
                  <td className="p-3 text-right">{m.vacaciones || '—'}</td>
                  <td className="p-3 text-right text-[#16A34A] font-bold">{m.contrataciones > 0 ? `+${m.contrataciones}` : '—'}</td>
                  <td className="p-3 text-right text-[#DC2626] font-bold">{m.desvinculaciones > 0 ? `-${m.desvinculaciones}` : '—'}</td>
                  <td className="p-3 text-[11px] text-slate max-w-[120px] truncate">{m.observacion || '—'}</td>
                </tr>
              ))}
              {metricas.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-slate">Sin registros mensuales. Agrega el primer mes.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Gráfico dotación por mes */}
      {dotView === 'grafico' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-4">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate mb-3">Dotacion por mes (ultimos 6 meses)</p>
          {last6.length === 0 && <p className="text-xs text-slate text-center py-6">Sin datos para graficar.</p>}
          {last6.map((m, i) => (
            <div key={m.id} className="space-y-1.5">
              <p className="text-[11px] font-bold text-ink">{fmtMes(m.mes)}</p>
              <HBar label="Constructora" value={m.dotacion_constructora} max={maxDot} color="#0B5ED7" delay={i * 0.05} />
              <HBar label="Subcontrato" value={m.dotacion_subcontrato} max={maxDot} color="#D97706" delay={i * 0.05 + 0.03} />
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <MetricaModal open={modal} onClose={() => setModal(false)} editing={editing}
        onSave={async (input, id) => { await onSave({ ...input, id }); setModal(false); toast(id ? 'Mes actualizado' : 'Mes registrado') }}
        onDelete={async (id) => { await onRemove(id); setModal(false); toast('Registro eliminado') }} />
    </>
  )
}

// ══════════════════════════════════════
//  AUDITORÍAS
// ══════════════════════════════════════

function AuditoriasTab({ auditorias, canEdit, onSave, onRemove }: {
  auditorias: Auditoria[]; canEdit: boolean
  onSave: (a: AuditoriaInput & { id?: string }) => Promise<void>; onRemove: (id: string) => Promise<void>
}) {
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Auditoria | null>(null)
  const [filtro, setFiltro] = useState<string>('todas')
  const [searchAud, setSearchAud] = useState('')
  const [audView, setAudView] = useState<'cards' | 'tabla'>('cards')

  const stats = useMemo(() => {
    const aprobadas = auditorias.filter(a => a.resultado === 'aprobada' || a.resultado === 'aprobada_observaciones').length
    const reprobadas = auditorias.filter(a => a.resultado === 'reprobada').length
    const pendientes = auditorias.filter(a => a.resultado === 'pendiente' || a.resultado === 'en_proceso').length
    const hallazgosAbiertos = auditorias.reduce((s, a) => s + (a.hallazgos - a.hallazgos_cerrados), 0)
    return { aprobadas, reprobadas, pendientes, hallazgosAbiertos }
  }, [auditorias])

  const filtered = useMemo(() => {
    let list = filtro === 'todas' ? auditorias
      : filtro === 'pendientes' ? auditorias.filter(a => a.resultado === 'pendiente' || a.resultado === 'en_proceso')
      : auditorias.filter(a => a.resultado === filtro)
    if (searchAud) {
      const s = searchAud.toLowerCase()
      list = list.filter(a => a.nombre.toLowerCase().includes(s) || (a.auditor || '').toLowerCase().includes(s))
    }
    return list
  }, [auditorias, filtro, searchAud])

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <SummaryCard value={`${auditorias.length}`} label="Total auditorias" color="#1E293B" />
        <SummaryCard value={`${stats.aprobadas}`} label="Aprobadas" color="#16A34A" />
        <SummaryCard value={`${stats.pendientes}`} label="Pendientes" color="#0B5ED7" />
        <SummaryCard value={`${stats.hallazgosAbiertos}`} label="Hallazgos abiertos" color={stats.hallazgosAbiertos > 0 ? '#DC2626' : '#16A34A'} />
      </div>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-1.5">
          {([
            { key: 'todas', label: 'Todas', count: auditorias.length },
            { key: 'pendientes', label: 'Pendientes', count: stats.pendientes },
            { key: 'aprobada', label: 'Aprobadas', count: stats.aprobadas },
            { key: 'reprobada', label: 'Reprobadas', count: stats.reprobadas },
          ]).map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                filtro === f.key ? 'bg-cobalt text-white border-cobalt' : 'bg-white border-[#E2E8F0] text-slate hover:border-cobalt hover:text-cobalt'
              }`}>
              {f.label}
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${filtro === f.key ? 'bg-white/20' : 'bg-slate-100'}`}>{f.count}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <ViewToggle view={audView} onChange={v => setAudView(v as 'cards' | 'tabla')} options={['cards', 'tabla']} />
          <input type="text" placeholder="Buscar auditoria..." value={searchAud} onChange={e => setSearchAud(e.target.value)}
            className="w-48 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs outline-none focus:border-cobalt transition-colors placeholder:text-[#CBD5E1]" />
          {canEdit && (
            <button onClick={() => { setEditing(null); setModal(true) }}
              className="bg-cobalt text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-cobalt-dark btn-scale">
              + Nueva auditoria
            </button>
          )}
        </div>
      </div>

      {/* Cards view */}
      {audView === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(a => {
            const res = RESULTADO_AUD[a.resultado]
            const abiertos = a.hallazgos - a.hallazgos_cerrados
            return (
              <div key={a.id} onClick={() => { setEditing(a); setModal(true) }}
                className="bg-white rounded-xl border border-[#E2E8F0] p-4 hover:shadow-md hover:border-[#CBD5E1] transition-all cursor-pointer"
                style={{ borderLeftWidth: 3, borderLeftColor: res.color }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs font-bold text-ink leading-tight">{a.nombre}</p>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold shrink-0"
                    style={{ background: res.color + '18', color: res.color }}>{res.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  <span className="text-slate">Tipo</span>
                  <span className="font-semibold">{TIPO_AUD[a.tipo] || a.tipo}</span>
                  <span className="text-slate">Fecha</span>
                  <span className="font-semibold">{a.fecha || '—'}</span>
                  <span className="text-slate">Puntaje</span>
                  <span className="font-bold">{a.puntaje != null ? `${a.puntaje}%` : '—'}</span>
                  <span className="text-slate">Hallazgos</span>
                  <span className="font-semibold">
                    {a.hallazgos > 0 ? <>{a.hallazgos_cerrados}/{a.hallazgos}{abiertos > 0 && <span className="text-[#DC2626] ml-1">({abiertos})</span>}</> : '—'}
                  </span>
                  <span className="text-slate">Auditor</span>
                  <span className="font-semibold">{a.auditor || '—'}</span>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <p className="col-span-full text-center text-slate text-xs py-8">{searchAud ? 'Sin resultados.' : 'Sin auditorias en este filtro.'}</p>}
        </div>
      )}

      {/* Tabla view */}
      {audView === 'tabla' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="bg-[#F1F5F9] text-[10px] font-extrabold uppercase tracking-wider text-slate">
                <th className="text-left p-3">Auditoria</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Resultado</th>
                <th className="text-right p-3">Puntaje</th>
                <th className="text-right p-3">Hallazgos</th>
                <th className="text-left p-3">Auditor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const res = RESULTADO_AUD[a.resultado]
                const abiertos = a.hallazgos - a.hallazgos_cerrados
                return (
                  <tr key={a.id} onClick={() => { setEditing(a); setModal(true) }}
                    className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                    <td className="p-3 font-bold">{a.nombre}</td>
                    <td className="p-3 text-[11px]">{TIPO_AUD[a.tipo] || a.tipo}</td>
                    <td className="p-3 text-[11px] text-slate">{a.fecha || '—'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold"
                        style={{ background: res.color + '18', color: res.color }}>{res.label}</span>
                    </td>
                    <td className="p-3 text-right font-bold">{a.puntaje != null ? `${a.puntaje}%` : '—'}</td>
                    <td className="p-3 text-right">
                      {a.hallazgos > 0 ? (
                        <span>
                          <span className="font-bold">{a.hallazgos_cerrados}/{a.hallazgos}</span>
                          {abiertos > 0 && <span className="text-danger font-bold ml-1">({abiertos} abiertos)</span>}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-3 text-[11px] text-slate">{a.auditor || '—'}</td>
                  </tr>
                )
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate">{searchAud ? 'Sin resultados.' : 'Sin auditorias en este filtro.'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <AuditoriaModal open={modal} onClose={() => setModal(false)} editing={editing}
        onSave={async (input, id) => { await onSave({ ...input, id }); setModal(false); toast(id ? 'Auditoria actualizada' : 'Auditoria registrada') }}
        onDelete={async (id) => { await onRemove(id); setModal(false); toast('Eliminada') }} />
    </>
  )
}

// ══════════════════════════════════════
//  DOCUMENTACIÓN
// ══════════════════════════════════════

function DocumentacionTab({ docs, canEdit, onSave, onRemove }: {
  docs: DocRRHH[]; canEdit: boolean
  onSave: (d: DocRRHHInput & { id?: string }) => Promise<void>; onRemove: (id: string) => Promise<void>
}) {
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<DocRRHH | null>(null)
  const [filtroDoc, setFiltroDoc] = useState<string>('todos')
  const [searchDoc, setSearchDoc] = useState('')
  const [docView, setDocView] = useState<'cards' | 'tabla'>('cards')

  const stats = useMemo(() => {
    const vigentes = docs.filter(d => d.estado === 'vigente').length
    const porVencer = docs.filter(d => d.estado === 'por_vencer').length
    const vencidos = docs.filter(d => d.estado === 'vencido').length
    return { vigentes, porVencer, vencidos }
  }, [docs])

  const docsFiltrados = useMemo(() => {
    let list = filtroDoc === 'todos' ? docs : docs.filter(d => d.estado === filtroDoc)
    if (searchDoc) {
      const s = searchDoc.toLowerCase()
      list = list.filter(d => d.nombre.toLowerCase().includes(s) || (d.responsable || '').toLowerCase().includes(s))
    }
    return list
  }, [docs, filtroDoc, searchDoc])

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <SummaryCard value={`${docs.length}`} label="Total documentos" color="#1E293B" />
        <SummaryCard value={`${stats.vigentes}`} label="Vigentes" color="#16A34A" />
        <SummaryCard value={`${stats.porVencer}`} label="Por vencer" color="#D97706" />
        <SummaryCard value={`${stats.vencidos}`} label="Vencidos" color="#DC2626" />
      </div>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-1.5">
          {([
            { key: 'todos', label: 'Todos', count: docs.length },
            { key: 'vigente', label: 'Vigentes', count: stats.vigentes },
            { key: 'por_vencer', label: 'Por vencer', count: stats.porVencer },
            { key: 'vencido', label: 'Vencidos', count: stats.vencidos },
          ]).map(f => (
            <button key={f.key} onClick={() => setFiltroDoc(f.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                filtroDoc === f.key ? 'bg-cobalt text-white border-cobalt' : 'bg-white border-[#E2E8F0] text-slate hover:border-cobalt hover:text-cobalt'
              }`}>
              {f.label}
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${filtroDoc === f.key ? 'bg-white/20' : 'bg-slate-100'}`}>{f.count}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <ViewToggle view={docView} onChange={v => setDocView(v as 'cards' | 'tabla')} options={['cards', 'tabla']} />
          <input type="text" placeholder="Buscar documento..." value={searchDoc} onChange={e => setSearchDoc(e.target.value)}
            className="w-48 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs outline-none focus:border-cobalt transition-colors placeholder:text-[#CBD5E1]" />
          {canEdit && (
            <button onClick={() => { setEditing(null); setModal(true) }}
              className="bg-cobalt text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-cobalt-dark btn-scale">
              + Nuevo documento
            </button>
          )}
        </div>
      </div>

      {/* Cards view */}
      {docView === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {docsFiltrados.map(d => {
            const est = ESTADO_DOC[d.estado]
            return (
              <div key={d.id} onClick={() => { setEditing(d); setModal(true) }}
                className="bg-white rounded-xl border border-[#E2E8F0] p-4 hover:shadow-md hover:border-[#CBD5E1] transition-all cursor-pointer"
                style={{ borderLeftWidth: 3, borderLeftColor: est.color }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs font-bold text-ink leading-tight">{d.nombre}</p>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold shrink-0"
                    style={{ background: est.color + '18', color: est.color }}>{est.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  <span className="text-slate">Tipo</span>
                  <span className="font-semibold">{TIPO_DOC[d.tipo] || d.tipo}</span>
                  <span className="text-slate">Responsable</span>
                  <span className="font-semibold">{d.responsable || '—'}</span>
                  <span className="text-slate">Vencimiento</span>
                  <span className="font-semibold">{d.fecha_vencimiento || '—'}</span>
                </div>
                {d.url && (
                  <div className="mt-2 pt-2 border-t border-[#F1F5F9]">
                    <a href={d.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      className="text-cobalt hover:underline text-[11px] font-semibold">Ver documento</a>
                  </div>
                )}
              </div>
            )
          })}
          {docsFiltrados.length === 0 && <p className="col-span-full text-center text-slate text-xs py-8">{searchDoc ? 'Sin resultados.' : 'Sin documentos en este filtro.'}</p>}
        </div>
      )}

      {/* Tabla view */}
      {docView === 'tabla' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
          <table className="w-full text-xs min-w-[650px]">
            <thead>
              <tr className="bg-[#F1F5F9] text-[10px] font-extrabold uppercase tracking-wider text-slate">
                <th className="text-left p-3">Documento</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-left p-3">Responsable</th>
                <th className="text-left p-3">Vencimiento</th>
                <th className="text-left p-3">Enlace</th>
              </tr>
            </thead>
            <tbody>
              {docsFiltrados.map(d => {
                const est = ESTADO_DOC[d.estado]
                return (
                  <tr key={d.id} onClick={() => { setEditing(d); setModal(true) }}
                    className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                    <td className="p-3 font-bold">{d.nombre}</td>
                    <td className="p-3 text-[11px]">{TIPO_DOC[d.tipo] || d.tipo}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold"
                        style={{ background: est.color + '18', color: est.color }}>{est.label}</span>
                    </td>
                    <td className="p-3 text-slate">{d.responsable || '—'}</td>
                    <td className="p-3 text-[11px] text-slate">{d.fecha_vencimiento || '—'}</td>
                    <td className="p-3">{d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-cobalt hover:underline text-[11px]">Ver</a> : '—'}</td>
                  </tr>
                )
              })}
              {docsFiltrados.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate">{searchDoc ? 'Sin resultados.' : 'Sin documentos en este filtro.'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <DocModal open={modal} onClose={() => setModal(false)} editing={editing}
        onSave={async (input, id) => { await onSave({ ...input, id }); setModal(false); toast(id ? 'Actualizado' : 'Documento agregado') }}
        onDelete={async (id) => { await onRemove(id); setModal(false); toast('Eliminado') }} />
    </>
  )
}

// ══════════════════════════════════════
//  CAPACITACIONES
// ══════════════════════════════════════

function CapacitacionesTab({ capacitaciones, projects, canEdit, onSave, onRemove }: {
  capacitaciones: Capacitacion[]; projects: { id: string; nombre: string }[]; canEdit: boolean
  onSave: (c: CapacitacionInput & { id?: string }) => Promise<void>; onRemove: (id: string) => Promise<void>
}) {
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Capacitacion | null>(null)
  const [filtroCap, setFiltroCap] = useState<string>('todas')
  const [searchCap, setSearchCap] = useState('')
  const [capView, setCapView] = useState<'cards' | 'tabla' | 'grafico'>('tabla')

  const stats = useMemo(() => {
    const completadas = capacitaciones.filter(c => c.estado === 'completada').length
    const programadas = capacitaciones.filter(c => c.estado === 'programada').length
    const horasTotal = capacitaciones.filter(c => c.estado === 'completada').reduce((s, c) => s + c.horas, 0)
    return { completadas, programadas, horasTotal }
  }, [capacitaciones])

  const horasPorTipo = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of capacitaciones) {
      map.set(c.tipo, (map.get(c.tipo) || 0) + c.horas)
    }
    return Array.from(map.entries()).map(([tipo, horas]) => ({ tipo, label: TIPO_CAP[tipo] || tipo, horas }))
      .sort((a, b) => b.horas - a.horas)
  }, [capacitaciones])
  const maxHorasTipo = useMemo(() => Math.max(...horasPorTipo.map(h => h.horas), 1), [horasPorTipo])

  const capFiltradas = useMemo(() => {
    let list = filtroCap === 'todas' ? capacitaciones : capacitaciones.filter(c => c.estado === filtroCap)
    if (searchCap) {
      const s = searchCap.toLowerCase()
      list = list.filter(c => c.nombre.toLowerCase().includes(s) || (c.persona || '').toLowerCase().includes(s) || (c.proveedor || '').toLowerCase().includes(s))
    }
    return list
  }, [capacitaciones, filtroCap, searchCap])

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <SummaryCard value={`${capacitaciones.length}`} label="Total capacitaciones" color="#1E293B" />
        <SummaryCard value={`${stats.completadas}`} label="Completadas" color="#16A34A" />
        <SummaryCard value={`${stats.programadas}`} label="Programadas" color="#0B5ED7" />
        <SummaryCard value={`${stats.horasTotal}h`} label="Horas realizadas" color="#D97706" />
      </div>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-1.5">
          {([
            { key: 'todas', label: 'Todas', count: capacitaciones.length },
            { key: 'programada', label: 'Programadas', count: stats.programadas },
            { key: 'completada', label: 'Completadas', count: stats.completadas },
          ]).map(f => (
            <button key={f.key} onClick={() => setFiltroCap(f.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                filtroCap === f.key ? 'bg-cobalt text-white border-cobalt' : 'bg-white border-[#E2E8F0] text-slate hover:border-cobalt hover:text-cobalt'
              }`}>
              {f.label}
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${filtroCap === f.key ? 'bg-white/20' : 'bg-slate-100'}`}>{f.count}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <ViewToggle view={capView} onChange={v => setCapView(v as 'cards' | 'tabla' | 'grafico')} options={['cards', 'tabla', 'grafico']} />
          <input type="text" placeholder="Buscar capacitacion..." value={searchCap} onChange={e => setSearchCap(e.target.value)}
            className="w-48 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs outline-none focus:border-cobalt transition-colors placeholder:text-[#CBD5E1]" />
          {canEdit && (
            <button onClick={() => { setEditing(null); setModal(true) }}
              className="bg-cobalt text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-cobalt-dark btn-scale">
              + Nueva capacitacion
            </button>
          )}
        </div>
      </div>

      {/* Cards view */}
      {capView === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {capFiltradas.map(c => {
            const est = ESTADO_CAP[c.estado]
            const tipoColor = c.tipo === 'seguridad' ? '#DC2626' : c.tipo === 'induccion' ? '#16A34A' : c.tipo === 'tecnica' ? '#0B5ED7' : '#D97706'
            return (
              <div key={c.id} onClick={() => { setEditing(c); setModal(true) }}
                className="bg-white rounded-xl border border-[#E2E8F0] p-4 hover:shadow-md hover:border-[#CBD5E1] transition-all cursor-pointer"
                style={{ borderLeftWidth: 3, borderLeftColor: tipoColor }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs font-bold text-ink leading-tight">{c.nombre}</p>
                  <div className="flex gap-1 shrink-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold"
                      style={{ background: tipoColor + '18', color: tipoColor }}>{TIPO_CAP[c.tipo] || c.tipo}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold"
                      style={{ background: est.color + '18', color: est.color }}>{est.label}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  <span className="text-slate">Persona</span>
                  <span className="font-semibold">{c.persona || c.area || '—'}</span>
                  <span className="text-slate">Horas</span>
                  <span className="font-bold">{c.horas > 0 ? `${c.horas}h` : '—'}</span>
                  <span className="text-slate">Fecha</span>
                  <span className="font-semibold">{c.fecha || '—'}</span>
                  {c.proveedor && <>
                    <span className="text-slate">Proveedor</span>
                    <span className="font-semibold">{c.proveedor}</span>
                  </>}
                </div>
              </div>
            )
          })}
          {capFiltradas.length === 0 && <p className="col-span-full text-center text-slate text-xs py-8">{searchCap ? 'Sin resultados.' : 'Sin capacitaciones en este filtro.'}</p>}
        </div>
      )}

      {/* Tabla view */}
      {capView === 'tabla' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
          <table className="w-full text-xs min-w-[650px]">
            <thead>
              <tr className="bg-[#F1F5F9] text-[10px] font-extrabold uppercase tracking-wider text-slate">
                <th className="text-left p-3">Capacitacion</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Persona / Area</th>
                <th className="text-right p-3">Horas</th>
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-left p-3">Proveedor</th>
              </tr>
            </thead>
            <tbody>
              {capFiltradas.map(c => {
                const est = ESTADO_CAP[c.estado]
                return (
                  <tr key={c.id} onClick={() => { setEditing(c); setModal(true) }}
                    className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                    <td className="p-3 font-bold">{c.nombre}</td>
                    <td className="p-3 text-[11px]">{TIPO_CAP[c.tipo] || c.tipo}</td>
                    <td className="p-3 text-[11px] text-slate">{c.persona || c.area || '—'}</td>
                    <td className="p-3 text-right font-bold">{c.horas > 0 ? c.horas : '—'}</td>
                    <td className="p-3 text-[11px] text-slate">{c.fecha || '—'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold"
                        style={{ background: est.color + '18', color: est.color }}>{est.label}</span>
                    </td>
                    <td className="p-3 text-[11px] text-slate">{c.proveedor || '—'}</td>
                  </tr>
                )
              })}
              {capFiltradas.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate">{searchCap ? 'Sin resultados.' : 'Sin capacitaciones en este filtro.'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Gráfico horas por tipo */}
      {capView === 'grafico' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-3">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate mb-3">Horas de capacitacion por tipo</p>
          {horasPorTipo.length === 0 && <p className="text-xs text-slate text-center py-6">Sin datos para graficar.</p>}
          {horasPorTipo.map((h, i) => {
            const color = h.tipo === 'seguridad' ? '#DC2626' : h.tipo === 'induccion' ? '#16A34A' : h.tipo === 'tecnica' ? '#0B5ED7' : h.tipo === 'liderazgo' ? '#7C3AED' : h.tipo === 'normativa' ? '#D97706' : '#94A3B8'
            return <HBar key={h.tipo} label={h.label} value={h.horas} max={maxHorasTipo} color={color} delay={i * 0.06} formatValue={v => `${v}h`} />
          })}
        </div>
      )}

      <CapacitacionModal open={modal} onClose={() => setModal(false)} editing={editing} projects={projects}
        onSave={async (input, id) => { await onSave({ ...input, id }); setModal(false); toast(id ? 'Actualizada' : 'Capacitacion agregada') }}
        onDelete={async (id) => { await onRemove(id); setModal(false); toast('Eliminada') }} />
    </>
  )
}

// ══════════════════════════════════════
//  MODALS
// ══════════════════════════════════════

function MetricaModal({ open, onClose, editing, onSave, onDelete }: {
  open: boolean; onClose: () => void; editing: MetricaRRHH | null
  onSave: (input: MetricaRRHHInput, id?: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [mes, setMes] = useState('')
  const [dotConst, setDotConst] = useState('')
  const [dotSub, setDotSub] = useState('')
  const [vigentes, setVigentes] = useState('')
  const [asistencia, setAsistencia] = useState('')
  const [tasa, setTasa] = useState('')
  const [licencias, setLicencias] = useState('')
  const [vacaciones, setVacaciones] = useState('')
  const [desvinc, setDesvinc] = useState('')
  const [contrat, setContrat] = useState('')
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)
  const isEdit = !!editing

  const [prevOpen, setPrevOpen] = useState(false)
  const [prevId, setPrevId] = useState<string | null>(null)
  if (open !== prevOpen || (editing?.id ?? null) !== prevId) {
    setPrevOpen(open); setPrevId(editing?.id ?? null)
    if (open && editing) {
      setMes(editing.mes); setDotConst(String(editing.dotacion_constructora))
      setDotSub(String(editing.dotacion_subcontrato)); setVigentes(String(editing.trabajadores_vigentes))
      setAsistencia(String(editing.asistencia_promedio || '')); setTasa(String(editing.tasa_asistencia || ''))
      setLicencias(String(editing.licencias_medicas || '')); setVacaciones(String(editing.vacaciones || ''))
      setDesvinc(String(editing.desvinculaciones || '')); setContrat(String(editing.contrataciones || ''))
      setObs(editing.observacion || '')
    } else if (open) {
      const now = new Date(); setMes(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
      setDotConst(''); setDotSub(''); setVigentes(''); setAsistencia(''); setTasa('')
      setLicencias(''); setVacaciones(''); setDesvinc(''); setContrat(''); setObs('')
    }
  }

  async function handleSave() {
    if (!mes) return; setSaving(true)
    try {
      const dc = Number(dotConst) || 0; const ds = Number(dotSub) || 0
      await onSave({
        mes, dotacion_constructora: dc, dotacion_subcontrato: ds,
        trabajadores_vigentes: Number(vigentes) || (dc + ds),
        asistencia_promedio: Number(asistencia) || 0, tasa_asistencia: Number(tasa) || 0,
        licencias_medicas: Number(licencias) || 0, vacaciones: Number(vacaciones) || 0,
        desvinculaciones: Number(desvinc) || 0, contrataciones: Number(contrat) || 0,
        observacion: obs.trim() || null, fuente: 'manual',
      }, editing?.id)
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar' : 'Registrar'} accent="Mes"
      footer={<>
        {isEdit && <Btn variant="danger" onClick={async () => { if (editing && confirm('Eliminar?')) { setSaving(true); try { await onDelete(editing.id) } finally { setSaving(false) } } }} disabled={saving}>Eliminar</Btn>}
        <div className="flex-1" />
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : isEdit ? 'Guardar' : 'Registrar'}</Btn>
      </>}>
      <Field label="Mes"><Input type="month" value={mes} onChange={e => setMes(e.target.value)} /></Field>
      <Row2>
        <Field label="Dotacion Constructora"><Input type="number" value={dotConst} onChange={e => setDotConst(e.target.value)} placeholder="0" /></Field>
        <Field label="Dotacion Subcontrato"><Input type="number" value={dotSub} onChange={e => setDotSub(e.target.value)} placeholder="0" /></Field>
      </Row2>
      <Row2>
        <Field label="Total vigentes"><Input type="number" value={vigentes} onChange={e => setVigentes(e.target.value)} placeholder="Auto: suma" /></Field>
        <Field label="Tasa asistencia (%)"><Input type="number" value={tasa} onChange={e => setTasa(e.target.value)} placeholder="95" /></Field>
      </Row2>
      <Row2>
        <Field label="Licencias medicas"><Input type="number" value={licencias} onChange={e => setLicencias(e.target.value)} placeholder="0" /></Field>
        <Field label="Vacaciones"><Input type="number" value={vacaciones} onChange={e => setVacaciones(e.target.value)} placeholder="0" /></Field>
      </Row2>
      <Row2>
        <Field label="Contrataciones (+)"><Input type="number" value={contrat} onChange={e => setContrat(e.target.value)} placeholder="0" /></Field>
        <Field label="Desvinculaciones (-)"><Input type="number" value={desvinc} onChange={e => setDesvinc(e.target.value)} placeholder="0" /></Field>
      </Row2>
      <Field label="Observacion"><Input value={obs} onChange={e => setObs(e.target.value)} /></Field>
    </Modal>
  )
}

function AuditoriaModal({ open, onClose, editing, onSave, onDelete }: {
  open: boolean; onClose: () => void; editing: Auditoria | null
  onSave: (input: AuditoriaInput, id?: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<AuditoriaInput['tipo']>('interna')
  const [fecha, setFecha] = useState('')
  const [resultado, setResultado] = useState<AuditoriaInput['resultado']>('pendiente')
  const [puntaje, setPuntaje] = useState('')
  const [hallazgos, setHallazgos] = useState('')
  const [cerrados, setCerrados] = useState('')
  const [auditor, setAuditor] = useState('')
  const [obs, setObs] = useState('')
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const isEdit = !!editing

  const [prevOpen, setPrevOpen] = useState(false)
  const [prevId, setPrevId] = useState<string | null>(null)
  if (open !== prevOpen || (editing?.id ?? null) !== prevId) {
    setPrevOpen(open); setPrevId(editing?.id ?? null)
    if (open && editing) {
      setNombre(editing.nombre); setTipo(editing.tipo); setFecha(editing.fecha || '')
      setResultado(editing.resultado); setPuntaje(editing.puntaje != null ? String(editing.puntaje) : '')
      setHallazgos(String(editing.hallazgos || '')); setCerrados(String(editing.hallazgos_cerrados || ''))
      setAuditor(editing.auditor || ''); setObs(editing.observacion || ''); setUrl(editing.url || '')
    } else if (open) {
      setNombre(''); setTipo('interna'); setFecha(''); setResultado('pendiente')
      setPuntaje(''); setHallazgos(''); setCerrados(''); setAuditor(''); setObs(''); setUrl('')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar' : 'Nueva'} accent="Auditoria"
      footer={<>
        {isEdit && <Btn variant="danger" onClick={async () => { if (editing && confirm('Eliminar?')) { setSaving(true); try { await onDelete(editing.id) } finally { setSaving(false) } } }} disabled={saving}>Eliminar</Btn>}
        <div className="flex-1" />
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={async () => {
          if (!nombre.trim()) return; setSaving(true)
          try { await onSave({ nombre: nombre.trim(), tipo, fecha: fecha || null, resultado, puntaje: puntaje ? Number(puntaje) : null, hallazgos: Number(hallazgos) || 0, hallazgos_cerrados: Number(cerrados) || 0, auditor: auditor.trim() || null, observacion: obs.trim() || null, url: url.trim() || null, fuente: 'manual' }, editing?.id) } finally { setSaving(false) }
        }} disabled={saving}>{saving ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}</Btn>
      </>}>
      <Field label="Nombre"><Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Auditoria SSO Q1 2026" /></Field>
      <Row2>
        <Field label="Tipo">
          <Select value={tipo} onChange={e => setTipo(e.target.value as AuditoriaInput['tipo'])}>
            {Object.entries(TIPO_AUD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Fecha"><Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></Field>
      </Row2>
      <Row2>
        <Field label="Resultado">
          <Select value={resultado} onChange={e => setResultado(e.target.value as AuditoriaInput['resultado'])}>
            {Object.entries(RESULTADO_AUD).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label="Puntaje (%)"><Input type="number" value={puntaje} onChange={e => setPuntaje(e.target.value)} placeholder="0-100" /></Field>
      </Row2>
      <Row2>
        <Field label="Hallazgos totales"><Input type="number" value={hallazgos} onChange={e => setHallazgos(e.target.value)} placeholder="0" /></Field>
        <Field label="Hallazgos cerrados"><Input type="number" value={cerrados} onChange={e => setCerrados(e.target.value)} placeholder="0" /></Field>
      </Row2>
      <Row2>
        <Field label="Auditor"><Input value={auditor} onChange={e => setAuditor(e.target.value)} /></Field>
        <Field label="URL informe"><Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></Field>
      </Row2>
      <Field label="Observacion"><Input value={obs} onChange={e => setObs(e.target.value)} /></Field>
    </Modal>
  )
}

function DocModal({ open, onClose, editing, onSave, onDelete }: {
  open: boolean; onClose: () => void; editing: DocRRHH | null
  onSave: (input: DocRRHHInput, id?: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<DocRRHHInput['tipo']>('procedimiento')
  const [estado, setEstado] = useState<DocRRHHInput['estado']>('vigente')
  const [responsable, setResponsable] = useState('')
  const [fechaEm, setFechaEm] = useState('')
  const [fechaVenc, setFechaVenc] = useState('')
  const [url, setUrl] = useState('')
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)
  const isEdit = !!editing

  const [prevOpen, setPrevOpen] = useState(false)
  const [prevId, setPrevId] = useState<string | null>(null)
  if (open !== prevOpen || (editing?.id ?? null) !== prevId) {
    setPrevOpen(open); setPrevId(editing?.id ?? null)
    if (open && editing) {
      setNombre(editing.nombre); setTipo(editing.tipo); setEstado(editing.estado)
      setResponsable(editing.responsable || ''); setFechaEm(editing.fecha_emision || '')
      setFechaVenc(editing.fecha_vencimiento || ''); setUrl(editing.url || ''); setObs(editing.observacion || '')
    } else if (open) {
      setNombre(''); setTipo('procedimiento'); setEstado('vigente')
      setResponsable(''); setFechaEm(''); setFechaVenc(''); setUrl(''); setObs('')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar' : 'Nuevo'} accent="Documento"
      footer={<>
        {isEdit && <Btn variant="danger" onClick={async () => { if (editing && confirm('Eliminar?')) { setSaving(true); try { await onDelete(editing.id) } finally { setSaving(false) } } }} disabled={saving}>Eliminar</Btn>}
        <div className="flex-1" />
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={async () => {
          if (!nombre.trim()) return; setSaving(true)
          try { await onSave({ nombre: nombre.trim(), tipo, estado, responsable: responsable.trim() || null, fecha_emision: fechaEm || null, fecha_vencimiento: fechaVenc || null, url: url.trim() || null, observacion: obs.trim() || null, fuente: 'manual' }, editing?.id) } finally { setSaving(false) }
        }} disabled={saving}>{saving ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}</Btn>
      </>}>
      <Field label="Nombre"><Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del documento" /></Field>
      <Row2>
        <Field label="Tipo">
          <Select value={tipo} onChange={e => setTipo(e.target.value as DocRRHHInput['tipo'])}>
            {Object.entries(TIPO_DOC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Estado">
          <Select value={estado} onChange={e => setEstado(e.target.value as DocRRHHInput['estado'])}>
            {Object.entries(ESTADO_DOC).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
      </Row2>
      <Row2>
        <Field label="Responsable"><Input value={responsable} onChange={e => setResponsable(e.target.value)} /></Field>
        <Field label="URL / Enlace"><Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></Field>
      </Row2>
      <Row2>
        <Field label="Fecha emision"><Input type="date" value={fechaEm} onChange={e => setFechaEm(e.target.value)} /></Field>
        <Field label="Fecha vencimiento"><Input type="date" value={fechaVenc} onChange={e => setFechaVenc(e.target.value)} /></Field>
      </Row2>
      <Field label="Observacion"><Input value={obs} onChange={e => setObs(e.target.value)} /></Field>
    </Modal>
  )
}

function CapacitacionModal({ open, onClose, editing, projects, onSave, onDelete }: {
  open: boolean; onClose: () => void; editing: Capacitacion | null
  projects: { id: string; nombre: string }[]
  onSave: (input: CapacitacionInput, id?: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<CapacitacionInput['tipo']>('tecnica')
  const [persona, setPersona] = useState('')
  const [area, setArea] = useState('')
  const [obraId, setObraId] = useState('')
  const [horas, setHoras] = useState('')
  const [fecha, setFecha] = useState('')
  const [estado, setEstado] = useState<CapacitacionInput['estado']>('programada')
  const [proveedor, setProveedor] = useState('')
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)
  const isEdit = !!editing

  const [prevOpen, setPrevOpen] = useState(false)
  const [prevId, setPrevId] = useState<string | null>(null)
  if (open !== prevOpen || (editing?.id ?? null) !== prevId) {
    setPrevOpen(open); setPrevId(editing?.id ?? null)
    if (open && editing) {
      setNombre(editing.nombre); setTipo(editing.tipo); setPersona(editing.persona || '')
      setArea(editing.area || ''); setObraId(editing.obra_id || ''); setHoras(String(editing.horas || ''))
      setFecha(editing.fecha || ''); setEstado(editing.estado); setProveedor(editing.proveedor || '')
      setObs(editing.observacion || '')
    } else if (open) {
      setNombre(''); setTipo('tecnica'); setPersona(''); setArea(''); setObraId('')
      setHoras(''); setFecha(''); setEstado('programada'); setProveedor(''); setObs('')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar' : 'Nueva'} accent="Capacitacion"
      footer={<>
        {isEdit && <Btn variant="danger" onClick={async () => { if (editing && confirm('Eliminar?')) { setSaving(true); try { await onDelete(editing.id) } finally { setSaving(false) } } }} disabled={saving}>Eliminar</Btn>}
        <div className="flex-1" />
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={async () => {
          if (!nombre.trim()) return; setSaving(true)
          try { await onSave({ nombre: nombre.trim(), tipo, persona: persona.trim() || null, area: area.trim() || null, obra_id: obraId || null, horas: Number(horas) || 0, fecha: fecha || null, estado, proveedor: proveedor.trim() || null, observacion: obs.trim() || null, fuente: 'manual' }, editing?.id) } finally { setSaving(false) }
        }} disabled={saving}>{saving ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}</Btn>
      </>}>
      <Field label="Nombre / Tema"><Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre de la capacitacion" /></Field>
      <Row2>
        <Field label="Tipo">
          <Select value={tipo} onChange={e => setTipo(e.target.value as CapacitacionInput['tipo'])}>
            {Object.entries(TIPO_CAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Estado">
          <Select value={estado} onChange={e => setEstado(e.target.value as CapacitacionInput['estado'])}>
            {Object.entries(ESTADO_CAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
      </Row2>
      <Row2>
        <Field label="Persona"><Input value={persona} onChange={e => setPersona(e.target.value)} placeholder="Nombre o grupo" /></Field>
        <Field label="Area"><Input value={area} onChange={e => setArea(e.target.value)} /></Field>
      </Row2>
      <Row2>
        <Field label="Horas"><Input type="number" value={horas} onChange={e => setHoras(e.target.value)} placeholder="0" /></Field>
        <Field label="Fecha"><Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></Field>
      </Row2>
      <Row2>
        <Field label="Proveedor"><Input value={proveedor} onChange={e => setProveedor(e.target.value)} /></Field>
        <Field label="Obra">
          <Select value={obraId} onChange={e => setObraId(e.target.value)}>
            <option value="">— General —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
        </Field>
      </Row2>
      <Field label="Observacion"><Input value={obs} onChange={e => setObs(e.target.value)} /></Field>
    </Modal>
  )
}
