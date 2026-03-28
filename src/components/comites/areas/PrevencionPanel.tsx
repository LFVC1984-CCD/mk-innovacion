'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProjects } from '@/lib/comites/use-projects'
import { useAuth } from '@/lib/comites/hooks'
import { fmtFecha } from '@/lib/comites/data'
import type { EventoSeguridad, EstadisticaMensual, TipoEvento, Gravedad } from '@/lib/types'

const EMPTY_EVENTO: Omit<EventoSeguridad, 'id'> = {
  proyecto_id: null, tipo: 'incidente', gravedad: 'leve', fecha: null,
  descripcion: null, dias_perdidos: 0, trabajador: null, accion_correctiva: null, cerrado: false,
}

const TIPO_CONFIG: Record<TipoEvento, { label: string; color: string }> = {
  accidente_trabajo: { label: 'Accidente Trabajo', color: '#DC2626' },
  accidente_trayecto: { label: 'Accidente Trayecto', color: '#D97706' },
  incidente: { label: 'Incidente', color: '#0B5ED7' },
  cuasi_accidente: { label: 'Cuasi Accidente', color: '#7C3AED' },
  enfermedad_profesional: { label: 'Enfermedad Prof.', color: '#64748B' },
}

const GRAVEDAD_CONFIG: Record<Gravedad, { label: string; color: string }> = {
  leve: { color: '#16A34A', label: 'Leve' },
  moderado: { color: '#D97706', label: 'Moderado' },
  grave: { color: '#DC2626', label: 'Grave' },
  fatal: { color: '#0F172A', label: 'Fatal' },
}

