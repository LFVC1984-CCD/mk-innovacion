'use client'
import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGarantias } from '@/lib/comites/use-garantias'
import type { GarantiaRow, EntidadComputed, LineaCreditoRow } from '@/lib/comites/use-garantias'
import { ESTADO_CONFIG, FIN_COLORS, fmtMM, fmtShort, fmtFecha } from '@/lib/comites/data'
import type { GarantiaEstado } from '@/lib/comites/data'
import SummaryCard from '@/components/comites/SummaryCard'
import ViewToggle from '@/components/comites/ViewToggle'
import GarantiaModal from '@/components/comites/GarantiaModal'
import { toast } from '@/components/ui/Toast'
import EntidadModal from '@/components/comites/EntidadModal'
import Modal, { Field, Input, Select, Row2, Btn } from '@/components/comites/Modal'

type Tab = 'garantias' | 'entidades' | 'instrumentos'
const TABS: { id: Tab; label: string }[] = [
  { id: 'garantias', label: 'Garantias' },
  { id: 'entidades', label: 'Entidades' },
  { id: 'instrumentos', label: 'Instrumentos' },
]

type FilterKey = 'todos' | GarantiaEstado
const FILTER_KEYS: FilterKey[] = ['todos', 'solicitada', 'vigente', 'por_vencer', 'en_renovacion', 'vencida', 'devuelta']

function SectionLabel({ children }: { children: string }) {
  return <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate mb-2.5">{children}</p>
}

function HBar({ label, value, max, color, delay = 0 }: { label: string; value: number; max: number; color: string; delay?: number }) {
  const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold w-36 truncate">{label}</span>
      <div className="flex-1 h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: color }}
        />
      </div>
      <span className="text-[11px] font-bold min-w-[50px] text-right" style={{ color }}>{fmtShort(value)}</span>
    </div>
  )
}

