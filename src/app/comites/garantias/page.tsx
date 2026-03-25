'use client'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GARANTIAS, ENTIDADES, INSTRUMENTOS, INSTR_BARS, ESTADO_CONFIG, FIN_COLORS, fmtMM, fmtShort } from '@/lib/comites/data'
import type { GarantiaEstado, Garantia, Entidad, Instrumento } from '@/lib/comites/data'
import SummaryCard from '@/components/comites/SummaryCard'
import InstrumentBars from '@/components/comites/InstrumentBars'
import EntidadBars from '@/components/comites/EntidadBars'
import Timeline from '@/components/comites/Timeline'
import GarantiaCard from '@/components/comites/GarantiaCard'
import EntidadCard from '@/components/comites/EntidadCard'
import InstrumentoCard from '@/components/comites/InstrumentoCard'
import ViewToggle from '@/components/comites/ViewToggle'
import GarantiaModal from '@/components/comites/GarantiaModal'
import EntidadModal from '@/components/comites/EntidadModal'
import InstrumentoModal from '@/components/comites/InstrumentoModal'

type Tab = 'garantias' | 'entidades' | 'instrumentos'
const TABS: { id: Tab; label: string; action: string }[] = [
  { id: 'garantias', label: 'Garantías', action: '+ Nueva garantía' },
  { id: 'entidades', label: 'Entidades', action: '+ Nueva entidad' },
  { id: 'instrumentos', label: 'Instrumentos', action: '+ Nuevo instrumento' },
]

type FilterKey = 'todos' | GarantiaEstado
const FILTER_KEYS: FilterKey[] = ['todos', 'solicitada', 'vigente', 'por_vencer', 'en_renovacion', 'vencida', 'devuelta']
type ViewMode = 'cards' | 'tabla'

// ── Section label ──
function SectionLabel({ children }: { children: string }) {
  return <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate mb-2.5">{children}</p>
}