export default function PrevencionPanel() {
  const supabase = createClient()
  const { projects } = useProjects()
  const { canEdit } = useAuth()
  const ce = canEdit('prevencion')

  const [eventos, setEventos] = useState<EventoSeguridad[]>([])
  const [stats, setStats] = useState<EstadisticaMensual[]>([])
  const [loading, setLoading] = useState(true)
  const [modalEvento, setModalEvento] = useState<Partial<EventoSeguridad> | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [eRes, sRes] = await Promise.all([
      supabase.from('eventos_seguridad').select('*').order('fecha', { ascending: false }),
      supabase.from('estadisticas_seguridad').select('*').order('mes', { ascending: false }),
    ])
    setEventos((eRes.data || []) as EventoSeguridad[])
    setStats((sRes.data || []) as EstadisticaMensual[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const proyectoName = (id: string | null) => {
    if (!id) return 'General'
    return projects.find(p => p.id === id)?.nombre || 'Proyecto'
  }

  // ── Consolidado ──
  const consol = useMemo(() => {
    const accidentes = eventos.filter(e => e.tipo === 'accidente_trabajo' || e.tipo === 'accidente_trayecto')
    const diasPerdidos = eventos.reduce((s, e) => s + e.dias_perdidos, 0)
    const sinCerrar = eventos.filter(e => !e.cerrado).length
    const totalHH = stats.reduce((s, st) => s + st.hh_trabajadas, 0)
    // Tasa de frecuencia: (accidentes * 1.000.000) / HH trabajadas
    const tasaFrec = totalHH > 0 ? Math.round((accidentes.length * 1_000_000) / totalHH * 10) / 10 : 0
    // Tasa de gravedad: (días perdidos * 1.000.000) / HH trabajadas
    const tasaGrav = totalHH > 0 ? Math.round((diasPerdidos * 1_000_000) / totalHH * 10) / 10 : 0
    const totalCapacitacion = stats.reduce((s, st) => s + st.capacitaciones_horas, 0)

    return { accidentes: accidentes.length, diasPerdidos, sinCerrar, totalHH, tasaFrec, tasaGrav, totalCapacitacion, totalEventos: eventos.length }
  }, [eventos, stats])

  // ── Por proyecto ──
  const porProyecto = useMemo(() => {
    const map: Record<string, { nombre: string; accidentes: number; incidentes: number; dias: number; hh: number }> = {}
    const obrasActivas = projects.filter(p => ['adjudicado', 'activo'].includes(p.estado))
    obrasActivas.forEach(p => {
      map[p.id] = { nombre: p.nombre, accidentes: 0, incidentes: 0, dias: 0, hh: 0 }
    })
    eventos.forEach(e => {
      if (!e.proyecto_id || !map[e.proyecto_id]) return
      if (e.tipo === 'accidente_trabajo' || e.tipo === 'accidente_trayecto') map[e.proyecto_id].accidentes++
      else map[e.proyecto_id].incidentes++
      map[e.proyecto_id].dias += e.dias_perdidos
    })
    stats.forEach(s => {
      if (s.proyecto_id && map[s.proyecto_id]) map[s.proyecto_id].hh += s.hh_trabajadas
    })
    return Object.values(map).sort((a, b) => b.accidentes - a.accidentes)
  }, [eventos, stats, projects])

  // ── CRUD ──
  async function saveEvento() {
    if (!modalEvento) return
    if ((modalEvento as EventoSeguridad).id) {
      const { id, ...rest } = modalEvento as EventoSeguridad
      await supabase.from('eventos_seguridad').update(rest).eq('id', id)
    } else {
      await supabase.from('eventos_seguridad').insert(modalEvento)
    }
    setModalEvento(null)
    load()
  }

  async function deleteEvento(id: string) {
    if (!confirm('¿Eliminar este evento?')) return
    await supabase.from('eventos_seguridad').delete().eq('id', id)
    load()
  }

  async function toggleCerrado(e: EventoSeguridad) {
    await supabase.from('eventos_seguridad').update({ cerrado: !e.cerrado }).eq('id', e.id)
    load()
  }

  if (loading) {
    return <div className="py-8 text-center text-slate-500 text-sm">Cargando datos de seguridad...</div>
  }

  const eventosAbiertos = eventos.filter(e => !e.cerrado)
  const eventosCerrados = eventos.filter(e => e.cerrado)

  return (
    <div>
      {/* Consolidado */}
      <div className="bg-[#0F172A] rounded-xl p-5 grid grid-cols-5 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Accidentes</p>
          <p className="font-condensed text-[28px] font-black leading-tight mt-1" style={{ color: consol.accidentes === 0 ? '#16A34A' : '#DC2626' }}>
            {consol.accidentes}
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">{consol.diasPerdidos} días perdidos</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Tasa Frecuencia</p>
          <p className="font-condensed text-[28px] font-black leading-tight mt-1" style={{ color: consol.tasaFrec === 0 ? '#16A34A' : consol.tasaFrec < 5 ? '#D97706' : '#DC2626' }}>
            {consol.tasaFrec}
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">Acc × 10⁶ / HH</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Tasa Gravedad</p>
          <p className="font-condensed text-[28px] font-black leading-tight mt-1" style={{ color: consol.tasaGrav === 0 ? '#16A34A' : consol.tasaGrav < 50 ? '#D97706' : '#DC2626' }}>
            {consol.tasaGrav}
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">Días × 10⁶ / HH</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">HH Trabajadas</p>
          <p className="font-condensed text-[28px] font-black text-gold leading-tight mt-1">
            {consol.totalHH > 0 ? `${(consol.totalHH / 1000).toFixed(0)}K` : '0'}
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">{consol.totalCapacitacion}h capacitación</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Sin Cerrar</p>
          <p className="font-condensed text-[28px] font-black leading-tight mt-1" style={{ color: consol.sinCerrar === 0 ? '#16A34A' : '#D97706' }}>
            {consol.sinCerrar}
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">de {consol.totalEventos} eventos</p>
        </div>
      </div>

      {/* Por proyecto */}
      {porProyecto.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                <th className="text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Obra</th>
                <th className="text-center px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-red-400">Accidentes</th>
                <th className="text-center px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Incidentes</th>
                <th className="text-center px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Días Perd.</th>
                <th className="text-right px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">HH</th>
                <th className="text-right px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Tasa Frec.</th>
              </tr>
            </thead>
            <tbody>
              {porProyecto.map(p => {
                const tf = p.hh > 0 ? Math.round((p.accidentes * 1_000_000) / p.hh * 10) / 10 : 0
                return (
                  <tr key={p.nombre} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3.5 py-2.5 font-semibold text-ink">{p.nombre}</td>
                    <td className="px-3.5 py-2.5 text-center">
                      <span className={`font-condensed font-bold ${p.accidentes > 0 ? 'text-red-500' : 'text-green-500'}`}>{p.accidentes}</span>
                    </td>
                    <td className="px-3.5 py-2.5 text-center text-slate-500">{p.incidentes}</td>
                    <td className="px-3.5 py-2.5 text-center text-slate-500">{p.dias}</td>
                    <td className="px-3.5 py-2.5 text-right text-slate-500">{p.hh > 0 ? `${(p.hh / 1000).toFixed(1)}K` : '—'}</td>
                    <td className="px-3.5 py-2.5 text-right">
                      <span className="font-condensed font-bold" style={{ color: tf === 0 ? '#16A34A' : tf < 5 ? '#D97706' : '#DC2626' }}>{tf}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Header eventos */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Eventos registrados ({eventos.length})
        </p>
        {ce && (
          <button onClick={() => setModalEvento({ ...EMPTY_EVENTO })} className="bg-cobalt text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-cobalt-dark transition-colors">
            + Registrar evento
          </button>
        )}
      </div>

      {/* Eventos */}
      {eventos.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate-500 text-sm">
          Sin eventos de seguridad registrados.
        </div>
      ) : (
        <>
          {eventosAbiertos.length > 0 && (
            <div className="mb-4">
              {eventosAbiertos.map(e => (
                <EventoRow key={e.id} evento={e} proyectoName={proyectoName(e.proyecto_id)}
                  expanded={expanded === e.id} onToggle={() => setExpanded(expanded === e.id ? null : e.id)}
                  onEdit={ce ? () => setModalEvento({ ...e }) : undefined}
                  onDelete={ce ? () => deleteEvento(e.id) : undefined}
                  onToggleCerrado={ce ? () => toggleCerrado(e) : undefined}
                />
              ))}
            </div>
          )}
          {eventosCerrados.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Cerrados ({eventosCerrados.length})</p>
              {eventosCerrados.map(e => (
                <EventoRow key={e.id} evento={e} proyectoName={proyectoName(e.proyecto_id)}
                  expanded={expanded === e.id} onToggle={() => setExpanded(expanded === e.id ? null : e.id)}
                  onEdit={ce ? () => setModalEvento({ ...e }) : undefined}
                  onDelete={ce ? () => deleteEvento(e.id) : undefined}
                  onToggleCerrado={ce ? () => toggleCerrado(e) : undefined}
                />
              ))}
            </>
          )}
        </>
      )}

      {/* ══ MODAL EVENTO ══ */}
      {modalEvento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalEvento(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[560px] max-h-[85vh] overflow-y-auto mx-4" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="font-condensed font-bold text-lg text-ink">
                {(modalEvento as EventoSeguridad).id ? 'Editar evento' : 'Registrar evento'}
              </h3>
              <button onClick={() => setModalEvento(null)} className="text-slate-500 hover:text-ink text-lg">×</button>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tipo</label>
                <select value={modalEvento.tipo || 'incidente'} onChange={e => setModalEvento(p => ({ ...p!, tipo: e.target.value as TipoEvento }))} className="inp">
                  {Object.entries(TIPO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Gravedad</label>
                <select value={modalEvento.gravedad || 'leve'} onChange={e => setModalEvento(p => ({ ...p!, gravedad: e.target.value as Gravedad }))} className="inp">
                  {Object.entries(GRAVEDAD_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Proyecto</label>
                <select value={modalEvento.proyecto_id || ''} onChange={e => setModalEvento(p => ({ ...p!, proyecto_id: e.target.value || null }))} className="inp">
                  <option value="">General</option>
                  {projects.filter(p => ['adjudicado', 'activo'].includes(p.estado)).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fecha</label>
                <input type="date" value={modalEvento.fecha || ''} onChange={e => setModalEvento(p => ({ ...p!, fecha: e.target.value || null }))} className="inp" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Trabajador</label>
                <input value={modalEvento.trabajador || ''} onChange={e => setModalEvento(p => ({ ...p!, trabajador: e.target.value }))} className="inp" placeholder="Nombre" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Días perdidos</label>
                <input type="number" value={modalEvento.dias_perdidos || ''} onChange={e => setModalEvento(p => ({ ...p!, dias_perdidos: parseInt(e.target.value) || 0 }))} className="inp" placeholder="0" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Descripción</label>
                <textarea value={modalEvento.descripcion || ''} onChange={e => setModalEvento(p => ({ ...p!, descripcion: e.target.value }))} className="inp min-h-[60px]" placeholder="Qué pasó, dónde, circunstancias" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Acción correctiva</label>
                <textarea value={modalEvento.accion_correctiva || ''} onChange={e => setModalEvento(p => ({ ...p!, accion_correctiva: e.target.value }))} className="inp min-h-[60px]" placeholder="Medidas tomadas o por tomar" />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-[#E2E8F0] flex justify-end gap-2">
              <button onClick={() => setModalEvento(null)} className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-semibold">Cancelar</button>
              <button onClick={saveEvento} className="px-4 py-2 bg-cobalt text-white rounded-lg text-xs font-bold">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── EventoRow ──

function EventoRow({ evento: e, proyectoName, expanded, onToggle, onEdit, onDelete, onToggleCerrado }: {
  evento: EventoSeguridad; proyectoName: string; expanded: boolean; onToggle: () => void
  onEdit?: () => void; onDelete?: () => void; onToggleCerrado?: () => void
}) {
  const tipo = TIPO_CONFIG[e.tipo]
  const grav = GRAVEDAD_CONFIG[e.gravedad]

  return (
    <div className={`bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm mb-2 ${e.cerrado ? 'opacity-60' : ''}`}>
      <div className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors" onClick={onToggle}>
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tipo.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: tipo.color + '15', color: tipo.color }}>{tipo.label}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: grav.color + '15', color: grav.color }}>{grav.label}</span>
            {e.cerrado && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-600">Cerrado</span>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {proyectoName} {e.trabajador && `· ${e.trabajador}`} {e.fecha && `· ${fmtFecha(e.fecha)}`}
          </p>
        </div>
        {e.dias_perdidos > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500 shrink-0">{e.dias_perdidos}d perdidos</span>
        )}
        <span className="text-slate-500 text-sm">{expanded ? '▾' : '▸'}</span>
      </div>
      {expanded && (
        <div className="px-4 pb-3 border-t border-[#E2E8F0] pt-3">
          {e.descripcion && (
            <div className="bg-slate-50 rounded-lg p-2.5 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Descripción</span>
              <p className="text-xs text-ink mt-1 whitespace-pre-wrap">{e.descripcion}</p>
            </div>
          )}
          {e.accion_correctiva && (
            <div className="bg-blue-50 rounded-lg p-2.5 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cobalt">Acción correctiva</span>
              <p className="text-xs text-ink mt-1 whitespace-pre-wrap">{e.accion_correctiva}</p>
            </div>
          )}
          <div className="flex gap-1.5">
            {onToggleCerrado && (
              <button onClick={onToggleCerrado} className={`px-3 py-1 border rounded text-[10px] font-semibold ${e.cerrado ? 'border-amber-300 text-amber-600' : 'border-green-300 text-green-600'}`}>
                {e.cerrado ? 'Reabrir' : 'Cerrar evento'}
              </button>
            )}
            {onEdit && <button onClick={onEdit} className="px-3 py-1 border border-slate-200 rounded text-[10px] font-semibold hover:text-cobalt">Editar</button>}
            {onDelete && <button onClick={onDelete} className="px-3 py-1 border border-slate-200 rounded text-[10px] font-semibold text-red-400 hover:border-red-400">Eliminar</button>}
          </div>
        </div>
      )}
    </div>
  )
}