export default function GarantiasPanel() {
  const { loading, garantias, entidades, instrumentos, lineas, proyectos, saveGarantia, deleteGarantia, saveEntidad, deleteEntidad, saveLinea, deleteLinea, uploadFile } = useGarantias()

  const [tab, setTab] = useState<Tab>('garantias')
  const [filter, setFilter] = useState<FilterKey>('todos')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'cards' | 'tabla' | 'grafico'>('cards')

  // Modal states
  const [garModal, setGarModal] = useState(false)
  const [garEditing, setGarEditing] = useState<(GarantiaRow & { dias: number | null; proyecto: string }) | null>(null)
  const [entModal, setEntModal] = useState(false)
  const [entEditing, setEntEditing] = useState<EntidadComputed | null>(null)
  const [lineaModal, setLineaModal] = useState(false)
  const [lineaEditing, setLineaEditing] = useState<LineaCreditoRow | null>(null)

  function openCreate() {
    if (tab === 'garantias') { setGarEditing(null); setGarModal(true) }
    else if (tab === 'entidades') { setEntEditing(null); setEntModal(true) }
    else if (tab === 'instrumentos') { setLineaEditing(null); setLineaModal(true) }
  }

  // ── Garantias filtered ──
  const filtered = garantias
    .filter(g => filter === 'todos' || g.estado === filter)
    .filter(g => {
      if (!search) return true
      const s = search.toLowerCase()
      return g.proyecto.toLowerCase().includes(s) || g.entidad.toLowerCase().includes(s) || g.instrumento_label.toLowerCase().includes(s)
    })

  const counts: Record<string, number> = { todos: garantias.length }
  FILTER_KEYS.slice(1).forEach(k => { counts[k] = garantias.filter(g => g.estado === k).length })

  const porVencer = garantias.filter(g => g.dias !== null && g.dias > 0 && g.dias <= 30)

  // ── Montos por proyecto (para grafico) ──
  const porProyecto = (() => {
    const map = new Map<string, { nombre: string; monto: number; count: number }>()
    garantias.filter(g => g.estado !== 'devuelta').forEach(g => {
      const key = g.proyecto || '(sin proyecto)'
      const entry = map.get(key) || { nombre: key, monto: 0, count: 0 }
      entry.monto += g.monto
      entry.count++
      map.set(key, entry)
    })
    return Array.from(map.values()).sort((a, b) => b.monto - a.monto)
  })()

  // ── KPIs garantias ──
  const totalAprobado = entidades.reduce((s, e) => s + e.linea, 0)
  const totalComprometido = garantias.filter(g => g.estado !== 'devuelta').reduce((s, g) => s + g.monto, 0)
  const totalDisponible = totalAprobado - totalComprometido
  const totalPorVencer = porVencer.reduce((s, g) => s + g.monto, 0)
  const totalVencido = garantias.filter(g => g.estado === 'vencida').reduce((s, g) => s + g.monto, 0)

  // ── KPIs entidades ──
  const totalLinea = entidades.reduce((s, e) => s + e.linea, 0)
  const totalConsumo = entidades.reduce((s, e) => s + e.consumo, 0)
  const totalSaldoEnt = totalLinea - totalConsumo
  const totalActivasEnt = entidades.reduce((s, e) => s + e.activas, 0)

  // ── KPIs instrumentos ──
  const totalActivasInstr = instrumentos.reduce((s, i) => s + i.activas, 0)
  const totalAprInstr = instrumentos.reduce((s, i) => s + i.aprobado, 0)
  const totalCompInstr = instrumentos.reduce((s, i) => s + i.comprometido, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-cobalt border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="mb-4">
        <h2 className="font-condensed text-xl font-extrabold">
          <span className="text-cobalt">Garantias</span>
        </h2>
        <p className="text-xs text-slate">Gestion de garantias, entidades financieras e instrumentos</p>
      </div>

      {/* Tabs + Action */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-0.5 bg-[#F1F5F9] rounded-xl p-1 border border-[#E2E8F0]">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setView('cards') }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === t.id ? 'bg-white text-ink shadow-sm' : 'text-slate hover:text-ink'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={openCreate} className="bg-cobalt text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-cobalt-dark btn-scale">
          {tab === 'garantias' ? '+ Nueva garantia' : tab === 'entidades' ? '+ Nueva entidad' : '+ Nueva linea'}
        </button>
      </div>

      <AnimatePresence mode="wait">

        {/* === TAB: GARANTIAS === */}
        {tab === 'garantias' && (
          <motion.div key="garantias" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

            {/* Alert */}
            {porVencer.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 mb-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-danger flex items-center justify-center text-white text-base font-bold shrink-0">!</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-danger">{porVencer.length} garantia{porVencer.length > 1 ? 's' : ''} por vencer en los proximos 30 dias</p>
                  <p className="text-[11px] text-red-800 truncate">{porVencer.map(g => `${g.proyecto} (${fmtShort(g.monto)}MM · ${g.entidad})`).join(' · ')}</p>
                </div>
              </div>
            )}

            {/* KPI Summary */}
            <SectionLabel>Resumen</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-5">
              <SummaryCard value={fmtMM(totalAprobado)} label="Total aprobado" color={FIN_COLORS.aprobado} />
              <SummaryCard value={fmtMM(totalComprometido)} label="Comprometido" color={FIN_COLORS.comprometido} delta={totalAprobado > 0 ? `${Math.round(totalComprometido / totalAprobado * 100)}% utilizado` : ''} />
              <SummaryCard value={fmtMM(totalDisponible)} label="Disponible" color={FIN_COLORS.disponible} />
              <SummaryCard value={fmtMM(totalPorVencer)} label="Por vencer (30d)" color={FIN_COLORS.comprometido} />
              <SummaryCard value={fmtMM(totalVencido)} label="Vencido" color={FIN_COLORS.vencido} />
            </div>

            {/* Barras por instrumento */}
            <SectionLabel>Distribucion por instrumento</SectionLabel>
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 mb-5 space-y-2.5">
              {instrumentos.map((inst, i) => (
                <HBar key={inst.nombre} label={inst.nombre} value={inst.comprometido} max={inst.aprobado || inst.comprometido} color={FIN_COLORS.comprometido} delay={i * 0.08} />
              ))}
              {instrumentos.length === 0 && <p className="text-sm text-slate text-center py-8">Sin instrumentos registrados</p>}
            </div>

            {/* Insight narrativo garantias */}
            {garantias.length > 0 && (() => {
              const pctUtil = totalAprobado > 0 ? Math.round(totalComprometido / totalAprobado * 100) : 0
              const entCriticas = entidades.filter(e => e.linea > 0 && e.consumo / e.linea > 0.8)
              const mejorTasa = entidades.filter(e => e.tasa_interes > 0).sort((a, b) => a.tasa_interes - b.tasa_interes)[0]
              return (
                <div className="mt-0 mb-5 p-3 rounded-lg bg-cobalt-light border border-cobalt/10">
                  <p className="text-[11px] text-cobalt-dark leading-relaxed">
                    <span className="font-bold">Utilizacion de lineas: {pctUtil}%</span>
                    {' — '}{fmtMM(totalComprometido)} comprometido de {fmtMM(totalAprobado)} aprobado.
                    {entCriticas.length > 0 && <><br /><span className="text-red-600 font-bold">{entCriticas.length} entidad{entCriticas.length > 1 ? 'es' : ''} sobre 80% de utilizacion:</span> {entCriticas.map(e => e.nombre).join(', ')}.</>}
                    {porVencer.length > 0 && <><br /><span className="font-bold">{porVencer.length} garantia{porVencer.length > 1 ? 's' : ''} vence{porVencer.length === 1 ? '' : 'n'} en 30 dias</span> por {fmtMM(totalPorVencer)} — gestionar renovacion.</>}
                    {mejorTasa && <><br />Mejor tasa disponible: <b>{mejorTasa.nombre}</b> ({mejorTasa.tasa_interes}% anual).</>}
                  </p>
                </div>
              )
            })()}

            {/* Filters + Toggle */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex gap-1 flex-wrap">
                {FILTER_KEYS.map(k => {
                  const isAll = k === 'todos'
                  const estadoCfg = !isAll ? ESTADO_CONFIG[k as GarantiaEstado] : null
                  const label = isAll ? 'Todos' : estadoCfg!.label
                  const activeColor = isAll ? '#0B5ED7' : estadoCfg!.color
                  const isActive = filter === k
                  return (
                    <button key={k} onClick={() => setFilter(k)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                        isActive ? 'text-white' : 'bg-white hover:border-[#CBD5E1]'
                      }`}
                      style={isActive
                        ? { background: activeColor, borderColor: activeColor }
                        : { borderColor: '#E2E8F0' }
                      }>
                      {!isAll && <span className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? '#fff' : activeColor }} />}
                      {label}<span className="text-[10px] font-extrabold opacity-70">{counts[k] || 0}</span>
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2 items-center">
                <input type="text" placeholder="Buscar proyecto, entidad..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-52 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs outline-none focus:border-cobalt transition-colors placeholder:text-[#CBD5E1]" />
                <ViewToggle view={view} onChange={v => setView(v as typeof view)} options={['cards', 'tabla', 'grafico']} />
              </div>
            </div>

            {/* Chart view */}
            {view === 'grafico' && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-2.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate mb-2.5">Comprometido por proyecto</p>
                {porProyecto.length > 0 ? porProyecto.slice(0, 12).map((p, i) => (
                  <HBar key={p.nombre} label={`${p.nombre} (${p.count})`} value={p.monto}
                    max={porProyecto[0]?.monto || 1}
                    color={FIN_COLORS.aprobado} delay={i * 0.06} />
                )) : (
                  <p className="text-sm text-slate text-center py-8">Sin datos para graficar</p>
                )}
              </div>
            )}

            {/* Cards view */}
            {view === 'cards' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2.5">
                {filtered.map(g => {
                  const est = ESTADO_CONFIG[g.estado] || ESTADO_CONFIG.vigente
                  return (
                    <div key={g.id} onClick={() => { setGarEditing(g); setGarModal(true) }}
                      className="bg-white rounded-xl border border-[#E2E8F0] p-4 hover:shadow-md hover:border-[#CBD5E1] transition-all cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-bold text-ink leading-tight">{g.proyecto}</p>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0" style={{ background: est.color + '18', color: est.color }}>{est.label}</span>
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
                      {(g.documento_url || g.comprobante_url) && (
                        <div className="flex gap-2 mt-1.5">
                          {g.documento_url && <a href={g.documento_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold hover:underline inline-flex items-center gap-1" style={{ color: 'var(--org-primary)' }} onClick={e => e.stopPropagation()}><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>Documento</a>}
                          {g.comprobante_url && <a href={g.comprobante_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold text-green-600 hover:underline inline-flex items-center gap-1" onClick={e => e.stopPropagation()}><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="15" y2="16" /></svg>Comprobante</a>}
                        </div>
                      )}
                    </div>
                  )
                })}
                {filtered.length === 0 && (
                  <div className="col-span-full bg-white rounded-xl border border-[#E2E8F0] p-12 text-center">
                    <p className="text-sm text-slate">Sin garantias en este filtro.</p>
                  </div>
                )}
              </div>
            )}

            {/* Table view */}
            {view === 'tabla' && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
                <table className="w-full text-xs min-w-[700px]">
                  <thead><tr className="bg-[#F1F5F9] text-[10px] font-extrabold uppercase tracking-wider text-slate">
                    <th className="text-left p-3">Proyecto</th><th className="text-left p-3">Instrumento</th><th className="text-left p-3">Tipo</th><th className="text-left p-3">Entidad</th>
                    <th className="text-right p-3" style={{ color: FIN_COLORS.aprobado }}>Monto</th><th className="text-left p-3">Vencimiento</th><th className="text-left p-3">Estado</th><th className="text-right p-3">Dias</th>
                  </tr></thead>
                  <tbody>
                    {filtered.map(g => {
                      const est = ESTADO_CONFIG[g.estado] || ESTADO_CONFIG.vigente
                      return (
                        <tr key={g.id} onClick={() => { setGarEditing(g); setGarModal(true) }} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                          <td className="p-3 font-bold">{g.proyecto}</td>
                          <td className="p-3 text-[11px]">{g.instrumento_label}</td>
                          <td className="p-3 text-[11px]">{g.tipo_label}</td>
                          <td className="p-3 font-semibold">{g.entidad}</td>
                          <td className="p-3 text-right font-condensed text-sm font-extrabold" style={{ color: FIN_COLORS.aprobado }}>{fmtMM(g.monto)}</td>
                          <td className="p-3 text-[11px] text-slate">{g.fecha_vencimiento ? fmtFecha(g.fecha_vencimiento) : '—'}</td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase" style={{ background: est.color + '18', color: est.color }}>{est.label}</span></td>
                          <td className="p-3 text-right">{g.dias !== null ? <span className={`text-[11px] font-bold ${g.dias <= 0 ? 'text-danger' : g.dias <= 30 ? 'text-amber' : 'text-success'}`}>{g.dias <= 0 ? 'Vencida' : `${g.dias}d`}</span> : <span className="text-[11px] font-bold text-cobalt">Pendiente</span>}</td>
                        </tr>
                      )
                    })}
                    {filtered.length === 0 && <tr><td colSpan={8} className="p-12 text-center text-sm text-slate">Sin garantias en este filtro.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* === TAB: ENTIDADES === */}
        {tab === 'entidades' && (
          <motion.div key="entidades" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

            <SectionLabel>Resumen</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-5">
              <SummaryCard value={`${entidades.length}`} label="Entidades" color="#1E293B" />
              <SummaryCard value={fmtMM(totalLinea)} label="Total lineas" color={FIN_COLORS.aprobado} />
              <SummaryCard value={fmtMM(totalConsumo)} label="Comprometido" color={FIN_COLORS.comprometido} delta={totalLinea > 0 ? `${Math.round(totalConsumo / totalLinea * 100)}% utilizado` : ''} />
              <SummaryCard value={fmtMM(totalSaldoEnt)} label="Disponible" color={FIN_COLORS.disponible} />
              <SummaryCard value={`${totalActivasEnt}`} label="Garantias activas" color="#1E293B" />
            </div>

            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Detalle por entidad</SectionLabel>
              <ViewToggle view={view} onChange={v => setView(v as typeof view)} options={['cards', 'tabla', 'grafico']} />
            </div>

            {/* Grafico: utilizacion por entidad */}
            {view === 'grafico' && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-2.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate mb-2.5">Utilizacion por entidad</p>
                {entidades.map((e, i) => (
                  <HBar key={e.id} label={e.nombre} value={e.consumo} max={e.linea || e.consumo} color={
                    e.linea > 0 && e.consumo / e.linea > 0.8 ? FIN_COLORS.critico : FIN_COLORS.comprometido
                  } delay={i * 0.08} />
                ))}
                {entidades.length === 0 && <p className="text-sm text-slate text-center py-8">Sin datos para graficar</p>}
                {/* Insight narrativo */}
                {entidades.length > 0 && (() => {
                  const criticas = entidades.filter(e => e.linea > 0 && e.consumo / e.linea > 0.8)
                  const tasaMin = entidades.filter(e => e.tasa_interes > 0).sort((a, b) => a.tasa_interes - b.tasa_interes)[0]
                  const pctGlobal = totalLinea > 0 ? Math.round(totalConsumo / totalLinea * 100) : 0
                  return (
                    <div className="mt-3 p-3 rounded-lg bg-cobalt-light border border-cobalt/10">
                      <p className="text-[11px] text-cobalt-dark leading-relaxed">
                        <span className="font-bold">Utilizacion global: {pctGlobal}%</span>
                        {' — '}{fmtMM(totalConsumo)} comprometido de {fmtMM(totalLinea)} disponible.
                        {criticas.length > 0 && <><br /><span className="text-red-600 font-bold">{criticas.length} entidad{criticas.length > 1 ? 'es' : ''} sobre 80%:</span> {criticas.map(e => e.nombre).join(', ')}. Considerar ampliar linea o redistribuir.</>}
                        {tasaMin && <><br />Mejor tasa: <b>{tasaMin.nombre}</b> ({tasaMin.tasa_interes}% anual).</>}
                      </p>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Tabla: entidades */}
            {view === 'tabla' && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
                <table className="w-full text-xs min-w-[700px]">
                  <thead><tr className="bg-[#F1F5F9] text-[10px] font-extrabold uppercase tracking-wider text-slate">
                    <th className="text-left p-3">Entidad</th><th className="text-left p-3">Tipo</th><th className="text-right p-3">Tasa</th><th className="text-left p-3">Instrumentos</th>
                    <th className="text-right p-3" style={{ color: FIN_COLORS.aprobado }}>Linea</th><th className="p-3 w-36" style={{ color: FIN_COLORS.comprometido }}>Utilizacion</th>
                    <th className="text-right p-3" style={{ color: FIN_COLORS.disponible }}>Saldo</th><th className="text-right p-3">Activas</th>
                  </tr></thead>
                  <tbody>
                    {entidades.map(e => {
                      const pct = e.linea > 0 ? Math.round(e.consumo / e.linea * 100) : 0
                      const saldo = e.linea - e.consumo
                      const barColor = pct > 80 ? FIN_COLORS.critico : pct > 50 ? FIN_COLORS.comprometido : '#94A3B8'
                      return (
                        <tr key={e.id} onClick={() => { setEntEditing(e); setEntModal(true) }} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                          <td className="p-3 font-bold">{e.nombre}</td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F1F5F9]">{e.tipo}</span></td>
                          <td className="p-3 text-right font-condensed font-bold text-sm">{e.tasa_interes > 0 ? `${e.tasa_interes}%` : '—'}</td>
                          <td className="p-3 text-[11px]">{e.instrumentos.join(', ')}</td>
                          <td className="p-3 text-right font-condensed text-sm font-extrabold" style={{ color: FIN_COLORS.aprobado }}>{fmtMM(e.linea)}</td>
                          <td className="p-3"><div className="flex items-center gap-2"><div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden"><motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} style={{ background: barColor }} /></div><span className="text-[10px] font-bold min-w-[28px] text-right" style={{ color: barColor }}>{pct}%</span></div></td>
                          <td className="p-3 text-right font-condensed text-sm font-extrabold" style={{ color: saldo >= 0 ? FIN_COLORS.disponible : FIN_COLORS.critico }}>{fmtMM(saldo)}</td>
                          <td className="p-3 text-right font-bold">{e.activas || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Cards: entidades con lineas inline */}
            {view === 'cards' && (
              <div className="space-y-2.5">
                {entidades.map(e => {
                  const entLineas = lineas.filter(l => l.entidad === e.nombre)
                  const entGarantias = garantias.filter(g => g.entidad === e.nombre && g.estado !== 'devuelta')
                  const pct = e.linea > 0 ? Math.round(e.consumo / e.linea * 100) : 0
                  const saldo = e.linea - e.consumo

                  return (
                    <div key={e.id} onClick={() => { setEntEditing(e); setEntModal(true) }}
                      className="bg-white rounded-xl border border-[#E2E8F0] p-4 hover:shadow-md hover:border-[#CBD5E1] transition-all cursor-pointer">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-bold text-ink">{e.nombre}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#F1F5F9] text-slate font-semibold">{e.tipo === 'banco' ? 'Banco' : 'Aseguradora'}</span>
                          {e.tasa_interes > 0 && <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold">{e.tasa_interes}% anual</span>}
                          {e.contacto && <span className="text-[10px] text-slate">{e.contacto}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold" style={{ color: FIN_COLORS.aprobado }}>{fmtMM(e.linea)}</span>
                          <span className="text-xs font-bold" style={{ color: pct > 80 ? FIN_COLORS.critico : FIN_COLORS.comprometido }}>{pct}%</span>
                          <span className="text-xs font-bold" style={{ color: saldo >= 0 ? FIN_COLORS.disponible : FIN_COLORS.critico }}>{fmtMM(saldo)}</span>
                        </div>
                      </div>

                      {entLineas.length > 0 ? (
                        <>
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate mb-2.5">Lineas</p>
                          <div className="space-y-1.5">
                            {entLineas.map(l => {
                              const instrLabel = l.instrumento.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                              const consumo = entGarantias.filter(g => g.instrumento === l.instrumento).reduce((s, g) => s + g.monto, 0)
                              const lmonto = l.monto
                              const disp = lmonto - consumo
                              const lpct = lmonto > 0 ? Math.round(consumo / lmonto * 100) : 0
                              const barColor = lpct > 80 ? FIN_COLORS.critico : FIN_COLORS.comprometido
                              return (
                                <div key={l.id} className="flex items-center gap-2 text-xs">
                                  <span className="min-w-[130px] font-semibold text-ink truncate">{instrLabel}</span>
                                  <span className="min-w-[60px] text-right font-bold" style={{ color: FIN_COLORS.aprobado }}>{fmtShort(l.monto)}</span>
                                  <div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                                    <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${lpct}%` }} transition={{ duration: 0.6 }} style={{ background: barColor }} />
                                  </div>
                                  <span className="min-w-[28px] text-right text-[10px] font-bold" style={{ color: barColor }}>{lpct}%</span>
                                  <span className="min-w-[60px] text-right font-bold" style={{ color: disp >= 0 ? FIN_COLORS.disponible : FIN_COLORS.critico }}>{fmtShort(disp)}</span>
                                </div>
                              )
                            })}
                          </div>
                        </>
                      ) : (
                        <p className="text-[11px] text-slate italic">Sin lineas asignadas</p>
                      )}

                      {entGarantias.length > 0 && (
                        <p className="text-[10px] text-slate mt-2">
                          {entGarantias.length} garantia{entGarantias.length > 1 ? 's' : ''} activa{entGarantias.length > 1 ? 's' : ''} · <b style={{ color: FIN_COLORS.comprometido }}>{fmtMM(e.consumo)} comprometido</b>
                        </p>
                      )}
                    </div>
                  )
                })}
                {entidades.length === 0 && (
                  <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate text-sm">
                    Sin entidades. Agrega una con el boton + Nueva entidad.
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* === TAB: INSTRUMENTOS === */}
        {tab === 'instrumentos' && (
          <motion.div key="instrumentos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

            <SectionLabel>Resumen</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-5">
              <SummaryCard value={`${instrumentos.length}`} label="Instrumentos" color="#1E293B" />
              <SummaryCard value={`${totalActivasInstr}`} label="Garantias activas" color="#1E293B" />
              <SummaryCard value={fmtMM(totalAprInstr)} label="Total aprobado" color={FIN_COLORS.aprobado} />
              <SummaryCard value={fmtMM(totalCompInstr)} label="Comprometido" color={FIN_COLORS.comprometido} delta={totalAprInstr > 0 ? `${Math.round(totalCompInstr / totalAprInstr * 100)}% utilizado` : ''} />
              <SummaryCard value={fmtMM(totalAprInstr - totalCompInstr)} label="Disponible" color={FIN_COLORS.disponible} />
            </div>

            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Detalle de instrumentos</SectionLabel>
              <ViewToggle view={view} onChange={v => setView(v as typeof view)} options={['cards', 'tabla', 'grafico']} />
            </div>

            {/* Grafico: distribucion por instrumento */}
            {view === 'grafico' && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-2.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate mb-2.5">Comprometido por instrumento</p>
                {instrumentos.map((inst, i) => (
                  <HBar key={inst.nombre} label={inst.nombre} value={inst.comprometido} max={inst.aprobado || inst.comprometido} color={FIN_COLORS.comprometido} delay={i * 0.08} />
                ))}
                {instrumentos.length === 0 && <p className="text-sm text-slate text-center py-8">Sin datos para graficar</p>}
              </div>
            )}

            {/* Cards: instrumentos */}
            {view === 'cards' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {instrumentos.map(inst => {
                  const disp = inst.aprobado - inst.comprometido
                  const pctUso = inst.aprobado > 0 ? Math.round(inst.comprometido / inst.aprobado * 100) : 0
                  return (
                    <div key={inst.nombre} className="bg-white rounded-xl border border-[#E2E8F0] p-4 hover:shadow-md hover:border-[#CBD5E1] transition-all cursor-pointer"
                      onClick={() => { setLineaEditing(null); setLineaModal(true) }}>
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-bold text-ink">{inst.nombre}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-slate">{inst.activas} activas</span>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex-1 h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pctUso}%` }}
                            transition={{ duration: 0.7 }} style={{ background: pctUso > 80 ? FIN_COLORS.critico : FIN_COLORS.comprometido }} />
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: pctUso > 80 ? FIN_COLORS.critico : FIN_COLORS.comprometido }}>{pctUso}%</span>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between"><span className="text-slate">Aprobado</span><b style={{ color: FIN_COLORS.aprobado }}>{fmtShort(inst.aprobado)}</b></div>
                        <div className="flex justify-between"><span className="text-slate">Comprometido</span><b style={{ color: FIN_COLORS.comprometido }}>{fmtShort(inst.comprometido)}</b></div>
                        <div className="flex justify-between"><span className="text-slate">Disponible</span><b style={{ color: disp >= 0 ? FIN_COLORS.disponible : FIN_COLORS.critico }}>{fmtShort(disp)}</b></div>
                      </div>
                      <p className="text-[10px] text-slate mt-2">{inst.entidades.join(', ')}</p>
                      {inst.tipos.length > 0 && <p className="text-[10px] text-slate">Tipos: {inst.tipos.join(', ')}</p>}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Tabla: instrumentos */}
            {view === 'tabla' && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
                <table className="w-full text-xs min-w-[700px]">
                  <thead><tr className="bg-[#F1F5F9] text-[10px] font-extrabold uppercase tracking-wider text-slate">
                    <th className="text-left p-3">Instrumento</th><th className="text-right p-3">Activas</th>
                    <th className="text-right p-3" style={{ color: FIN_COLORS.aprobado }}>Aprobado</th>
                    <th className="text-right p-3" style={{ color: FIN_COLORS.comprometido }}>Comprometido</th>
                    <th className="text-right p-3" style={{ color: FIN_COLORS.disponible }}>Disponible</th>
                    <th className="text-left p-3">Entidades</th><th className="text-left p-3">Tipos</th>
                  </tr></thead>
                  <tbody>
                    {instrumentos.map(inst => {
                      const disp = inst.aprobado - inst.comprometido
                      return (
                        <tr key={inst.nombre} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                          onClick={() => { setLineaEditing(null); setLineaModal(true) }}>
                          <td className="p-3 font-bold">{inst.nombre}</td><td className="p-3 text-right font-bold">{inst.activas}</td>
                          <td className="p-3 text-right font-condensed text-sm font-extrabold" style={{ color: FIN_COLORS.aprobado }}>{fmtMM(inst.aprobado)}</td>
                          <td className="p-3 text-right font-condensed text-sm font-extrabold" style={{ color: FIN_COLORS.comprometido }}>{fmtMM(inst.comprometido)}</td>
                          <td className="p-3 text-right font-condensed text-sm font-extrabold" style={{ color: FIN_COLORS.disponible }}>{fmtMM(disp)}</td>
                          <td className="p-3 text-[11px]">{inst.entidades.join(', ')}</td><td className="p-3 text-[11px]">{inst.tipos.join(', ')}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <GarantiaModal
        open={garModal}
        onClose={() => setGarModal(false)}
        editing={garEditing}
        proyectos={proyectos}
        entidades={entidades}
        onSave={async (input, id) => { await saveGarantia(input, id); setGarModal(false); toast('Garantia guardada') }}
        onDelete={async (id) => { await deleteGarantia(id); setGarModal(false); toast('Garantia eliminada') }}
        onUpload={uploadFile}
      />
      <EntidadModal
        open={entModal}
        onClose={() => setEntModal(false)}
        editing={entEditing}
        onSave={async (input, id) => { await saveEntidad(input, id); setEntModal(false); toast('Entidad guardada') }}
        onDelete={async (id) => { await deleteEntidad(id); setEntModal(false); toast('Entidad eliminada') }}
      />
      <LineaCreditoModal
        open={lineaModal}
        onClose={() => setLineaModal(false)}
        editing={lineaEditing}
        entidades={entidades}
        onSave={async (linea, id) => { await saveLinea(linea, id); setLineaModal(false); toast('Linea guardada') }}
        onDelete={async (id) => { await deleteLinea(id); setLineaModal(false); toast('Linea eliminada') }}
      />
    </>
  )
}

// ── Modal de Linea de Credito ──

const INSTR_OPTS = [
  { value: 'boleta_garantia', label: 'Boleta de garantia' },
  { value: 'poliza_garantia', label: 'Poliza' },
  { value: 'credito_comercial', label: 'Credito comercial' },
  { value: 'factoring', label: 'Factoring' },
  { value: 'capital_trabajo', label: 'Capital de trabajo' },
]

function LineaCreditoModal({ open, onClose, editing, entidades, onSave, onDelete }: {
  open: boolean
  onClose: () => void
  editing: LineaCreditoRow | null
  entidades: EntidadComputed[]
  onSave: (linea: Omit<LineaCreditoRow, 'id' | 'created_at'>, id?: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [entidad, setEntidad] = useState('')
  const [tipo, setTipo] = useState('banco')
  const [instrumento, setInstrumento] = useState('')
  const [monto, setMonto] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const isEdit = !!editing

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (editing) {
      setEntidad(editing.entidad)
      setTipo(editing.tipo_entidad || 'banco')
      setInstrumento(editing.instrumento)
      setMonto(String(editing.monto))
    } else {
      setEntidad(''); setTipo('banco'); setInstrumento(''); setMonto('')
    }
    setErrors([])
  }, [editing, open])

  async function handleSave() {
    const errs: string[] = []
    if (!entidad) errs.push('Selecciona una entidad')
    if (!instrumento) errs.push('Selecciona un instrumento')
    if (!monto || Number(monto) <= 0) errs.push('Ingresa un monto valido')
    if (errs.length > 0) { setErrors(errs); return }
    setErrors([])
    setSaving(true)
    try {
      await onSave({
        entidad,
        tipo: instrumento,
        instrumento,
        tipo_entidad: tipo,
        monto: Number(monto) || 0,
      }, editing?.id)
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!editing || !confirm('Eliminar esta linea de credito?')) return
    setSaving(true)
    try { await onDelete(editing.id) } finally { setSaving(false) }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar' : 'Nueva'}
      accent="Linea de Credito"
      footer={
        <>
          {isEdit && <Btn variant="danger" onClick={handleDelete} disabled={saving}>Eliminar</Btn>}
          <div className="flex-1" />
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear linea'}</Btn>
        </>
      }
    >
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
          {errors.map((e, i) => <p key={i} className="text-red-600 text-xs">{e}</p>)}
        </div>
      )}
      <Field label="Entidad">
        <Select value={entidad} onChange={e => setEntidad(e.target.value)}>
          <option value="">— Seleccionar entidad —</option>
          {entidades.map(e => <option key={e.id} value={e.nombre}>{e.nombre} ({e.tipo})</option>)}
        </Select>
      </Field>
      <Row2>
        <Field label="Instrumento">
          <Select value={instrumento} onChange={e => setInstrumento(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {INSTR_OPTS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </Select>
        </Field>
        <Field label="Monto ($MM)">
          <Input type="number" placeholder="0" value={monto} onChange={e => setMonto(e.target.value)} />
        </Field>
      </Row2>
    </Modal>
  )
}