export default function GarantiasPage() {
  const [tab, setTab] = useState<Tab>('garantias')
  const [filter, setFilter] = useState<FilterKey>('todos')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewMode>('cards')

  // Modal states
  const [garModal, setGarModal] = useState(false)
  const [garEditing, setGarEditing] = useState<Garantia | null>(null)
  const [entModal, setEntModal] = useState(false)
  const [entEditing, setEntEditing] = useState<Entidad | null>(null)
  const [instrModal, setInstrModal] = useState(false)
  const [instrEditing, setInstrEditing] = useState<Instrumento | null>(null)

  function openCreate() {
    if (tab === 'garantias') { setGarEditing(null); setGarModal(true) }
    else if (tab === 'entidades') { setEntEditing(null); setEntModal(true) }
    else { setInstrEditing(null); setInstrModal(true) }
  }

  const filtered = GARANTIAS
    .filter(g => filter === 'todos' || g.estado === filter)
    .filter(g => {
      if (!search) return true
      const s = search.toLowerCase()
      return g.proyecto.toLowerCase().includes(s) || g.entidad.toLowerCase().includes(s) || g.instrumento.toLowerCase().includes(s)
    })

  const counts: Record<string, number> = { todos: GARANTIAS.length }
  FILTER_KEYS.slice(1).forEach(k => { counts[k] = GARANTIAS.filter(g => g.estado === k).length })

  const porVencer = GARANTIAS.filter(g => g.dias !== null && g.dias > 0 && g.dias <= 30)

  // Entidades KPIs
  const totalLinea = ENTIDADES.reduce((s, e) => s + e.linea, 0)
  const totalConsumo = ENTIDADES.reduce((s, e) => s + e.consumo, 0)
  const totalSaldoEnt = totalLinea - totalConsumo
  const totalActivasEnt = ENTIDADES.reduce((s, e) => s + e.activas, 0)

  // Instrumentos KPIs
  const totalActivasInstr = INSTRUMENTOS.reduce((s, i) => s + i.activas, 0)
  const totalAprInstr = INSTR_BARS.reduce((s, b) => s + b.aprobado, 0)
  const totalCompInstr = INSTR_BARS.reduce((s, b) => s + b.comprometido, 0)

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
        <button onClick={openCreate} className="px-4 py-2 rounded-lg bg-cobalt text-white text-xs font-semibold hover:bg-cobalt-dark transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt">
          {TABS.find(t => t.id === tab)?.action}
        </button>
      </div>

      <AnimatePresence mode="wait">

        {/* ════════════════════════════════════
            TAB: GARANTÍAS
            ════════════════════════════════════ */}
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

            {/* 1. KPI Summary */}
            <SectionLabel>Resumen</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-5">
              <SummaryCard value={fmtMM(1250)} label="Total aprobado" color={FIN_COLORS.aprobado} />
              <SummaryCard value={fmtMM(892)} label="Comprometido" color={FIN_COLORS.comprometido} delta="71% utilizado" />
              <SummaryCard value={fmtMM(358)} label="Disponible" color={FIN_COLORS.disponible} />
              <SummaryCard value={fmtMM(250)} label="Por vencer (30d)" color={FIN_COLORS.comprometido} />
              <SummaryCard value={fmtMM(45)} label="Vencido" color={FIN_COLORS.vencido} />
            </div>

            {/* 2. Gráficos + Vencimientos */}
            <SectionLabel>Distribución y vencimientos</SectionLabel>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mb-5">
              <InstrumentBars />
              <Timeline />
            </div>

            {/* 3. Detalle: Filters + Toggle + Cards/Tabla */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex gap-1 flex-wrap">
                {FILTER_KEYS.map(k => {
                  const label = k === 'todos' ? 'Todos' : ESTADO_CONFIG[k as GarantiaEstado].label
                  return (
                    <button key={k} onClick={() => setFilter(k)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt ${
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

            {view === 'cards' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2.5">
                {filtered.map((g, i) => (
                  <div key={g.id} onClick={() => { setGarEditing(g); setGarModal(true) }}>
                    <GarantiaCard g={g} index={i} />
                  </div>
                ))}
                {filtered.length === 0 && <p className="col-span-full text-center text-slate text-sm py-8">Sin garantías en este filtro.</p>}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-[#F1F5F9] text-[10px] font-extrabold uppercase tracking-wider text-slate">
                    <th className="text-left p-3">Proyecto</th><th className="text-left p-3">Instrumento</th><th className="text-left p-3">Tipo</th><th className="text-left p-3">Entidad</th>
                    <th className="text-right p-3" style={{ color: FIN_COLORS.aprobado }}>Monto</th><th className="text-left p-3">Vencimiento</th><th className="text-left p-3">Estado</th><th className="text-right p-3">Días</th>
                  </tr></thead>
                  <tbody>
                    {filtered.map(g => {
                      const est = ESTADO_CONFIG[g.estado]
                      return (
                        <tr key={g.id} onClick={() => { setGarEditing(g); setGarModal(true) }} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                          <td className="p-3 font-bold">{g.proyecto}</td><td className="p-3 text-[11px]">{g.instrumento}</td><td className="p-3 text-[11px]">{g.tipo}</td><td className="p-3 font-semibold">{g.entidad}</td>
                          <td className="p-3 text-right font-condensed text-sm font-extrabold" style={{ color: FIN_COLORS.aprobado }}>{fmtMM(g.monto)}</td>
                          <td className="p-3 text-[11px] text-slate">{g.fechaVencimiento || '—'}</td>
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

        {/* ════════════════════════════════════
            TAB: ENTIDADES (misma estructura)
            ════════════════════════════════════ */}
        {tab === 'entidades' && (
          <motion.div key="entidades" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

            {/* 1. KPI Summary */}
            <SectionLabel>Resumen</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-5">
              <SummaryCard value={`${ENTIDADES.length}`} label="Entidades" color="#1E293B" />
              <SummaryCard value={fmtMM(totalLinea)} label="Total líneas" color={FIN_COLORS.aprobado} />
              <SummaryCard value={fmtMM(totalConsumo)} label="Comprometido" color={FIN_COLORS.comprometido} delta={`${Math.round(totalConsumo / totalLinea * 100)}% utilizado`} />
              <SummaryCard value={fmtMM(totalSaldoEnt)} label="Disponible" color={FIN_COLORS.disponible} />
              <SummaryCard value={`${totalActivasEnt}`} label="Garantías activas" color="#1E293B" />
            </div>

            {/* 2. Gráficos + Vencimientos */}
            <SectionLabel>Utilización y vencimientos</SectionLabel>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mb-5">
              <EntidadBars />
              <Timeline />
            </div>

            {/* 3. Detalle: Toggle + Cards/Tabla */}
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Detalle de entidades</SectionLabel>
              <ViewToggle view={view} onChange={setView} />
            </div>

            {view === 'cards' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {ENTIDADES.map((e, i) => (
                  <EntidadCard key={e.nombre} e={e} index={i} onClick={() => { setEntEditing(e); setEntModal(true) }} />
                ))}
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
                    {ENTIDADES.map(e => {
                      const pct = e.linea > 0 ? Math.round(e.consumo / e.linea * 100) : 0
                      const saldo = e.linea - e.consumo
                      const barColor = pct > 80 ? FIN_COLORS.critico : pct > 50 ? FIN_COLORS.comprometido : '#94A3B8'
                      return (
                        <tr key={e.nombre} onClick={() => { setEntEditing(e); setEntModal(true) }} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors cursor-pointer">
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

        {/* ════════════════════════════════════
            TAB: INSTRUMENTOS (misma estructura)
            ════════════════════════════════════ */}
        {tab === 'instrumentos' && (
          <motion.div key="instrumentos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

            {/* 1. KPI Summary */}
            <SectionLabel>Resumen</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-5">
              <SummaryCard value={`${INSTRUMENTOS.length}`} label="Instrumentos" color="#1E293B" />
              <SummaryCard value={`${totalActivasInstr}`} label="Garantías activas" color="#1E293B" />
              <SummaryCard value={fmtMM(totalAprInstr)} label="Total aprobado" color={FIN_COLORS.aprobado} />
              <SummaryCard value={fmtMM(totalCompInstr)} label="Comprometido" color={FIN_COLORS.comprometido} delta={`${Math.round(totalCompInstr / totalAprInstr * 100)}% utilizado`} />
              <SummaryCard value={fmtMM(totalAprInstr - totalCompInstr)} label="Disponible" color={FIN_COLORS.disponible} />
            </div>

            {/* 2. Gráficos + Vencimientos */}
            <SectionLabel>Distribución y vencimientos</SectionLabel>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mb-5">
              <InstrumentBars />
              <Timeline />
            </div>

            {/* 3. Detalle: Toggle + Cards/Tabla */}
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Detalle de instrumentos</SectionLabel>
              <ViewToggle view={view} onChange={setView} />
            </div>

            {view === 'cards' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {INSTRUMENTOS.map((inst, i) => (
                  <InstrumentoCard key={inst.nombre} inst={inst} index={i} onClick={() => { setInstrEditing(inst); setInstrModal(true) }} />
                ))}
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
                    {INSTRUMENTOS.map(inst => {
                      const bar = INSTR_BARS.find(b => b.name === inst.nombre)
                      const apr = bar?.aprobado ?? 0; const comp = bar?.comprometido ?? 0; const disp = apr - comp
                      return (
                        <tr key={inst.nombre} onClick={() => { setInstrEditing(inst); setInstrModal(true) }} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                          <td className="p-3 font-bold">{inst.nombre}</td><td className="p-3 text-right font-bold">{inst.activas}</td>
                          <td className="p-3 text-right font-condensed text-sm font-extrabold" style={{ color: FIN_COLORS.aprobado }}>{fmtMM(apr)}</td>
                          <td className="p-3 text-right font-condensed text-sm font-extrabold" style={{ color: FIN_COLORS.comprometido }}>{fmtMM(comp)}</td>
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
      <GarantiaModal open={garModal} onClose={() => setGarModal(false)} editing={garEditing} />
      <EntidadModal open={entModal} onClose={() => setEntModal(false)} editing={entEditing} />
      <InstrumentoModal open={instrModal} onClose={() => setInstrModal(false)} editing={instrEditing} />
    </>
  )
}
