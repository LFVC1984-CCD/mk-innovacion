'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRRHH } from '@/lib/comites/use-rrhh'
import type { Dotacion, DotacionInput, DocRRHH, DocRRHHInput, Capacitacion, CapacitacionInput } from '@/lib/comites/use-rrhh'
import { useProjects } from '@/lib/comites/use-projects'
import { useAuth } from '@/lib/comites/hooks'
import { fmtMoney } from '@/lib/comites/data'
import Modal, { Field, Input, Select, Row2, Btn } from '@/components/comites/Modal'
import ViewToggle from '@/components/comites/ViewToggle'
import SummaryCard from '@/components/comites/SummaryCard'
import { toast } from '@/components/ui/Toast'

// ── Config ──

const TIPO_DOT: Record<string, { label: string; color: string }> = {
  constructta: { label: 'Constructta', color: '#0B5ED7' },
  subcontrato: { label: 'Subcontrato', color: '#D97706' },
}
const ESTADO_DOT: Record<string, { label: string; color: string }> = {
  activo: { label: 'Activo', color: '#16A34A' },
  inactivo: { label: 'Inactivo', color: '#94A3B8' },
  vacaciones: { label: 'Vacaciones', color: '#0891B2' },
  licencia: { label: 'Licencia', color: '#D97706' },
  desvinculado: { label: 'Desvinculado', color: '#DC2626' },
}
const TIPO_DOC: Record<string, string> = {
  procedimiento: 'Procedimiento', reglamento: 'Reglamento', certificacion: 'Certificacion',
  politica: 'Politica', contrato_marco: 'Contrato marco', otro: 'Otro',
}
const ESTADO_DOC: Record<string, { label: string; color: string }> = {
  vigente: { label: 'Vigente', color: '#16A34A' },
  por_vencer: { label: 'Por vencer', color: '#D97706' },
  vencido: { label: 'Vencido', color: '#DC2626' },
  en_revision: { label: 'En revision', color: '#0B5ED7' },
  borrador: { label: 'Borrador', color: '#94A3B8' },
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

type SubTab = 'dotacion' | 'documentacion' | 'capacitaciones'

export default function RRHHPanel() {
  const { dotacion, docs, capacitaciones, loading, saveDotacion, removeDotacion, saveDoc, removeDoc, saveCapacitacion, removeCapacitacion } = useRRHH()
  const { projects } = useProjects()
  const { canEdit } = useAuth()
  const ce = canEdit('rrhh')
  const [subTab, setSubTab] = useState<SubTab>('dotacion')

  // ── Dotación stats ──
  const dotStats = useMemo(() => {
    const activos = dotacion.filter(d => d.estado === 'activo')
    const constructta = activos.filter(d => d.tipo === 'constructta').length
    const subcontratos = activos.filter(d => d.tipo === 'subcontrato').length
    const costoMensual = activos.reduce((s, d) => s + d.costo_mensual, 0)
    return { total: activos.length, constructta, subcontratos, costoMensual }
  }, [dotacion])

  // ── Docs stats ──
  const docStats = useMemo(() => {
    const vigentes = docs.filter(d => d.estado === 'vigente').length
    const porVencer = docs.filter(d => d.estado === 'por_vencer').length
    const vencidos = docs.filter(d => d.estado === 'vencido').length
    return { total: docs.length, vigentes, porVencer, vencidos }
  }, [docs])

  // ── Capacitaciones stats ──
  const capStats = useMemo(() => {
    const completadas = capacitaciones.filter(c => c.estado === 'completada')
    const programadas = capacitaciones.filter(c => c.estado === 'programada').length
    const horasTotal = completadas.reduce((s, c) => s + c.horas, 0)
    return { total: capacitaciones.length, completadas: completadas.length, programadas, horasTotal }
  }, [capacitaciones])

  if (loading) {
    return <div className="py-8 text-center text-slate-500 text-sm">Cargando...</div>
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 mb-5 border-b border-[#E2E8F0] pb-0">
        {([
          { id: 'dotacion' as const, label: 'Dotacion', count: dotStats.total },
          { id: 'documentacion' as const, label: 'Documentacion', count: docs.length },
          { id: 'capacitaciones' as const, label: 'Capacitaciones', count: capacitaciones.length },
        ]).map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`relative px-4 py-2.5 text-xs font-bold transition-all ${
              subTab === t.id ? 'text-cobalt' : 'text-slate hover:text-ink'
            }`}>
            {t.label}
            <span className={`ml-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
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
            <DotacionTab dotacion={dotacion} stats={dotStats} projects={projects} canEdit={ce}
              onSave={saveDotacion} onRemove={removeDotacion} />
          </motion.div>
        )}
        {subTab === 'documentacion' && (
          <motion.div key="documentacion" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            <DocumentacionTab docs={docs} stats={docStats} canEdit={ce}
              onSave={saveDoc} onRemove={removeDoc} />
          </motion.div>
        )}
        {subTab === 'capacitaciones' && (
          <motion.div key="capacitaciones" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            <CapacitacionesTab capacitaciones={capacitaciones} stats={capStats} projects={projects} canEdit={ce}
              onSave={saveCapacitacion} onRemove={removeCapacitacion} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════
//  DOTACIÓN
// ══════════════════════════════════════

function DotacionTab({ dotacion, stats, projects, canEdit, onSave, onRemove }: {
  dotacion: Dotacion[]; stats: { total: number; constructta: number; subcontratos: number; costoMensual: number }
  projects: { id: string; nombre: string }[]; canEdit: boolean
  onSave: (d: DotacionInput & { id?: string }) => Promise<void>; onRemove: (id: string) => Promise<void>
}) {
  const [view, setView] = useState<'tabla' | 'cards'>('tabla')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Dotacion | null>(null)
  const [filtro, setFiltro] = useState<'activos' | 'todos'>('activos')
  const [searchDot, setSearchDot] = useState('')

  const filtered = useMemo(() => {
    let list = filtro === 'activos' ? dotacion.filter(d => d.estado === 'activo') : dotacion
    if (searchDot) {
      const s = searchDot.toLowerCase()
      list = list.filter(d => d.nombre.toLowerCase().includes(s) || (d.cargo || '').toLowerCase().includes(s) || (d.empresa_sc || '').toLowerCase().includes(s))
    }
    return list
  }, [dotacion, filtro, searchDot])

  return (
    <>
      {/* Consolidado */}
      <div className="bg-[#0F172A] rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Personal Activo</p>
          <p className="font-condensed text-[28px] font-black text-gold leading-tight mt-1">{stats.total}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Constructta</p>
          <p className="font-condensed text-[28px] font-black text-[#0B5ED7] leading-tight mt-1">{stats.constructta}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Subcontratos</p>
          <p className="font-condensed text-[28px] font-black text-[#D97706] leading-tight mt-1">{stats.subcontratos}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Costo Mensual</p>
          <p className="font-condensed text-[28px] font-black text-gold leading-tight mt-1">{fmtMoney(stats.costoMensual)}</p>
          <p className="text-[10px] text-white/30 mt-0.5">CLP</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-1.5">
          {(['activos', 'todos'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                filtro === f ? 'bg-cobalt text-white border-cobalt' : 'bg-white border-[#E2E8F0] text-slate hover:border-cobalt'
              }`}>
              {f === 'activos' ? 'Activos' : 'Todos'}
              <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full ${filtro === f ? 'bg-white/20' : 'bg-slate-100'}`}>
                {f === 'activos' ? dotacion.filter(d => d.estado === 'activo').length : dotacion.length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <input type="text" placeholder="Buscar nombre, cargo..." value={searchDot} onChange={e => setSearchDot(e.target.value)}
            className="w-48 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs outline-none focus:border-cobalt transition-colors placeholder:text-[#CBD5E1]" />
          <ViewToggle view={view} onChange={v => setView(v as typeof view)} options={['tabla', 'cards']} />
          {canEdit && (
            <button onClick={() => { setEditing(null); setModal(true) }}
              className="bg-cobalt text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-cobalt-dark transition-colors">
              + Agregar persona
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      {view === 'tabla' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
          <table className="w-full text-xs min-w-[750px]">
            <thead>
              <tr className="bg-[#F1F5F9] text-[10px] font-extrabold uppercase tracking-wider text-slate">
                <th className="text-left p-3">Nombre</th>
                <th className="text-left p-3">Cargo</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Obra / Area</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-right p-3">Costo</th>
                <th className="text-left p-3">Fuente</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const obra = d.obra_id ? projects.find(p => p.id === d.obra_id)?.nombre : null
                const est = ESTADO_DOT[d.estado]
                const tip = TIPO_DOT[d.tipo]
                return (
                  <tr key={d.id} onClick={() => { setEditing(d); setModal(true) }}
                    className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                    <td className="p-3 font-bold">{d.nombre}</td>
                    <td className="p-3 text-slate">{d.cargo || '—'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold"
                        style={{ background: tip.color + '18', color: tip.color }}>{tip.label}</span>
                    </td>
                    <td className="p-3 text-[11px]">{obra || d.area || '—'}{d.empresa_sc ? ` (${d.empresa_sc})` : ''}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold"
                        style={{ background: est.color + '18', color: est.color }}>{est.label}</span>
                    </td>
                    <td className="p-3 text-right font-condensed font-bold">{d.costo_mensual > 0 ? fmtMoney(d.costo_mensual) : '—'}</td>
                    <td className="p-3 text-[10px] text-slate">{d.fuente === 'manual' ? '—' : d.fuente}</td>
                  </tr>
                )
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate">Sin registros.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards */}
      {view === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filtered.map(d => {
            const est = ESTADO_DOT[d.estado]
            const tip = TIPO_DOT[d.tipo]
            const obra = d.obra_id ? projects.find(p => p.id === d.obra_id)?.nombre : null
            return (
              <div key={d.id} onClick={() => { setEditing(d); setModal(true) }}
                className="bg-white rounded-xl border border-[#E2E8F0] p-4 hover:shadow-md hover:border-[#CBD5E1] transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-sm font-bold text-ink">{d.nombre}</h3>
                  <span className="px-2 py-0.5 rounded text-[9px] font-extrabold shrink-0"
                    style={{ background: tip.color + '18', color: tip.color }}>{tip.label}</span>
                </div>
                <p className="text-[11px] text-slate">{d.cargo || '—'}</p>
                {obra && <p className="text-[11px] text-cobalt">{obra}</p>}
                {d.empresa_sc && <p className="text-[11px] text-amber-600">{d.empresa_sc}</p>}
                <div className="flex items-center justify-between mt-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-extrabold"
                    style={{ background: est.color + '18', color: est.color }}>{est.label}</span>
                  {d.costo_mensual > 0 && <span className="font-condensed font-bold text-xs">{fmtMoney(d.costo_mensual)}</span>}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-full bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate text-sm">Sin registros.</div>
          )}
        </div>
      )}

      {/* Modal */}
      <DotacionModal open={modal} onClose={() => setModal(false)} editing={editing} projects={projects}
        onSave={async (input, id) => { await onSave({ ...input, id }); setModal(false); toast(id ? 'Actualizado' : 'Persona agregada') }}
        onDelete={async (id) => { await onRemove(id); setModal(false); toast('Eliminado') }} />
    </>
  )
}

// ══════════════════════════════════════
//  DOCUMENTACIÓN
// ══════════════════════════════════════

function DocumentacionTab({ docs, stats, canEdit, onSave, onRemove }: {
  docs: DocRRHH[]; stats: { total: number; vigentes: number; porVencer: number; vencidos: number }
  canEdit: boolean
  onSave: (d: DocRRHHInput & { id?: string }) => Promise<void>; onRemove: (id: string) => Promise<void>
}) {
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<DocRRHH | null>(null)
  const [filtroDoc, setFiltroDoc] = useState<string>('todos')
  const [searchDoc, setSearchDoc] = useState('')

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
        <SummaryCard value={`${stats.total}`} label="Total documentos" color="#1E293B" />
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
              <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full ${filtroDoc === f.key ? 'bg-white/20' : 'bg-slate-100'}`}>{f.count}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <input type="text" placeholder="Buscar documento..." value={searchDoc} onChange={e => setSearchDoc(e.target.value)}
            className="w-48 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs outline-none focus:border-cobalt transition-colors placeholder:text-[#CBD5E1]" />
          {canEdit && (
            <button onClick={() => { setEditing(null); setModal(true) }}
              className="bg-cobalt text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-cobalt-dark transition-colors">
              + Nuevo documento
            </button>
          )}
        </div>
      </div>

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
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold"
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

      <DocModal open={modal} onClose={() => setModal(false)} editing={editing}
        onSave={async (input, id) => { await onSave({ ...input, id }); setModal(false); toast(id ? 'Actualizado' : 'Documento agregado') }}
        onDelete={async (id) => { await onRemove(id); setModal(false); toast('Eliminado') }} />
    </>
  )
}

// ══════════════════════════════════════
//  CAPACITACIONES
// ══════════════════════════════════════

function CapacitacionesTab({ capacitaciones, stats, projects, canEdit, onSave, onRemove }: {
  capacitaciones: Capacitacion[]; stats: { total: number; completadas: number; programadas: number; horasTotal: number }
  projects: { id: string; nombre: string }[]; canEdit: boolean
  onSave: (c: CapacitacionInput & { id?: string }) => Promise<void>; onRemove: (id: string) => Promise<void>
}) {
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Capacitacion | null>(null)
  const [filtroCap, setFiltroCap] = useState<string>('todas')
  const [searchCap, setSearchCap] = useState('')

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
        <SummaryCard value={`${stats.total}`} label="Total capacitaciones" color="#1E293B" />
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
              <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full ${filtroCap === f.key ? 'bg-white/20' : 'bg-slate-100'}`}>{f.count}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <input type="text" placeholder="Buscar capacitacion..." value={searchCap} onChange={e => setSearchCap(e.target.value)}
            className="w-48 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs outline-none focus:border-cobalt transition-colors placeholder:text-[#CBD5E1]" />
          {canEdit && (
            <button onClick={() => { setEditing(null); setModal(true) }}
              className="bg-cobalt text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-cobalt-dark transition-colors">
              + Nueva capacitacion
            </button>
          )}
        </div>
      </div>

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
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold"
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

      <CapacitacionModal open={modal} onClose={() => setModal(false)} editing={editing} projects={projects}
        onSave={async (input, id) => { await onSave({ ...input, id }); setModal(false); toast(id ? 'Actualizada' : 'Capacitacion agregada') }}
        onDelete={async (id) => { await onRemove(id); setModal(false); toast('Eliminada') }} />
    </>
  )
}

// ══════════════════════════════════════
//  MODALS
// ══════════════════════════════════════

function DotacionModal({ open, onClose, editing, projects, onSave, onDelete }: {
  open: boolean; onClose: () => void; editing: Dotacion | null
  projects: { id: string; nombre: string }[]
  onSave: (input: DotacionInput, id?: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [nombre, setNombre] = useState('')
  const [rut, setRut] = useState('')
  const [cargo, setCargo] = useState('')
  const [area, setArea] = useState('')
  const [obraId, setObraId] = useState('')
  const [tipo, setTipo] = useState<DotacionInput['tipo']>('constructta')
  const [empresaSc, setEmpresaSc] = useState('')
  const [estado, setEstado] = useState<DotacionInput['estado']>('activo')
  const [fechaIng, setFechaIng] = useState('')
  const [costo, setCosto] = useState('')
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const isEdit = !!editing

  const [prevOpen, setPrevOpen] = useState(false)
  const [prevId, setPrevId] = useState<string | null>(null)
  if (open !== prevOpen || (editing?.id ?? null) !== prevId) {
    setPrevOpen(open); setPrevId(editing?.id ?? null)
    if (open && editing) {
      setNombre(editing.nombre); setRut(editing.rut || ''); setCargo(editing.cargo || '')
      setArea(editing.area || ''); setObraId(editing.obra_id || ''); setTipo(editing.tipo)
      setEmpresaSc(editing.empresa_sc || ''); setEstado(editing.estado)
      setFechaIng(editing.fecha_ingreso || ''); setCosto(String(editing.costo_mensual || ''))
      setObs(editing.observacion || '')
    } else if (open) {
      setNombre(''); setRut(''); setCargo(''); setArea(''); setObraId(''); setTipo('constructta')
      setEmpresaSc(''); setEstado('activo'); setFechaIng(''); setCosto(''); setObs('')
    }
    setErrors([])
  }

  async function handleSave() {
    if (!nombre.trim()) { setErrors(['Nombre es obligatorio']); return }
    setErrors([]); setSaving(true)
    try {
      await onSave({
        nombre: nombre.trim(), rut: rut.trim() || null, cargo: cargo.trim() || null,
        area: area.trim() || null, obra_id: obraId || null, tipo, empresa_sc: empresaSc.trim() || null,
        estado, fecha_ingreso: fechaIng || null, fecha_termino: null,
        costo_mensual: Number(costo) || 0, fuente: 'manual', observacion: obs.trim() || null,
      }, editing?.id)
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar' : 'Nueva'} accent="Persona"
      footer={<>
        {isEdit && <Btn variant="danger" onClick={async () => { if (editing && confirm('Eliminar?')) { setSaving(true); try { await onDelete(editing.id) } finally { setSaving(false) } } }} disabled={saving}>Eliminar</Btn>}
        <div className="flex-1" />
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : isEdit ? 'Guardar' : 'Agregar'}</Btn>
      </>}>
      {errors.length > 0 && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">{errors.map((e, i) => <p key={i} className="text-red-600 text-[13px]">{e}</p>)}</div>}
      <Row2>
        <Field label="Nombre"><Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre completo" /></Field>
        <Field label="RUT"><Input value={rut} onChange={e => setRut(e.target.value)} placeholder="12.345.678-9" /></Field>
      </Row2>
      <Row2>
        <Field label="Cargo"><Input value={cargo} onChange={e => setCargo(e.target.value)} /></Field>
        <Field label="Tipo">
          <Select value={tipo} onChange={e => setTipo(e.target.value as DotacionInput['tipo'])}>
            <option value="constructta">Constructta</option>
            <option value="subcontrato">Subcontrato</option>
          </Select>
        </Field>
      </Row2>
      {tipo === 'subcontrato' && (
        <Field label="Empresa subcontrato"><Input value={empresaSc} onChange={e => setEmpresaSc(e.target.value)} placeholder="Nombre empresa SC" /></Field>
      )}
      <Row2>
        <Field label="Obra">
          <Select value={obraId} onChange={e => setObraId(e.target.value)}>
            <option value="">— Sin obra —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Area"><Input value={area} onChange={e => setArea(e.target.value)} placeholder="Oficina central, Terreno..." /></Field>
      </Row2>
      <Row2>
        <Field label="Estado">
          <Select value={estado} onChange={e => setEstado(e.target.value as DotacionInput['estado'])}>
            {Object.entries(ESTADO_DOT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label="Costo mensual (CLP)"><Input type="number" value={costo} onChange={e => setCosto(e.target.value)} placeholder="0" /></Field>
      </Row2>
      <Row2>
        <Field label="Fecha ingreso"><Input type="date" value={fechaIng} onChange={e => setFechaIng(e.target.value)} /></Field>
        <Field label="Observacion"><Input value={obs} onChange={e => setObs(e.target.value)} /></Field>
      </Row2>
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
