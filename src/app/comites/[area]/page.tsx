'use client'
import { use } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth, useAreaData } from '@/lib/comites/hooks'
import TopBar from '@/components/ui/TopBar'
import ToastContainer, { toast } from '@/components/ui/Toast'
import { AREAS_LIST } from '@/lib/types'
import type { AreaId } from '@/lib/types'

export default function AreaEditPage({ params }: { params: Promise<{ area: string }> }) {
  const { area: areaId } = use(params)
  const { perfil, loading: authLoading, canEdit } = useAuth()
  const { kpis, tareas, decisiones, parking, loading, refresh, supabase } = useAreaData(areaId as AreaId)
  const areaInfo = AREAS_LIST.find(a => a.id === areaId)

  // KPI form
  const [showKpiForm, setShowKpiForm] = useState(false)
  const [kpiName, setKpiName] = useState('')
  const [kpiValor, setKpiValor] = useState('')
  const [kpiMeta, setKpiMeta] = useState('')
  const [kpiTipo, setKpiTipo] = useState('numero')
  const [kpiStatus, setKpiStatus] = useState('ok')

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskText, setTaskText] = useState('')
  const [taskResp, setTaskResp] = useState('')
  const [taskFecha, setTaskFecha] = useState('')

  // Decision form
  const [showDecForm, setShowDecForm] = useState(false)
  const [decText, setDecText] = useState('')
  const [decUrgencia, setDecUrgencia] = useState('reunion')

  // Parking form
  const [parkText, setParkText] = useState('')

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando...</div>
  if (!canEdit(areaId)) return <div className="min-h-screen flex items-center justify-center text-red-500">Sin acceso para editar esta área</div>

  async function addKpi() {
    if (!kpiName.trim()) return
    await supabase.from('kpis').insert({
      area_id: areaId, nombre: kpiName, valor: kpiValor || '0', meta: kpiMeta || '—',
      tipo: kpiTipo, status: kpiStatus, orden: kpis.length,
    })
    setKpiName(''); setKpiValor(''); setKpiMeta(''); setShowKpiForm(false)
    toast('KPI agregado')
    refresh()
  }

  async function deleteKpi(id: string) {
    await supabase.from('kpis').delete().eq('id', id)
    refresh()
  }

  async function updateKpi(id: string, field: string, value: string) {
    await supabase.from('kpis').update({ [field]: value }).eq('id', id)
    refresh()
  }

  async function addTask() {
    if (!taskText.trim()) return
    await supabase.from('tareas').insert({
      area_id: areaId, texto: taskText, responsable: taskResp || null,
      fecha_compromiso: taskFecha || null, estado: 'pendiente',
    })
    setTaskText(''); setTaskResp(''); setTaskFecha(''); setShowTaskForm(false)
    toast('Tarea agregada')
    refresh()
  }

  async function updateTaskEstado(id: string, estado: string) {
    await supabase.from('tareas').update({ estado }).eq('id', id)
    refresh()
  }

  async function deleteTask(id: string) {
    await supabase.from('tareas').delete().eq('id', id)
    refresh()
  }

  async function addDecision() {
    if (!decText.trim()) return
    await supabase.from('decisiones').insert({
      area_id: areaId, texto: decText, urgencia: decUrgencia,
    })
    setDecText(''); setShowDecForm(false)
    toast('Decisión agregada')
    refresh()
  }

  async function resolveDecision(id: string, texto: string) {
    await supabase.from('decisiones').update({ resuelta: true }).eq('id', id)
    await supabase.from('tareas').insert({
      area_id: areaId, texto, estado: 'pendiente', from_decision: true,
    })
    toast('Decisión resuelta → tarea creada')
    refresh()
  }

  async function deleteDecision(id: string) {
    await supabase.from('decisiones').delete().eq('id', id)
    refresh()
  }

  async function addParkingItem() {
    if (!parkText.trim()) return
    await supabase.from('parking').insert({ area_id: areaId, texto: parkText })
    setParkText('')
    toast('Tema agregado al parking lot')
    refresh()
  }

  async function deleteParkingItem(id: string) {
    await supabase.from('parking').delete().eq('id', id)
    refresh()
  }

  async function saveArea() {
    for (const k of kpis) {
      await supabase.from('kpi_historial').insert({
        kpi_id: k.id, valor: k.valor,
      })
    }
    toast('Guardado — historial de KPIs registrado')
  }

  const statusColors: Record<string, { bg: string; text: string }> = {
    'en-proceso': { bg: '#EFF6FF', text: '#0B5ED7' },
    'completada': { bg: '#DCFCE7', text: '#16A34A' },
    'bloqueada': { bg: '#FEE2E2', text: '#DC2626' },
    'pendiente': { bg: '#F8FAFC', text: '#64748B' },
  }

  const urgColors: Record<string, { bg: string; text: string; label: string }> = {
    'urgente': { bg: '#FEE2E2', text: '#DC2626', label: 'Urgente' },
    'reunion': { bg: '#FEF3C7', text: '#D97706', label: 'Esta reunión' },
    'proxima': { bg: '#F8FAFC', text: '#64748B', label: 'Próxima' },
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar perfil={perfil} breadcrumbs={[
        { label: 'Comités', href: '/comites' },
        { label: areaInfo?.name || areaId },
      ]} />
      <ToastContainer />

      <div className="max-w-[1060px] mx-auto px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-condensed font-black text-xl text-ink">{areaInfo?.name || areaId}</h1>
          <div className="flex gap-2">
            <Link href={`/comites/${areaId}/proyectar`} className="px-3 py-1.5 rounded text-xs font-semibold border border-slate-200 hover:border-cobalt hover:text-cobalt transition-all">
              Proyectar →
            </Link>
            <button onClick={saveArea} className="px-3 py-1.5 rounded text-xs font-semibold bg-gold text-yellow-900 hover:bg-gold-dark transition-colors">
              Guardar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          {/* KPIs Card */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-4 rounded" style={{ background: areaInfo?.color || '#64748B' }} />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Indicadores clave</span>
              </div>
              <button onClick={() => setShowKpiForm(!showKpiForm)} className="text-xs text-cobalt font-semibold hover:bg-cobalt-light px-2 py-0.5 rounded">+ Agregar</button>
            </div>
            <div className="p-3.5">
              {kpis.length === 0 && <p className="text-xs text-slate-400 py-2">Sin indicadores. Agrega uno.</p>}
              {kpis.map(k => (
                <div key={k.id} className="border border-slate-200 rounded-lg p-3 mb-2.5" style={{ borderLeftWidth: 3, borderLeftColor: k.status === 'ok' ? '#16A34A' : k.status === 'warn' ? '#D97706' : '#DC2626' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-ink flex-1">{k.nombre}</span>
                    <button onClick={() => deleteKpi(k.id)} className="text-slate-300 hover:text-red-500 text-sm">×</button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400">Valor</span>
                    <input value={k.valor || ''} onChange={e => updateKpi(k.id, 'valor', e.target.value)}
                      className="w-20 text-xs px-2 py-1 border border-slate-200 rounded text-center focus:outline-none focus:border-cobalt" />
                    <span className="text-[10px] text-slate-400">Meta</span>
                    <input value={k.meta || ''} onChange={e => updateKpi(k.id, 'meta', e.target.value)}
                      className="w-20 text-xs px-2 py-1 border border-slate-200 rounded text-center focus:outline-none focus:border-cobalt" />
                    <select value={k.status} onChange={e => updateKpi(k.id, 'status', e.target.value)}
                      className="text-[10px] px-1.5 py-1 border border-slate-200 rounded font-bold">
                      <option value="ok">OK</option>
                      <option value="warn">Alerta</option>
                      <option value="bad">Crítico</option>
                    </select>
                  </div>
                  {k.guia && <p className="text-[10px] text-slate-400 mt-1.5 italic">{k.guia}</p>}
                </div>
              ))}

              {showKpiForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                  <input value={kpiName} onChange={e => setKpiName(e.target.value)} placeholder="Nombre del indicador" className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded mb-1.5 focus:outline-none focus:border-cobalt" />
                  <div className="flex gap-1.5 mb-1.5">
                    <input value={kpiValor} onChange={e => setKpiValor(e.target.value)} placeholder="Valor actual" className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-cobalt" />
                    <input value={kpiMeta} onChange={e => setKpiMeta(e.target.value)} placeholder="Meta" className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-cobalt" />
                  </div>
                  <div className="flex gap-1.5 mb-2">
                    <select value={kpiTipo} onChange={e => setKpiTipo(e.target.value)} className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded">
                      <option value="porcentaje">Porcentaje</option>
                      <option value="numero">Número</option>
                      <option value="dinero">Dinero ($MM)</option>
                      <option value="indice">Índice</option>
                      <option value="zero">Meta cero</option>
                    </select>
                    <select value={kpiStatus} onChange={e => setKpiStatus(e.target.value)} className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded">
                      <option value="ok">OK</option>
                      <option value="warn">Alerta</option>
                      <option value="bad">Crítico</option>
                    </select>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={addKpi} className="px-3 py-1 bg-cobalt text-white text-xs rounded font-semibold">Agregar</button>
                    <button onClick={() => setShowKpiForm(false)} className="px-3 py-1 border border-slate-200 text-xs rounded font-semibold">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Decisiones Card */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-4 rounded bg-gold" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Decisiones del comité</span>
              </div>
              <button onClick={() => setShowDecForm(!showDecForm)} className="text-xs text-cobalt font-semibold hover:bg-cobalt-light px-2 py-0.5 rounded">+ Agregar</button>
            </div>
            <div className="p-3.5">
              {decisiones.length === 0 && <p className="text-xs text-slate-400 py-2">Sin decisiones.</p>}
              {decisiones.map((dec, i) => {
                const u = urgColors[dec.urgencia] || urgColors.proxima
                return (
                  <div key={dec.id} className="flex gap-2 items-start py-2 border-b border-slate-100 last:border-0">
                    <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black text-white mt-0.5" style={{ background: dec.resuelta ? '#16A34A' : '#0B5ED7' }}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs text-ink leading-snug ${dec.resuelta ? 'line-through opacity-50' : ''}`}>{dec.texto}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: u.bg, color: u.text }}>{u.label}</span>
                        {!dec.resuelta && (
                          <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                            <input type="checkbox" onChange={() => resolveDecision(dec.id, dec.texto)} />
                            Resuelta → crear tarea
                          </label>
                        )}
                      </div>
                    </div>
                    <button onClick={() => deleteDecision(dec.id)} className="text-slate-300 hover:text-red-500 text-sm flex-shrink-0">×</button>
                  </div>
                )
              })}

              {showDecForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                  <input value={decText} onChange={e => setDecText(e.target.value)} placeholder="¿Qué necesita aprobar el comité?" className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded mb-1.5 focus:outline-none focus:border-cobalt" />
                  <select value={decUrgencia} onChange={e => setDecUrgencia(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded mb-2">
                    <option value="urgente">Urgente</option>
                    <option value="reunion">Esta reunión</option>
                    <option value="proxima">Próxima reunión</option>
                  </select>
                  <div className="flex gap-1.5">
                    <button onClick={addDecision} className="px-3 py-1 bg-cobalt text-white text-xs rounded font-semibold">Agregar</button>
                    <button onClick={() => setShowDecForm(false)} className="px-3 py-1 border border-slate-200 text-xs rounded font-semibold">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tareas Card */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-4 rounded bg-cobalt" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tareas en proceso</span>
              </div>
              <button onClick={() => setShowTaskForm(!showTaskForm)} className="text-xs text-cobalt font-semibold hover:bg-cobalt-light px-2 py-0.5 rounded">+ Agregar</button>
            </div>
            <div className="p-3.5">
              {tareas.length === 0 && <p className="text-xs text-slate-400 py-2">Sin tareas.</p>}
              {tareas.map(t => {
                const sc = statusColors[t.estado] || statusColors.pendiente
                return (
                  <div key={t.id} className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-ink leading-snug">
                        {t.texto}
                        {t.from_decision && <span className="text-cobalt italic text-[10px] ml-1">— de decisión</span>}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{t.responsable || '—'}</p>
                      {t.fecha_compromiso ? (
                        <p className="text-[10px] text-cobalt font-semibold">{new Date(t.fecha_compromiso + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      ) : (
                        <p className="text-[10px] text-red-500 font-semibold">Sin fecha — agregar antes del comité</p>
                      )}
                    </div>
                    <select value={t.estado} onChange={e => updateTaskEstado(t.id, e.target.value)}
                      className="text-[10px] font-bold rounded-full px-2 py-0.5 border-none" style={{ background: sc.bg, color: sc.text }}>
                      <option value="pendiente">Pendiente</option>
                      <option value="en-proceso">En proceso</option>
                      <option value="completada">Completada</option>
                      <option value="bloqueada">Bloqueada</option>
                    </select>
                    <button onClick={() => deleteTask(t.id)} className="text-slate-300 hover:text-red-500 text-sm flex-shrink-0">×</button>
                  </div>
                )
              })}

              {showTaskForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                  <input value={taskText} onChange={e => setTaskText(e.target.value)} placeholder="Descripción de la tarea" className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded mb-1.5 focus:outline-none focus:border-cobalt" />
                  <div className="flex gap-1.5 mb-2">
                    <input value={taskResp} onChange={e => setTaskResp(e.target.value)} placeholder="Responsable" className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-cobalt" />
                    <input type="date" value={taskFecha} onChange={e => setTaskFecha(e.target.value)} className="text-xs px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-cobalt" />
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={addTask} className="px-3 py-1 bg-cobalt text-white text-xs rounded font-semibold">Agregar</button>
                    <button onClick={() => setShowTaskForm(false)} className="px-3 py-1 border border-slate-200 text-xs rounded font-semibold">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Parking Lot Card */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <div className="w-0.5 h-4 rounded bg-slate-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Parking Lot</span>
            </div>
            <div className="p-3.5">
              <div className="text-[10px] font-bold text-amber mb-1.5">Temas para próxima reunión</div>
              {parking.length === 0 && <p className="text-[10px] text-slate-400 py-1">Sin temas.</p>}
              {parking.map(p => (
                <div key={p.id} className="flex items-center gap-1.5 py-1 border-b border-slate-100 last:border-0 text-xs text-ink2">
                  <span className="text-amber">▸</span>
                  <span className="flex-1">{p.texto}</span>
                  <button onClick={() => deleteParkingItem(p.id)} className="text-slate-300 hover:text-red-500 text-sm">×</button>
                </div>
              ))}
              <div className="flex gap-1.5 mt-2">
                <input value={parkText} onChange={e => setParkText(e.target.value)} placeholder="Agregar tema..." onKeyDown={e => e.key === 'Enter' && addParkingItem()}
                  className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-cobalt" />
                <button onClick={addParkingItem} className="px-3 py-1 bg-cobalt text-white text-xs rounded font-semibold">+ Agregar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
