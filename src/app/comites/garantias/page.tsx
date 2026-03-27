'use client'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGarantias } from '@/lib/comites/use-garantias'
import type { GarantiaRow, EntidadComputed } from '@/lib/comites/use-garantias'
import { ESTADO_CONFIG, FIN_COLORS, fmtMM, fmtShort, fmtFecha } from '@/lib/comites/data'
import type { GarantiaEstado } from '@/lib/comites/data'
import SummaryCard from '@/components/comites/SummaryCard'
import ViewToggle from '@/components/comites/ViewToggle'
import GarantiaModal from '@/components/comites/GarantiaModal'
import { toast } from '@/components/ui/Toast'
import EntidadModal from '@/components/comites/EntidadModal'

type Tab = 'garantias' | 'entidades' | 'instrumentos'
const TABS: { id: Tab; label: string; action: string }[] = [
  { id: 'garantias', label: 'Garantías', action: '+ Nueva garantía' },
  { id: 'entidades', label: 'Entidades', action: '+ Nueva entidad' },
  { id: 'instrumentos', label: 'Instrumentos', action: '' },
]

type FilterKey = 'todos' | GarantiaEstado
const FILTER_KEYS: FilterKey[] = ['todos', 'solicitada', 'vigente', 'por_vencer', 'en_renovacion', 'vencida', 'devuelta']
type ViewMode = 'cards' | 'tabla'

function SectionLabel({ children }: { children: string }) {
  return <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate mb-2.5">{children}</p>
}

// ── Barra horizontal simple ──
function HBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold w-36 truncate">{label}</span>
      <div className="flex-1 h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-bold min-w-[50px] text-right" style={{ color }}>{fmtShort(value)}</span>
    </div>
  )
}

