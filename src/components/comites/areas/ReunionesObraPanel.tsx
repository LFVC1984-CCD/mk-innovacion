'use client'
import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useReunionesObra } from '@/lib/comites/use-reuniones-obra'
import type { ReunionObra, TareaReunion } from '@/lib/comites/use-reuniones-obra'
import { useProjects } from '@/lib/comites/use-projects'
import { useAuth } from '@/lib/comites/hooks'
import { fmtMM } from '@/lib/comites/data'
import { isObra } from '@/lib/types'
import Modal, { Field, Input, Select, Row2, Btn } from '@/components/comites/Modal'
import UserSelect from '@/components/comites/UserSelect'
import KpiCards from '@/components/comites/KpiCards'
import { toast } from '@/components/ui/Toast'

const ESTADO_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  programada: { bg: 'bg-blue-50', text: 'text-cobalt', label: 'Programada' },
  en_curso: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'En curso' },
  cerrada: { bg: 'bg-green-50', text: 'text-green-700', label: 'Cerrada' },
}

function Badge({ estado }: { estado: string }) {
  const cfg = ESTADO_BADGE[estado] || ESTADO_BADGE.programada
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
}

function fmtFechaCorta(f: string) {
  if (!f) return '—'
  const [, m, d] = f.split('-')
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${parseInt(d)} ${meses[parseInt(m) - 1]}`
}

// ══════════════════════════════════════
//  PANEL
// ══════════════════════════════════════

export default function ReunionesObraPanel() {
  const { reuniones, tareas, loading, saveReunion, deleteReunion, saveTarea, toggleTarea } = useReunionesObra()
  const { projects } = useProjects()
  const { canEdit } = useAuth()
  const ce = canEdit('obras')

  const obras = useMemo(() => projects.filter(p => isObra(p) || p.estado === 'cerrado_saldo'), [projects])

  const [selected, setSelected] = useState<ReunionObra | null>(null)
  const [modalReunion, setModalReunion] = useState<ReunionObra | 'new' | null>(null)
  const [modalTarea, setModalTarea] = useState<{ proyectoId: string } | null>(null)
  const [filtroObra, setFiltroObra] = useState<string>('todos')

  // ── Form state reunión ──
  const [form, setForm] = useState({
    proyecto_id: '', fecha: new Date().toISOString().slice(0, 10),
    proximo_ep_monto: '', proximo_ep_fecha: '', comentario_financiero: '',
    avance_reportado: '', comentario_planificacion: '',
    notas: '', asistentes: '', duracion_min: '30', estado: 'en_curso',
  })

  // ── Form state tarea ──
  const [formT, setFormT] = useState({
    area_id: 'obras', texto: '', responsable: '', fecha_compromiso: '', proyecto_id: '',
  })

  function openNewReunion() {
    setForm({
      proyecto_id: obras[0]?.id || '', fecha: new Date().toISOString().slice(0, 10),
      proximo_ep_monto: '', proximo_ep_fecha: '', comentario_financiero: '',
      avance_reportado: '', comentario_planificacion: '',
      notas: '', asistentes: '', duracion_min: '30', estado: 'en_curso',
    })
    setModalReunion('new')
  }

  function openEditReunion(r: ReunionObra) {
    setForm({
      proyecto_id: r.proyecto_id, fecha: r.fecha,
      proximo_ep_monto: r.proximo_ep_monto ? String(r.proximo_ep_monto / 1000000) : '',
      proximo_ep_fecha: r.proximo_ep_fecha, comentario_financiero: r.comentario_financiero,
      avance_reportado: r.avance_reportado ? String(r.avance_reportado) : '',
      comentario_planificacion: r.comentario_planificacion,
      notas: r.notas, asistentes: r.asistentes,
      duracion_min: String(r.duracion_min), estado: r.estado,
    })
    setModalReunion(r)
  }

  async function handleSaveReunion() {
    await saveReunion({
      proyecto_id: form.proyecto_id,
      fecha: form.fecha,
      estado: form.estado,
      proximo_ep_monto: (parseFloat(form.proximo_ep_monto) || 0) * 1000000,
      proximo_ep_fecha: form.proximo_ep_fecha,
      comentario_financiero: form.comentario_financiero,
      avance_reportado: parseFloat(form.avance_reportado) || 0,
      comentario_planificacion: form.comentario_planificacion,
      notas: form.notas,
      asistentes: form.asistentes,
      duracion_min: parseInt(form.duracion_min) || 30,
    }, typeof modalReunion === 'object' && modalReunion !== null ? modalReunion.id : undefined)
    setModalReunion(null)
    toast('Reunion guardada')
  }

  function openNewTarea(proyectoId: string) {
    setFormT({ area_id: 'obras', texto: '', responsable: '', fecha_compromiso: '', proyecto_id: proyectoId })
    setModalTarea({ proyectoId })
  }

  async function handleSaveTarea() {
    if (!formT.texto.trim()) return
    await saveTarea({ ...formT, texto: formT.texto.trim() })
    setModalTarea(null)
    toast('Tarea agregada')
  }

  // ── Filtrar reuniones ──
  const filtered = useMemo(() => {
    if (filtroObra === 'todos') return reuniones
    return reuniones.filter(r => r.proyecto_id === filtroObra)
  }, [reuniones, filtroObra])

  // ── Agrupar por proyecto ──
  const porProyecto = useMemo(() => {
    const map: Record<string, { proyecto: typeof obras[0]; reuniones: ReunionObra[]; tareas: TareaReunion[] }> = {}
    obras.forEach(p => {
      const rs = filtered.filter(r => r.proyecto_id === p.id)
      const ts = tareas.filter(t => t.proyecto_id === p.id)
      if (rs.length > 0 || ts.length > 0) {
        map[p.id] = { proyecto: p, reuniones: rs, tareas: ts }
      }
    })
    return Object.values(map)
  }, [obras, filtered, tareas])

  if (loading) return <div className="space-y-3"><div className="h-28 skeleton rounded-xl" /><div className="h-48 skeleton rounded-xl" /></div>

  // ── KPIs ──
  const totalReuniones = reuniones.length
  const reunionesEsteMes = reuniones.filter(r => r.fecha.startsWith(new Date().toISOString().slice(0, 7))).length
  const tareasPend = tareas.filter(t => t.estado === 'pendiente' || t.estado === 'en_progreso').length
  const tareasComp = tareas.filter(t => t.estado === 'completada').length

  return (
    <div>
      {/* ── KPIs ── */}
      <KpiCards items={[
        { label: 'Reuniones totales', value: totalReuniones, color: '#0B5ED7' },
        { label: 'Este mes', value: reunionesEsteMes, color: '#E1BA10' },
        { label: 'Tareas pendientes', value: tareasPend, color: '#D97706' },
        { label: 'Tareas cerradas', value: tareasComp, color: '#16A34A', sub: tareasPend + tareasComp > 0 ? `${Math.round(tareasComp / (tareasPend + tareasComp) * 100)}% cumplimiento` : undefined },
      ]} />

      {/* ── Filtro + Acciones ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2 items-center">
          <select value={filtroObra} onChange={e => setFiltroObra(e.target.value)}
            className="text-xs font-semibold border border-[#E2E8F0] rounded-lg px-3 py-1.5 bg-white">
            <option value="todos">Todas las obras</option>
            {obras.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <span className="text-[10px] text-slate">{filtered.length} reunion{filtered.length !== 1 ? 'es' : ''}</span>
        </div>
        {ce && (
          <button onClick={openNewReunion} className="bg-cobalt text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-cobalt-dark btn-scale">
            + Nueva reunion
          </button>
        )}
      </div>

      {/* ── Timeline por obra ── */}
      <div className="space-y-4">
        {porProyecto.length === 0 && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate text-sm">
            Sin reuniones registradas. Crea la primera con el boton + Nueva reunion.
          </div>
        )}
        {porProyecto.map(({ proyecto, reuniones: rs, tareas: ts }) => (
          <div key={proyecto.id} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            {/* Header obra */}
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div>
                <h3 className="font-condensed font-bold text-base text-ink">{proyecto.nombre}</h3>
                <div className="flex gap-3 mt-0.5 text-[10px] text-slate">
                  <span>Avance: <b className="text-ink">{proyecto.avance_real}%</b></span>
                  <span>Contrato: <b className="text-ink">{fmtMM(proyecto.contrato + proyecto.ndc)}</b></span>
                  <span>Facturado: <b className="text-ink">{fmtMM(proyecto.facturado)}</b></span>
                </div>
              </div>
              {ce && (
                <button onClick={() => openNewTarea(proyecto.id)}
                  className="text-[10px] font-bold text-cobalt border border-cobalt/20 rounded-lg px-2.5 py-1 hover:bg-cobalt-light btn-scale">
                  + Tarea
                </button>
              )}
            </div>

            {/* Reuniones (timeline) */}
            <div className="divide-y divide-[#F1F5F9]">
              {rs.map(r => {
                const isOpen = selected?.id === r.id
                return (
                  <div key={r.id}>
                    <div className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                      onClick={() => setSelected(isOpen ? null : r)}>
                      <div className="w-8 h-8 rounded-lg bg-cobalt/10 flex items-center justify-center text-cobalt font-condensed font-bold text-sm">
                        {parseInt(r.fecha.split('-')[2])}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-ink">{fmtFechaCorta(r.fecha)}</span>
                          <Badge estado={r.estado} />
                          {r.duracion_min > 0 && <span className="text-[10px] text-slate">{r.duracion_min} min</span>}
                        </div>
                        {r.comentario_financiero && (
                          <p className="text-[11px] text-slate truncate mt-0.5">{r.comentario_financiero}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {r.proximo_ep_monto > 0 && (
                          <p className="font-condensed font-bold text-sm text-green-600">{fmtMM(r.proximo_ep_monto)}</p>
                        )}
                        {r.proximo_ep_fecha && (
                          <p className="text-[10px] text-slate">EP → {r.proximo_ep_fecha}</p>
                        )}
                      </div>
                      <svg className={`w-4 h-4 text-slate transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Detalle expandido */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden">
                          <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Financiero */}
                            <div className="rounded-lg border border-[#E2E8F0] p-3">
                              <p className="text-[10px] font-extrabold uppercase tracking-wider text-green-700 mb-2">Financiero</p>
                              {r.proximo_ep_monto > 0 && (
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[11px] text-slate">Proximo EP estimado</span>
                                  <span className="font-condensed font-bold text-green-600">{fmtMM(r.proximo_ep_monto)}</span>
                                </div>
                              )}
                              {r.proximo_ep_fecha && (
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[11px] text-slate">Fecha estimada EP</span>
                                  <span className="text-xs font-bold">{r.proximo_ep_fecha}</span>
                                </div>
                              )}
                              {r.comentario_financiero && <p className="text-[11px] text-ink mt-1 leading-relaxed">{r.comentario_financiero}</p>}
                            </div>

                            {/* Planificación */}
                            <div className="rounded-lg border border-[#E2E8F0] p-3">
                              <p className="text-[10px] font-extrabold uppercase tracking-wider text-cobalt mb-2">Planificacion</p>
                              {r.avance_reportado > 0 && (
                                <div className="mb-2">
                                  <div className="flex items-center justify-between text-[11px] mb-1">
                                    <span className="text-slate">Avance reportado</span>
                                    <span className="font-bold">{r.avance_reportado}%</span>
                                  </div>
                                  <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${r.avance_reportado}%`, background: r.avance_reportado >= 50 ? '#16A34A' : '#0B5ED7' }} />
                                  </div>
                                </div>
                              )}
                              {r.comentario_planificacion && <p className="text-[11px] text-ink leading-relaxed">{r.comentario_planificacion}</p>}
                            </div>

                            {/* Notas generales */}
                            {r.notas && (
                              <div className="sm:col-span-2 rounded-lg bg-amber-50/50 border border-amber-200/50 p-3">
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 mb-1">Notas</p>
                                <p className="text-[11px] text-ink leading-relaxed">{r.notas}</p>
                              </div>
                            )}

                            {/* Asistentes */}
                            {r.asistentes && (
                              <div className="sm:col-span-2 flex gap-1.5 flex-wrap">
                                {r.asistentes.split(',').map((a, i) => (
                                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F1F5F9] text-slate font-semibold">{a.trim()}</span>
                                ))}
                              </div>
                            )}

                            {/* Acciones */}
                            {ce && (
                              <div className="sm:col-span-2 flex gap-2 pt-1">
                                <button onClick={() => openEditReunion(r)} className="text-[10px] font-bold text-cobalt hover:underline">Editar</button>
                                <button onClick={async () => { if (confirm('Eliminar esta reunion?')) { await deleteReunion(r.id); setSelected(null); toast('Eliminada') } }}
                                  className="text-[10px] font-bold text-red-500 hover:underline">Eliminar</button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>

            {/* Tareas asociadas */}
            {ts.length > 0 && (
              <div className="border-t border-[#E2E8F0] px-4 py-3 bg-[#FAFBFD]">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate mb-2">Tareas reunion ({ts.filter(t => t.estado !== 'completada').length} pendientes)</p>
                <div className="space-y-1">
                  {ts.map(t => (
                    <div key={t.id} className="flex items-center gap-2 group">
                      <button onClick={() => toggleTarea(t.id, t.estado)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${t.estado === 'completada' ? 'bg-green-500 border-green-500' : 'border-[#CBD5E1] hover:border-cobalt'}`}>
                        {t.estado === 'completada' && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <span className={`text-[11px] flex-1 ${t.estado === 'completada' ? 'line-through text-slate' : 'text-ink'}`}>{t.texto}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${t.area_id === 'obras' ? 'bg-cobalt-light text-cobalt' : t.area_id === 'finanzas' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate'}`}>
                        {t.area_id}
                      </span>
                      {t.responsable && <span className="text-[10px] text-slate">{t.responsable}</span>}
                      {t.fecha_compromiso && <span className="text-[10px] text-slate">{fmtFechaCorta(t.fecha_compromiso)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ══ MODAL REUNION ══ */}
      <Modal open={!!modalReunion} onClose={() => setModalReunion(null)}
        title={modalReunion === 'new' ? 'Nueva reunion obra-gerencia' : 'Editar reunion'}>
        <Field label="Obra">
          <Select value={form.proyecto_id} onChange={e => setForm(f => ({ ...f, proyecto_id: e.target.value }))}>
            {obras.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
        </Field>
        <Row2>
          <Field label="Fecha">
            <Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
          </Field>
          <Field label="Estado">
            <Select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
              <option value="programada">Programada</option>
              <option value="en_curso">En curso</option>
              <option value="cerrada">Cerrada</option>
            </Select>
          </Field>
        </Row2>

        <p className="text-[10px] font-extrabold uppercase tracking-wider text-green-700 mt-3 mb-1">Financiero</p>
        <Row2>
          <Field label="Proximo EP estimado ($MM)">
            <Input type="number" placeholder="Ej: 85" value={form.proximo_ep_monto} onChange={e => setForm(f => ({ ...f, proximo_ep_monto: e.target.value }))} />
          </Field>
          <Field label="Fecha estimada EP">
            <Input type="text" placeholder="Ej: Abr 2026" value={form.proximo_ep_fecha} onChange={e => setForm(f => ({ ...f, proximo_ep_fecha: e.target.value }))} />
          </Field>
        </Row2>
        <Field label="Comentario financiero">
          <Input type="text" placeholder="EP aprobado, retenciones, NDC..." value={form.comentario_financiero} onChange={e => setForm(f => ({ ...f, comentario_financiero: e.target.value }))} />
        </Field>

        <p className="text-[10px] font-extrabold uppercase tracking-wider text-cobalt mt-3 mb-1">Planificacion</p>
        <Row2>
          <Field label="Avance reportado (%)">
            <Input type="number" placeholder="Ej: 67" value={form.avance_reportado} onChange={e => setForm(f => ({ ...f, avance_reportado: e.target.value }))} />
          </Field>
          <Field label="Duracion (min)">
            <Input type="number" placeholder="30" value={form.duracion_min} onChange={e => setForm(f => ({ ...f, duracion_min: e.target.value }))} />
          </Field>
        </Row2>
        <Field label="Comentario planificacion">
          <Input type="text" placeholder="Atrasos, hitos, actividades en curso..." value={form.comentario_planificacion} onChange={e => setForm(f => ({ ...f, comentario_planificacion: e.target.value }))} />
        </Field>

        <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 mt-3 mb-1">General</p>
        <Field label="Notas / acuerdos">
          <Input type="text" placeholder="Pendientes, compromisos, coordinaciones..." value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
        </Field>
        <Field label="Asistentes (separados por coma)">
          <Input type="text" placeholder="Felipe V., Carlos M., ..." value={form.asistentes} onChange={e => setForm(f => ({ ...f, asistentes: e.target.value }))} />
        </Field>
        <Btn onClick={handleSaveReunion}>Guardar reunion</Btn>
      </Modal>

      {/* ══ MODAL TAREA ══ */}
      <Modal open={!!modalTarea} onClose={() => setModalTarea(null)} title="Nueva tarea de reunion">
        <Field label="Tarea">
          <Input type="text" placeholder="Descripcion de la tarea" value={formT.texto} onChange={e => setFormT(f => ({ ...f, texto: e.target.value }))} />
        </Field>
        <Row2>
          <Field label="Area destino">
            <Select value={formT.area_id} onChange={e => setFormT(f => ({ ...f, area_id: e.target.value }))}>
              <option value="obras">Obra</option>
              <option value="finanzas">Finanzas / Oficina</option>
              <option value="legal">Legal</option>
              <option value="rrhh">RRHH</option>
              <option value="prevencion">Prevencion</option>
              <option value="eti">ETI</option>
            </Select>
          </Field>
          <Field label="Responsable">
            <UserSelect value={formT.responsable} onChange={v => setFormT(f => ({ ...f, responsable: v }))} placeholder="Responsable" />
          </Field>
        </Row2>
        <Field label="Fecha compromiso">
          <Input type="date" value={formT.fecha_compromiso} onChange={e => setFormT(f => ({ ...f, fecha_compromiso: e.target.value }))} />
        </Field>
        <Btn onClick={handleSaveTarea}>Agregar tarea</Btn>
      </Modal>
    </div>
  )
}
