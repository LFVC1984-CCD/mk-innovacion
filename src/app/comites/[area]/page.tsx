'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth, useAreaData } from '@/lib/comites/hooks'
import { useAutoKpis } from '@/lib/comites/use-auto-kpis'
import { fmtFecha } from '@/lib/comites/data'
import { toast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { AREAS_LIST, AREA_NAMES, TAREA_TIPO_LABELS, TAREA_TIPO_COLORS } from '@/lib/types'
import type { AreaId, TareaTipo } from '@/lib/types'
import { AREA_PANELS } from '@/components/comites/areas'
import KPIDashboard from '@/components/comites/KPIDashboard'
import TaskStackedBar from '@/components/comites/TaskStackedBar'
import AnimatedBar from '@/components/comites/AnimatedBar'

const TIPO_KEYS: TareaTipo[] = ['seguimiento', 'acuerdo', 'accion_correctiva', 'solicitud']

// ── Tab config per area ──

const MODULE_NAMES: Record<string, string> = {
  obras: 'Control Financiero',
  legal: 'Causas',
  prevencion: 'Seguridad',
  estudios: 'Pipeline',
  finanzas: 'Flujo de Caja',
  eti: 'Tecnología e Innovación',
}

interface MinutaRow {
  id: string
  area_id: string
  fecha: string
  texto_completo: string | null
  enviada: boolean
  created_at: string
}

// ══════════════════════════════════════
//  PAGE
// ══════════════════════════════════════

export default function AreaEditPage({ params }: { params: { area: string } }) {
  const areaId = params.area
  const { perfil, loading: authLoading, canEdit } = useAuth()
  const { kpis, tareas, loading, refresh, supabase } = useAreaData(areaId as AreaId)
  const { kpis: autoKpis, loading: autoLoading } = useAutoKpis(areaId as AreaId)
  const areaInfo = AREAS_LIST.find(a => a.id === areaId)
  const isRRHH = areaId === 'rrhh'
  const hasAutoKpis = !isRRHH && autoKpis.length > 0
  const AreaPanel = AREA_PANELS[areaId as AreaId]

  // ── Tabs ──
  type TabId = 'informe' | 'tareas' | 'modulo' | 'minutas'
  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'informe', label: 'Informe' },
    { id: 'tareas', label: 'Tareas', count: tareas.length },
  ]
  if (AreaPanel) tabs.push({ id: 'modulo', label: MODULE_NAMES[areaId] || 'Módulo' })
  tabs.push({ id: 'minutas', label: 'Minutas' })

  const [activeTab, setActiveTab] = useState<TabId>('informe')

  // KPI form (solo RRHH)
  const [showKpiForm, setShowKpiForm] = useState(false)
  const [kpiName, setKpiName] = useState('')
  const [kpiValor, setKpiValor] = useState('')
  const [kpiMeta, setKpiMeta] = useState('')

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskText, setTaskText] = useState('')
  const [taskResp, setTaskResp] = useState('')
  const [taskFecha, setTaskFecha] = useState('')
  const [taskTipo, setTaskTipo] = useState<TareaTipo>('seguimiento')
  const [taskAreaDestino, setTaskAreaDestino] = useState('')

  // Minutas
  const [minutas, setMinutas] = useState<MinutaRow[]>([])
  const [minutasLoading, setMinutasLoading] = useState(false)
  const [expandedMinuta, setExpandedMinuta] = useState<string | null>(null)
  const minutasSupa = createClient()

  const loadMinutas = useCallback(async () => {
    setMinutasLoading(true)
    const { data } = await minutasSupa.from('minutas').select('id, area_id, fecha, texto_completo, enviada, created_at')
      .eq('area_id', areaId).order('created_at', { ascending: false }).limit(20)
    setMinutas((data || []) as MinutaRow[])
    setMinutasLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId])

  useEffect(() => {
    if (activeTab === 'minutas' && minutas.length === 0) loadMinutas()
  }, [activeTab, minutas.length, loadMinutas])

  if (authLoading || loading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 skeleton rounded" />
      <div className="h-10 skeleton rounded-xl" />
      <div className="h-28 skeleton rounded-xl" />
      <div className="grid grid-cols-2 gap-3.5"><div className="h-48 skeleton rounded-xl" /><div className="h-48 skeleton rounded-xl" /></div>
    </div>
  )
  if (!perfil) return <div className="py-20 text-center text-danger">No se pudo cargar el perfil. Intenta cerrar sesión y volver a entrar.</div>
  if (!canEdit(areaId)) return <div className="py-20 text-center text-danger">Sin acceso para editar esta área ({perfil.area_id})</div>

  // ── CRUD KPI (solo RRHH) ──
  async function addKpi() {
    if (!kpiName.trim()) return
    await supabase.from('kpis').insert({ area_id: areaId, nombre: kpiName, valor: kpiValor || '0', meta: kpiMeta || '—', tipo: 'numero', status: 'verde', orden: kpis.length })
    setKpiName(''); setKpiValor(''); setKpiMeta(''); setShowKpiForm(false)
    toast('KPI agregado'); refresh()
  }
  async function deleteKpi(id: string) { await supabase.from('kpis').delete().eq('id', id); refresh() }
  async function updateKpi(id: string, field: string, value: string) { await supabase.from('kpis').update({ [field]: value }).eq('id', id); refresh() }

  // ── CRUD Tareas ──
  async function addTask() {
    if (!taskText.trim()) return
    await supabase.from('tareas').insert({
      area_id: areaId, texto: taskText, responsable: taskResp || null,
      fecha_compromiso: taskFecha || null, estado: 'pendiente',
      tipo: taskTipo, area_destino: taskAreaDestino || null,
    })
    setTaskText(''); setTaskResp(''); setTaskFecha(''); setTaskTipo('seguimiento'); setTaskAreaDestino(''); setShowTaskForm(false)
    toast('Tarea agregada'); refresh()
  }
  async function updateTaskEstado(id: string, estado: string) { await supabase.from('tareas').update({ estado }).eq('id', id); refresh() }
  async function deleteTask(id: string) { await supabase.from('tareas').delete().eq('id', id); refresh() }

  const statusColors: Record<string, { bg: string; text: string }> = {
    'en-proceso': { bg: '#EFF6FF', text: '#0B5ED7' },
    'completada': { bg: '#DCFCE7', text: '#16A34A' },
    'bloqueada': { bg: '#FEE2E2', text: '#DC2626' },
    'pendiente': { bg: '#F8FAFC', text: '#64748B' },
  }

  // Tareas counts by status
  const taskCounts = {
    bloqueada: tareas.filter(t => t.estado === 'bloqueada').length,
    pendiente: tareas.filter(t => t.estado === 'pendiente').length,
    'en-proceso': tareas.filter(t => t.estado === 'en-proceso').length,
    completada: tareas.filter(t => t.estado === 'completada').length,
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/comites" className="text-[10px] text-slate hover:text-cobalt transition-colors">← Comités</Link>
          <h1 className="font-condensed font-black text-2xl text-ink">{areaInfo?.name || areaId}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/comites/${areaId}/proyectar`} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#E2E8F0] hover:border-cobalt hover:text-cobalt transition-all btn-scale">
            Presentación →
          </Link>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-white text-cobalt shadow-sm border border-cobalt/20'
                  : 'text-slate hover:text-ink hover:bg-white/60 border border-transparent'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-cobalt/10 text-cobalt' : 'bg-slate-100 text-slate'
                }`}>
                  {tab.count}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="area-tab-indicator"
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-cobalt rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        {/* ═══ INFORME ═══ */}
        {activeTab === 'informe' && (
          <motion.div key="informe" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {/* Auto-KPI Dashboard */}
            {hasAutoKpis && !autoLoading && (
              <div className="mb-4">
                <KPIDashboard kpis={autoKpis} areaColor={areaInfo?.color} />
              </div>
            )}

            {/* Manual KPIs (RRHH only) */}
            {isRRHH && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm mb-4">
                <div className="px-3.5 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-0.5 h-4 rounded" style={{ background: areaInfo?.color || '#64748B' }} />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate">Indicadores clave</span>
                  </div>
                  <button onClick={() => setShowKpiForm(!showKpiForm)} className="text-xs text-cobalt font-semibold hover:bg-cobalt-light px-2 py-0.5 rounded">+ Agregar</button>
                </div>
                <div className="p-3.5">
                  {kpis.length === 0 && <p className="text-xs text-slate py-2">Sin indicadores. Agrega uno.</p>}
                  {kpis.map(k => (
                    <div key={k.id} className="border border-[#E2E8F0] rounded-lg p-3 mb-2.5" style={{ borderLeftWidth: 3, borderLeftColor: k.status === 'verde' ? '#16A34A' : k.status === 'amarillo' ? '#D97706' : '#DC2626' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-ink flex-1">{k.nombre}</span>
                        <button onClick={() => deleteKpi(k.id)} className="text-[#CBD5E1] hover:text-danger text-sm">×</button>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate">Valor</span>
                        <input value={k.valor || ''} onChange={e => updateKpi(k.id, 'valor', e.target.value)} className="w-20 text-xs px-2 py-1 border border-[#E2E8F0] rounded text-center outline-none focus:border-cobalt" />
                        <span className="text-[10px] text-slate">Meta</span>
                        <input value={k.meta || ''} onChange={e => updateKpi(k.id, 'meta', e.target.value)} className="w-20 text-xs px-2 py-1 border border-[#E2E8F0] rounded text-center outline-none focus:border-cobalt" />
                        <select value={k.status} onChange={e => updateKpi(k.id, 'status', e.target.value)} className="text-[10px] px-1.5 py-1 border border-[#E2E8F0] rounded font-bold">
                          <option value="verde">OK</option>
                          <option value="amarillo">Alerta</option>
                          <option value="rojo">Crítico</option>
                        </select>
                      </div>
                    </div>
                  ))}
                  {showKpiForm && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                      <input value={kpiName} onChange={e => setKpiName(e.target.value)} placeholder="Nombre del indicador" className="w-full text-xs px-2 py-1.5 border border-[#E2E8F0] rounded mb-1.5 outline-none focus:border-cobalt" />
                      <div className="flex gap-1.5 mb-1.5">
                        <input value={kpiValor} onChange={e => setKpiValor(e.target.value)} placeholder="Valor" className="flex-1 text-xs px-2 py-1.5 border border-[#E2E8F0] rounded outline-none focus:border-cobalt" />
                        <input value={kpiMeta} onChange={e => setKpiMeta(e.target.value)} placeholder="Meta" className="flex-1 text-xs px-2 py-1.5 border border-[#E2E8F0] rounded outline-none focus:border-cobalt" />
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={addKpi} className="px-3 py-1 bg-cobalt text-white text-xs rounded font-semibold">Agregar</button>
                        <button onClick={() => setShowKpiForm(false)} className="px-3 py-1 border border-[#E2E8F0] text-xs rounded font-semibold">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick stats + animated bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
              {[
                { label: 'Bloqueadas', count: taskCounts.bloqueada, color: '#DC2626', bg: '#FEE2E2' },
                { label: 'Pendientes', count: taskCounts.pendiente, color: '#64748B', bg: '#F1F5F9' },
                { label: 'En proceso', count: taskCounts['en-proceso'], color: '#0B5ED7', bg: '#EFF6FF' },
                { label: 'Completadas', count: taskCounts.completada, color: '#16A34A', bg: '#DCFCE7' },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-white rounded-xl border border-[#E2E8F0] p-3 text-center"
                >
                  <p className="font-condensed text-2xl font-black" style={{ color: s.color }}>{s.count}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate">{s.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Stacked task bar */}
            {tareas.length > 0 && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 mb-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-2">Distribución de tareas</p>
                <TaskStackedBar
                  segments={[
                    { label: 'Bloqueadas', value: taskCounts.bloqueada, color: '#DC2626' },
                    { label: 'Pendientes', value: taskCounts.pendiente, color: '#94A3B8' },
                    { label: 'En proceso', value: taskCounts['en-proceso'], color: '#0B5ED7' },
                    { label: 'Completadas', value: taskCounts.completada, color: '#16A34A' },
                  ]}
                  total={tareas.length}
                />
              </div>
            )}

            {/* Progress bar del comité */}
            {tareas.length > 0 && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate">Progreso del comité</p>
                  <p className="font-condensed text-lg font-black text-success">
                    {Math.round((taskCounts.completada / tareas.length) * 100)}%
                  </p>
                </div>
                <AnimatedBar
                  value={taskCounts.completada}
                  max={tareas.length}
                  color="#16A34A"
                  height={12}
                  delay={0.3}
                />
                <p className="text-[10px] text-slate mt-1.5">
                  {taskCounts.completada} de {tareas.length} tareas completadas
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ TAREAS ═══ */}
        {activeTab === 'tareas' && (
          <motion.div key="tareas" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
              <div className="px-3.5 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 rounded bg-cobalt" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate">Tareas ({tareas.length})</span>
                </div>
                <button onClick={() => setShowTaskForm(!showTaskForm)} className="text-xs text-cobalt font-semibold hover:bg-cobalt-light px-2 py-0.5 rounded">+ Agregar</button>
              </div>
              <div className="p-3.5">
                {tareas.length === 0 && <p className="text-xs text-slate py-2">Sin tareas.</p>}
                {tareas.map(t => {
                  const sc = statusColors[t.estado] || statusColors.pendiente
                  const tipoColor = TAREA_TIPO_COLORS[t.tipo || 'seguimiento'] || '#64748B'
                  const tipoLabel = TAREA_TIPO_LABELS[t.tipo || 'seguimiento'] || 'Seguimiento'
                  return (
                    <div key={t.id} className="flex items-start gap-2 py-2.5 border-b border-[#F1F5F9] last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: tipoColor + '15', color: tipoColor }}>{tipoLabel}</span>
                          {t.from_decision && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cobalt-light text-cobalt">Decisión</span>}
                          {t.area_id !== areaId && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0891B2]/10 text-[#0891B2]">← {t.area_id.toUpperCase()}</span>
                          )}
                        </div>
                        <p className="text-xs text-ink leading-snug">{t.texto}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate">
                          <span>{t.responsable || '—'}</span>
                          {t.fecha_compromiso ? (
                            <span className="text-cobalt font-semibold">{fmtFecha(t.fecha_compromiso)}</span>
                          ) : (
                            t.estado !== 'completada' && <span className="text-danger font-semibold">Sin fecha</span>
                          )}
                        </div>
                      </div>
                      <select value={t.estado} onChange={e => updateTaskEstado(t.id, e.target.value)}
                        className="text-[10px] font-bold rounded-full px-2 py-0.5 border-none cursor-pointer" style={{ background: sc.bg, color: sc.text }}>
                        <option value="pendiente">Pendiente</option>
                        <option value="en-proceso">En proceso</option>
                        <option value="completada">Completada</option>
                        <option value="bloqueada">Bloqueada</option>
                      </select>
                      <button onClick={() => deleteTask(t.id)} className="text-[#CBD5E1] hover:text-danger text-sm flex-shrink-0">×</button>
                    </div>
                  )
                })}

                {showTaskForm && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                    <input value={taskText} onChange={e => setTaskText(e.target.value)} placeholder="Descripción de la tarea" className="w-full text-xs px-2 py-1.5 border border-[#E2E8F0] rounded mb-1.5 outline-none focus:border-cobalt" />
                    <div className="flex gap-1.5 mb-1.5">
                      <select value={taskTipo} onChange={e => setTaskTipo(e.target.value as TareaTipo)} className="text-xs px-2 py-1.5 border border-[#E2E8F0] rounded outline-none focus:border-cobalt bg-white">
                        {TIPO_KEYS.map(t => <option key={t} value={t}>{TAREA_TIPO_LABELS[t]}</option>)}
                      </select>
                      <input value={taskResp} onChange={e => setTaskResp(e.target.value)} placeholder="Responsable" className="flex-1 text-xs px-2 py-1.5 border border-[#E2E8F0] rounded outline-none focus:border-cobalt" />
                      <input type="date" value={taskFecha} onChange={e => setTaskFecha(e.target.value)} className="text-xs px-2 py-1.5 border border-[#E2E8F0] rounded outline-none focus:border-cobalt" />
                    </div>
                    <div className="flex gap-1.5 mb-1.5">
                      <select value={taskAreaDestino} onChange={e => setTaskAreaDestino(e.target.value)} className="flex-1 text-xs px-2 py-1.5 border border-[#E2E8F0] rounded outline-none focus:border-cobalt bg-white">
                        <option value="">Solo este comité</option>
                        {AREAS_LIST.filter(a => a.id !== areaId).map(a => <option key={a.id} value={a.id}>→ {a.name}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={addTask} className="px-3 py-1 bg-cobalt text-white text-xs rounded font-semibold btn-scale">Agregar</button>
                      <button onClick={() => setShowTaskForm(false)} className="px-3 py-1 border border-[#E2E8F0] text-xs rounded font-semibold">Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ MÓDULO ESPECIALIZADO ═══ */}
        {activeTab === 'modulo' && AreaPanel && (
          <motion.div key="modulo" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            <AreaPanel />
          </motion.div>
        )}

        {/* ═══ MINUTAS ═══ */}
        {activeTab === 'minutas' && (
          <motion.div key="minutas" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {minutasLoading ? (
              <div className="space-y-2.5">
                <div className="h-16 skeleton rounded-xl" />
                <div className="h-16 skeleton rounded-xl" />
                <div className="h-16 skeleton rounded-xl" />
              </div>
            ) : minutas.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center">
                <p className="text-slate text-sm mb-2">Sin minutas registradas para este comité.</p>
                <p className="text-[10px] text-slate">Las minutas se generan desde la vista de Presentación.</p>
                <Link href={`/comites/${areaId}/proyectar`} className="inline-block mt-3 px-4 py-2 bg-cobalt text-white rounded-lg text-xs font-bold hover:bg-cobalt-dark transition-colors">
                  Ir a Presentación →
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {minutas.map(m => {
                  const isExp = expandedMinuta === m.id
                  const fecha = new Date(m.created_at)
                  return (
                    <div key={m.id} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden hover:shadow-md transition-shadow">
                      <div
                        className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                        onClick={() => setExpandedMinuta(isExp ? null : m.id)}
                      >
                        <div className="w-1 h-8 rounded-full shrink-0" style={{ background: areaInfo?.color || '#64748B' }} />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[13px] font-bold text-ink">
                            Minuta — {fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </h3>
                          <p className="text-[10px] text-slate mt-0.5">
                            {AREA_NAMES[m.area_id] || m.area_id}
                            {m.enviada && <span className="ml-1.5 text-success font-bold">Enviada</span>}
                          </p>
                        </div>
                        <span className="text-slate text-sm">{isExp ? '▾' : '▸'}</span>
                      </div>
                      {isExp && m.texto_completo && (
                        <div className="px-4 pb-4 border-t border-[#E2E8F0]">
                          <div className="bg-[#F8FAFC] rounded-lg p-4 mt-3 text-xs text-ink leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                            {m.texto_completo}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