export default function GarantiasPage() {
  const { loading, garantias, entidades, instrumentos, proyectos, saveGarantia, deleteGarantia, saveEntidad, deleteEntidad } = useGarantias()

  const [tab, setTab] = useState<Tab>('garantias')
  const [filter, setFilter] = useState<FilterKey>('todos')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewMode>('cards')

  // Modal states
  const [garModal, setGarModal] = useState(false)
  const [garEditing, setGarEditing] = useState<(GarantiaRow & { dias: number | null; proyecto: string }) | null>(null)
  const [entModal, setEntModal] = useState(false)
  const [entEditing, setEntEditing] = useState<EntidadComputed | null>(null)

  function openCreate() {
    if (tab === 'garantias') { setGarEditing(null); setGarModal(true) }
    else if (tab === 'entidades') { setEntEditing(null); setEntModal(true) }
  }

  // ── Garantías filtered ──
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

  // ── KPIs garantías ──
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
        <h1 className="font-condensed text-[28px] font-extrabold">
          Maestro de <span className="text-cobalt">Garantías</span>
        </h1>
        <p className="text-xs text-slate">Gestión de garantías, entidades financieras e instrumentos</p>
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
        {TABS.find(t => t.id === tab)?.action && (
          <button onClick={openCreate} className="px-4 py-2 rounded-lg bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-dark transition-colors">
            {TABS.find(t => t.id === tab)?.action}
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">

        {/* ═══ TAB: GARANTÍAS ═══ */}
        {tab === 'garantias' && (
          <motion.div key="garantias" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

            {/* Alert */}
            {porVencer.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 mb-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-danger flex items-center justify-center text-white text-base font-bold shrink-0">!</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-danger">{porVencer.length} garantía{porVencer.length > 1 ? 's' : ''} por vencer en los próximos 30 días</p>
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
            <SectionLabel>Distribución por instrumento</SectionLabel>
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 mb-5 space-y-2.5">
              {instrumentos.map(i => (
                <HBar key={i.nombre} label={i.nombre} value={i.comprometido} max={i.aprobado || i.comprometido} color={FIN_COLORS.comprometido} />
              ))}
              {instrumentos.length === 0 && <p className="text-xs text-slate text-center py-4">Sin instrumentos registrados</p>}
            </div>

            {/* Filters + Toggle */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex gap-1 flex-wrap">
                {FILTER_KEYS.map(k => {
                  const label = k === 'todos' ? 'Todos' : ESTADO_CONFIG[k as GarantiaEstado].label
                  return (
                    <button key={k} onClick={() => setFilter(k)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                        filter === k ? 'bg-cobalt border-cobalt text-white' : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
                      }`}>
                      {label}<span className="text-[9px] font-extrabold opacity-70">{counts[k] || 0}</span>
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2 items-center">
                <input type="text" placeholder="Buscar proyecto, entidad..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-52 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs outline-none focus:border-cobalt transition-colors placeholder:text-[#CBD5E1]" />
                <ViewToggle view={view} onChange={setView} />
              </div>
            </div>

            {/* Cards view */}
            {view === 'cards' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2.5">
                {filtered.map(g => {
                  const est = ESTADO_CONFIG[g.estado] || ESTADO_CONFIG.vigente
                  return (
                    <div key={g.id} onClick={() => { setGarEditing(g); setGarModal(true) }}
                      className="bg-white rounded-xl border border-[#E2E8F0] p-4 hover:shadow-md hover:border-[#CBD5E1] transition-all cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-bold text-ink leading-tight">{g.proyecto}</p>
                        <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0" style={{ background: est.color + '18', color: est.color }}>{est.label}</span>
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
                    </div>
                  )
                })}
                {filtered.length === 0 && <p className="col-span-full text-center text-slate text-sm py-8">Sin garantías en este filtro.</p>}
              </div>
            ) : (
              /* Table view */
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-[#F1F5F9] text-[10px] font-extrabold uppercase tracking-wider text-slate">
                    <th className="text-left p-3">Proyecto</th><th className="text-left p-3">Instrumento</th><th className="text-left p-3">Tipo</th><th className="text-left p-3">Entidad</th>
                    <th className="text-right p-3" style={{ color: FIN_COLORS.aprobado }}>Monto</th><th className="text-left p-3">Vencimiento</th><th className="text-left p-3">Estado</th><th className="text-right p-3">Días</th>
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
                          <td className="p-3"><span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase" style={{ background: est.color + '18', color: est.color }}>{est.label}</span></td>
                          <td className="p-3 text-right">{g.dias !== null ? <span className={`text-[11px] font-bold ${g.dias <= 0 ? 'text-danger' : g.dias <= 30 ? 'text-amber' : 'text-success'}`}>{g.dias <= 0 ? 'Vencida' : `${g.dias}d`}</span> : <span className="text-[11px] font-bold text-cobalt">Pendiente</span>}</td>
                        </tr>
                      )
                    })}
                    {filtered.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-slate">Sin garantías en este filtro.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ TAB: ENTIDADES ═══ */}
        {tab === 'entidades' && (
          <motion.div key="entidades" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

            <SectionLabel>Resumen</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-5">
              <SummaryCard value={`${entidades.length}`} label="Entidades" color="#1E293B" />
              <SummaryCard value={fmtMM(totalLinea)} label="Total líneas" color={FIN_COLORS.aprobado} />
              <SummaryCard value={fmtMM(totalConsumo)} label="Comprometido" color={FIN_COLORS.comprometido} delta={totalLinea > 0 ? `${Math.round(totalConsumo / totalLinea * 100)}% utilizado` : ''} />
              <SummaryCard value={fmtMM(totalSaldoEnt)} label="Disponible" color={FIN_COLORS.disponible} />
              <SummaryCard value={`${totalActivasEnt}`} label="Garantías activas" color="#1E293B" />
            </div>

            <SectionLabel>Utilización por entidad</SectionLabel>
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 mb-5 space-y-2.5">
              {entidades.map(e => (
                <HBar key={e.id} label={e.nombre} value={e.consumo} max={e.linea || e.consumo} color={
                  e.linea > 0 && e.consumo / e.linea > 0.8 ? FIN_COLORS.critico : FIN_COLORS.comprometido
                } />
              ))}
            </div>

            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Detalle de entidades</SectionLabel>
              <ViewToggle view={view} onChange={setView} />
            </div>

            {view === 'cards' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {entidades.map(e => {
                  const pct = e.linea > 0 ? Math.round(e.consumo / e.linea * 100) : 0
                  const saldo = e.linea - e.consumo
                  return (
                    <div key={e.id} onClick={() => { setEntEditing(e); setEntModal(true) }}
                      className="bg-white rounded-xl border border-[#E2E8F0] p-4 hover:shadow-md hover:border-[#CBD5E1] transition-all cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-bold text-ink">{e.nombre}</p>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F1F5F9]">{e.tipo}</span>
                      </div>
                      <p className="text-[11px] text-slate mb-3">{e.instrumentos.join(', ') || 'Sin instrumentos'}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct > 80 ? FIN_COLORS.critico : FIN_COLORS.comprometido }} />
                        </div>
                        <span className="text-[10px] font-bold">{pct}%</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>Línea: <b style={{ color: FIN_COLORS.aprobado }}>{fmtShort(e.linea)}</b></span>
                        <span>Saldo: <b style={{ color: saldo >= 0 ? FIN_COLORS.disponible : FIN_COLORS.critico }}>{fmtShort(saldo)}</b></span>
                      </div>
                      <p className="text-[10px] text-slate mt-1">{e.activas} garantías activas</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-[#F1F5F9] text-[10px] font-extrabold uppercase tracking-wider text-slate">
                    <th className="text-left p-3">Entidad</th><th className="text-left p-3">Tipo</th><th className="text-left p-3">Instrumentos</th>
                    <th className="text-right p-3" style={{ color: FIN_COLORS.aprobado }}>Línea</th><th className="p-3 w-36" style={{ color: FIN_COLORS.comprometido }}>Utilización</th>
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
                          <td className="p-3 text-[11px]">{e.instrumentos.join(', ')}</td>
                          <td className="p-3 text-right font-condensed text-sm font-extrabold" style={{ color: FIN_COLORS.aprobado }}>{fmtMM(e.linea)}</td>
                          <td className="p-3"><div className="flex items-center gap-2"><div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} /></div><span className="text-[10px] font-bold min-w-[28px] text-right" style={{ color: barColor }}>{pct}%</span></div></td>
                          <td className="p-3 text-right font-condensed text-sm font-extrabold" style={{ color: saldo >= 0 ? FIN_COLORS.disponible : FIN_COLORS.critico }}>{fmtMM(saldo)}</td>
                          <td className="p-3 text-right font-bold">{e.activas || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ TAB: INSTRUMENTOS ═══ */}
        {tab === 'instrumentos' && (
          <motion.div key="instrumentos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

            <SectionLabel>Resumen</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-5">
              <SummaryCard value={`${instrumentos.length}`} label="Instrumentos" color="#1E293B" />
              <SummaryCard value={`${totalActivasInstr}`} label="Garantías activas" color="#1E293B" />
              <SummaryCard value={fmtMM(totalAprInstr)} label="Total aprobado" color={FIN_COLORS.aprobado} />
              <SummaryCard value={fmtMM(totalCompInstr)} label="Comprometido" color={FIN_COLORS.comprometido} delta={totalAprInstr > 0 ? `${Math.round(totalCompInstr / totalAprInstr * 100)}% utilizado` : ''} />
              <SummaryCard value={fmtMM(totalAprInstr - totalCompInstr)} label="Disponible" color={FIN_COLORS.disponible} />
            </div>

            <SectionLabel>Distribución por instrumento</SectionLabel>
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 mb-5 space-y-2.5">
              {instrumentos.map(i => (
                <HBar key={i.nombre} label={i.nombre} value={i.comprometido} max={i.aprobado || i.comprometido} color={FIN_COLORS.comprometido} />
              ))}
            </div>

            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Detalle de instrumentos</SectionLabel>
              <ViewToggle view={view} onChange={setView} />
            </div>

            {view === 'cards' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {instrumentos.map(inst => {
                  const disp = inst.aprobado - inst.comprometido
                  return (
                    <div key={inst.nombre} className="bg-white rounded-xl border border-[#E2E8F0] p-4">
                      <p className="text-sm font-bold text-ink mb-1">{inst.nombre}</p>
                      <p className="text-[11px] text-slate mb-3">{inst.activas} activas · {inst.entidades.join(', ')}</p>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between"><span>Aprobado</span><b style={{ color: FIN_COLORS.aprobado }}>{fmtShort(inst.aprobado)}</b></div>
                        <div className="flex justify-between"><span>Comprometido</span><b style={{ color: FIN_COLORS.comprometido }}>{fmtShort(inst.comprometido)}</b></div>
                        <div className="flex justify-between"><span>Disponible</span><b style={{ color: FIN_COLORS.disponible }}>{fmtShort(disp)}</b></div>
                      </div>
                      {inst.tipos.length > 0 && <p className="text-[10px] text-slate mt-2">Tipos: {inst.tipos.join(', ')}</p>}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <table className="w-full text-xs">
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
                        <tr key={inst.nombre} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
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
        onSave={async (input, id) => { await saveGarantia(input, id); setGarModal(false); toast('Garantía guardada') }}
        onDelete={async (id) => { await deleteGarantia(id); setGarModal(false); toast('Garantía eliminada') }}
      />
      <EntidadModal
        open={entModal}
        onClose={() => setEntModal(false)}
        editing={entEditing}
        onSave={async (input, id) => { await saveEntidad(input, id); setEntModal(false); toast('Entidad guardada') }}
        onDelete={async (id) => { await deleteEntidad(id); setEntModal(false); toast('Entidad eliminada') }}
      />
    </>
  )
}
