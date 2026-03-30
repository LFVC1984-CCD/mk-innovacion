'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth, useAreaData } from '@/lib/comites/hooks'
import { useAutoKpis } from '@/lib/comites/use-auto-kpis'
import { fmtFecha } from '@/lib/comites/data'
import { toast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { AREAS_LIST, AREA_NAMES, TAREA_TIPO_LABELS, TAREA_TIPO_COLORS } from '@/lib/types'
import type { AreaId, TareaTipo, Tarea } from '@/lib/types'
import { AREA_PANELS, GarantiasPanel, GarantiasViewer } from '@/components/comites/areas'
import ProcedimientosPanel from '@/components/comites/areas/ProcedimientosPanel'
import KPIDashboard from '@/components/comites/KPIDashboard'
import TaskStackedBar from '@/components/comites/TaskStackedBar'
import UserSelect from '@/components/comites/UserSelect'
import Modal, { Field, Input, Select, Row2, Btn } from '@/components/comites/Modal'
import AnimatedBar from '@/components/comites/AnimatedBar'

const TIPO_KEYS: TareaTipo[] = ['seguimiento', 'acuerdo', 'accion_correctiva', 'solicitud']


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

  // ── Tabs — read from URL search params (controlled by layout ribbon) ──
  const searchParams = useSearchParams()
  type TabId = 'informe' | 'tareas' | 'modulo' | 'garantias' | 'procedimientos' | 'minutas'
  const activeTab = (searchParams.get('tab') || 'informe') as TabId
  const isFinanzas = areaId === 'finanzas'
  const isEstudios = areaId === 'estudios'

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

  // Task edit modal
  const [editTask, setEditTask] = useState<Tarea | null>(null)
  const [etText, setEtText] = useState('')
  const [etResp, setEtResp] = useState('')
  const [etFecha, setEtFecha] = useState('')
  const [etTipo, setEtTipo] = useState<TareaTipo>('seguimiento')
  const [etEstado, setEtEstado] = useState('pendiente')

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
  function openEditTask(t: Tarea) {
    setEditTask(t); setEtText(t.texto); setEtResp(t.responsable || ''); setEtFecha(t.fecha_compromiso || ''); setEtTipo((t.tipo as TareaTipo) || 'seguimiento'); setEtEstado(t.estado)
  }
  async function saveEditTask() {
    if (!editTask) return
    await supabase.from('tareas').update({ texto: etText, responsable: etResp || null, fecha_compromiso: etFecha || null, tipo: etTipo, estado: etEstado }).eq('id', editTask.id)
    setEditTask(null); refresh(); toast('Tarea actualizada')
  }
  async function deleteEditTask() {
    if (!editTask || !confirm('Eliminar esta tarea?')) return
    await supabase.from('tareas').delete().eq('id', editTask.id)
    setEditTask(null); refresh(); toast('Tarea eliminada')
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
      {/* ── Tab Content (sub-tab ribbon is in layout) ── */}
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
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate">{tareas.length} tarea{tareas.length !== 1 ? 's' : ''}</span>
              <button onClick={() => setShowTaskForm(!showTaskForm)} className="text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: 'var(--org-primary)' }}>+ Agregar</button>
            </div>
            {/* Add form */}
            {showTaskForm && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 mb-3" style={{ borderLeftWidth: 3, borderLeftColor: 'var(--org-primary)' }}>
                <input value={taskText} onChange={e => setTaskText(e.target.value)} placeholder="Descripcion de la tarea" className="inp w-full mb-2" />
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  <select value={taskTipo} onChange={e => setTaskTipo(e.target.value as TareaTipo)} className="inp" style={{ width: 'auto' }}>
                    {TIPO_KEYS.map(t => <option key={t} value={t}>{TAREA_TIPO_LABELS[t]}</option>)}
                  </select>
                  <UserSelect value={taskResp} onChange={setTaskResp} placeholder="Responsable" className="flex-1 min-w-[140px]" />
                  <input type="date" value={taskFecha} onChange={e => setTaskFecha(e.target.value)} className="inp" style={{ width: 'auto' }} />
                  <select value={taskAreaDestino} onChange={e => setTaskAreaDestino(e.target.value)} className="inp" style={{ width: 'auto' }}>
                    <option value="">Este comite</option>
                    {AREAS_LIST.filter(a => a.id !== areaId).map(a => <option key={a.id} value={a.id}>→ {a.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={addTask} className="px-4 py-1.5 text-white text-xs rounded-lg font-bold btn-scale" style={{ background: 'var(--org-primary)' }}>Agregar</button>
                  <button onClick={() => setShowTaskForm(false)} className="px-3 py-1.5 border border-[#E2E8F0] text-xs rounded-lg font-semibold">Cancelar</button>
                </div>
              </div>
            )}

            {/* Kanban 3 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { key: 'pendiente', label: 'Pendientes', color: '#64748B', bg: '#F8FAFC', items: tareas.filter(t => t.estado === 'pendiente' || t.estado === 'bloqueada') },
                { key: 'en-proceso', label: 'En proceso', color: '#0B5ED7', bg: '#EFF6FF', items: tareas.filter(t => t.estado === 'en-proceso') },
                { key: 'completada', label: 'Completadas', color: '#16A34A', bg: '#F0FDF4', items: tareas.filter(t => t.estado === 'completada') },
              ]).map(col => (
                <div key={col.key} className="rounded-xl border border-[#E2E8F0] overflow-hidden" style={{ background: col.bg }}>
                  <div className="px-3 py-2 border-b border-[#E2E8F0] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: col.color }}>{col.label}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto" style={{ background: col.color + '18', color: col.color }}>{col.items.length}</span>
                  </div>
                  <div className="p-2 space-y-1.5 min-h-[80px]">
                    {col.items.map(t => {
                      const tipoColor = TAREA_TIPO_COLORS[t.tipo || 'seguimiento'] || '#64748B'
                      return (
                        <div key={t.id} onClick={() => openEditTask(t)} className="bg-white rounded-lg border border-[#E2E8F0] p-2.5 hover:shadow-md hover:border-cobalt/30 transition-all cursor-pointer group">
                          <div className="flex gap-1 mb-1 flex-wrap">
                            <span className="text-[8px] px-1 py-0.5 rounded font-bold uppercase" style={{ background: tipoColor + '15', color: tipoColor }}>{TAREA_TIPO_LABELS[t.tipo || 'seguimiento']}</span>
                            {t.estado === 'bloqueada' && <span className="text-[8px] px-1 py-0.5 rounded font-bold uppercase bg-red-100 text-red-600">Bloq.</span>}
                            {t.area_destino && t.area_destino !== areaId && (
                              <span className="text-[8px] px-1 py-0.5 rounded font-bold uppercase bg-purple-50 text-purple-600">→ {AREA_NAMES[t.area_destino] || t.area_destino}</span>
                            )}
                          </div>
                          <p className="text-[11px] font-medium text-ink leading-snug mb-1.5">{t.texto}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate">
                              {t.responsable && <span>{t.responsable}</span>}
                              {t.fecha_compromiso && <span className="font-mono">{fmtFecha(t.fecha_compromiso)}</span>}
                            </div>
                            <span className="text-[9px] text-[#CBD5E1] group-hover:text-slate transition-colors">editar →</span>
                          </div>
                        </div>
                      )
                    })}
                    {col.items.length === 0 && <p className="text-[10px] text-center text-slate py-4 italic">Sin tareas</p>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ MÓDULO ESPECIALIZADO ═══ */}
        {activeTab === 'modulo' && AreaPanel && (
          <motion.div key="modulo" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            <AreaPanel />
          </motion.div>
        )}

        {/* ═══ GARANTÍAS ═══ */}
        {activeTab === 'garantias' && isFinanzas && (
          <motion.div key="garantias" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            <GarantiasPanel />
          </motion.div>
        )}
        {activeTab === 'garantias' && isEstudios && (
          <motion.div key="garantias-viewer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            <GarantiasViewer />
          </motion.div>
        )}

        {/* ═══ PROCEDIMIENTOS ═══ */}
        {activeTab === 'procedimientos' && (
          <motion.div key="procedimientos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            <ProcedimientosPanel areaId={areaId} />
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

      {/* ═══ MODAL EDICIÓN TAREA ═══ */}
      <Modal open={!!editTask} onClose={() => setEditTask(null)} title="Editar tarea">
        <Field label="Descripcion">
          <Input value={etText} onChange={e => setEtText(e.target.value)} placeholder="Descripcion de la tarea" />
        </Field>
        <Row2>
          <Field label="Tipo">
            <Select value={etTipo} onChange={e => setEtTipo(e.target.value as TareaTipo)}>
              {TIPO_KEYS.map(t => <option key={t} value={t}>{TAREA_TIPO_LABELS[t]}</option>)}
            </Select>
          </Field>
          <Field label="Responsable">
            <UserSelect value={etResp} onChange={setEtResp} placeholder="Responsable" />
          </Field>
        </Row2>
        <Field label="Fecha compromiso">
          <Input type="date" value={etFecha} onChange={e => setEtFecha(e.target.value)} />
        </Field>
        <Field label="Estado">
          <div className="flex gap-1.5">
            {[
              { id: 'pendiente', label: 'Pendiente', color: '#64748B', bg: '#F8FAFC' },
              { id: 'en-proceso', label: 'En proceso', color: '#0B5ED7', bg: '#EFF6FF' },
              { id: 'completada', label: 'Completada', color: '#16A34A', bg: '#F0FDF4' },
              { id: 'bloqueada', label: 'Bloqueada', color: '#DC2626', bg: '#FEF2F2' },
            ].map(s => (
              <button key={s.id} type="button" onClick={() => setEtEstado(s.id)}
                className="flex-1 py-2 rounded-lg text-[11px] font-bold border-2 transition-all"
                style={{
                  borderColor: etEstado === s.id ? s.color : '#E2E8F0',
                  background: etEstado === s.id ? s.bg : 'white',
                  color: etEstado === s.id ? s.color : '#9CA3AF',
                }}>
                {s.label}
              </button>
            ))}
          </div>
        </Field>
        <div className="flex gap-2 mt-2">
          <Btn variant="danger" onClick={deleteEditTask}>Eliminar</Btn>
          <div className="flex-1" />
          <Btn onClick={() => setEditTask(null)}>Cancelar</Btn>
          <Btn variant="primary" onClick={saveEditTask}>Guardar</Btn>
        </div>
      </Modal>
    </>
  )
}
