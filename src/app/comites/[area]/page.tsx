'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth, useAreaData } from '@/lib/comites/hooks'
import { useAutoKpis } from '@/lib/comites/use-auto-kpis'
import { fmtFecha } from '@/lib/comites/data'
import { toast } from '@/components/ui/Toast'
import { AREAS_LIST, TAREA_TIPO_LABELS, TAREA_TIPO_COLORS } from '@/lib/types'
import type { AreaId, TareaTipo } from '@/lib/types'
import { AREA_PANELS } from '@/components/comites/areas'
import KPIDashboard from '@/components/comites/KPIDashboard'

const TIPO_KEYS: TareaTipo[] = ['seguimiento', 'acuerdo', 'accion_correctiva', 'solicitud']

export default function AreaEditPage({ params }: { params: { area: string } }) {
  const areaId = params.area
  const { perfil, loading: authLoading, canEdit } = useAuth()
  const { kpis, tareas, loading, refresh, supabase } = useAreaData(areaId as AreaId)
  const { kpis: autoKpis, loading: autoLoading } = useAutoKpis(areaId as AreaId)
  const areaInfo = AREAS_LIST.find(a => a.id === areaId)
  const isRRHH = areaId === 'rrhh'
  const hasAutoKpis = !isRRHH && autoKpis.length > 0

  // KPI form (solo RRHH)
  const [showKpiForm, setShowKpiForm] = useState(false)
  const [kpiName, setKpiName] = useState('')
  const [kpiValor, setKpiValor] = useState('')
  const [kpiMeta, setKpiMeta] = useState('')
  const kpiTipo = 'numero'
  const kpiStatus = 'verde'

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskText, setTaskText] = useState('')
  const [taskResp, setTaskResp] = useState('')
  const [taskFecha, setTaskFecha] = useState('')
  const [taskTipo, setTaskTipo] = useState<TareaTipo>('seguimiento')
  const [taskAreaDestino, setTaskAreaDestino] = useState('')

  const AreaPanel = AREA_PANELS[areaId as AreaId]

  if (authLoading || loading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 skeleton rounded" />
      <div className="h-28 skeleton rounded-xl" />
      <div className="grid grid-cols-2 gap-3.5"><div className="h-48 skeleton rounded-xl" /><div className="h-48 skeleton rounded-xl" /></div>
    </div>
  )
  if (!perfil) return <div className="py-20 text-center text-danger">No se pudo cargar el perfil. Intenta cerrar sesión y volver a entrar.</div>
  if (!canEdit(areaId)) return <div className="py-20 text-center text-danger">Sin acceso para editar esta área ({perfil.area_id})</div>

  // ── CRUD KPI (solo RRHH) ──
  async function addKpi() {
    if (!kpiName.trim()) return
    await supabase.from('kpis').insert({ area_id: areaId, nombre: kpiName, valor: kpiValor || '0', meta: kpiMeta || '—', tipo: kpiTipo, status: kpiStatus, orden: kpis.length })
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

      {/* ── Auto-KPI Dashboard (all except RRHH) ── */}
      {hasAutoKpis && !autoLoading && (
        <div className="mb-4">
          <KPIDashboard kpis={autoKpis} areaColor={areaInfo?.color} />
        </div>
      )}

      {/* ── Manual KPIs (RRHH only) ── */}
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

      {/* ── Tareas ── */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm mb-4">
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

      {/* ── Módulo Especializado del Área ── */}
      {AreaPanel && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-0.5 h-4 rounded" style={{ background: areaInfo?.color || '#64748B' }} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate">
              {areaId === 'obras' ? 'Control Financiero' :
               areaId === 'legal' ? 'Causas Activas' :
               areaId === 'prevencion' ? 'Estadísticas de Seguridad' :
               areaId === 'estudios' ? 'Pipeline de Licitaciones' :
               areaId === 'finanzas' ? 'Flujo Financiero' :
               areaId === 'eti' ? 'Herramientas Digitales' :
               'Módulo Especializado'}
            </span>
          </div>
          <AreaPanel />
        </div>
      )}
    </>
  )
}
