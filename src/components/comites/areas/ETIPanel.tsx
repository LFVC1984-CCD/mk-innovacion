'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/comites/hooks'
import { fmtMoney } from '@/lib/comites/data'
import KpiCards from '@/components/comites/KpiCards'
import ViewToggle from '@/components/comites/ViewToggle'
import type { ViewMode } from '@/components/comites/ViewToggle'
import type { HerramientaETI, HerramientaEstado, HerramientaCategoria, ProyectoInnovacion, EtapaInnovacion, TipoRutaInnovacion } from '@/lib/types'
import { ETAPA_CONFIG, ETAPAS_DESARROLLO, ETAPAS_CONTRATACION } from '@/lib/types'
import InnovacionGantt from '@/components/comites/InnovacionGantt'

const EMPTY_HERRAMIENTA: Omit<HerramientaETI, 'id'> = {
  nombre: '', categoria: 'software', estado: 'activa', proveedor: null,
  costo_mensual_usd: 0, costo_anual_usd: 0, usuarios: 0, responsable: null,
  fecha_contratacion: null, fecha_renovacion: null, descripcion: null, url: null,
  contacto_nombre: null, contacto_telefono: null, contacto_email: null,
}

const EMPTY_PROYECTO_INN: Omit<ProyectoInnovacion, 'id'> = {
  nombre: '', estado: 'idea', etapa: 'necesidad', tipo_ruta: 'desarrollo_interno',
  responsable: null, fecha_inicio: null, fecha_objetivo: null,
  descripcion: null, impacto_esperado: null, presupuesto_usd: 0,
}

const ESTADO_HERR: Record<HerramientaEstado, { label: string; color: string }> = {
  activa: { label: 'Activa', color: '#16A34A' },
  en_evaluacion: { label: 'En Evaluación', color: '#0B5ED7' },
  suspendida: { label: 'Suspendida', color: '#D97706' },
  cancelada: { label: 'Cancelada', color: '#94A3B8' },
}

const CAT_LABELS: Record<HerramientaCategoria, string> = {
  software: 'Software', plataforma: 'Plataforma', hardware: 'Hardware',
  servicio_cloud: 'Cloud', licencia: 'Licencia', otro: 'Otro',
}

const ESTADO_PROY: Record<ProyectoInnovacion['estado'], { label: string; color: string }> = { // eslint-disable-line @typescript-eslint/no-unused-vars
  idea: { label: 'Idea', color: '#64748B' },
  en_desarrollo: { label: 'En Desarrollo', color: '#0B5ED7' },
  piloto: { label: 'Piloto', color: '#D97706' },
  implementado: { label: 'Implementado', color: '#16A34A' },
  descartado: { label: 'Descartado', color: '#94A3B8' },
}

interface MiembroETI {
  id: string
  nombre: string
  cargo: string
  rol: string
  dedicacion: string
  costo_mensual_usd: number
  email: string
  observacion: string
  activo: boolean
}

const ROL_LABELS: Record<string, string> = {
  gerente: 'Gerente', desarrollador: 'Desarrollador', consultor: 'Consultor',
  analista: 'Analista', soporte: 'Soporte', miembro: 'Miembro',
}
const DEDIC_LABELS: Record<string, string> = {
  completa: 'Completa', parcial: 'Parcial', por_proyecto: 'Por proyecto',
}

export default function ETIPanel() {
  const supabase = createClient()
  const { canEdit } = useAuth()
  const ce = canEdit('eti')

  const [herramientas, setHerramientas] = useState<HerramientaETI[]>([])
  const [proyectos, setProyectos] = useState<ProyectoInnovacion[]>([])
  const [equipoETI, setEquipoETI] = useState<MiembroETI[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'herramientas' | 'innovacion' | 'equipo'>('herramientas')
  const [viewInn, setViewInn] = useState<'gantt' | 'cards' | 'tabla'>('gantt')
  const [viewHerr, setViewHerr] = useState<ViewMode>('tabla')
  const [modalHerr, setModalHerr] = useState<Partial<HerramientaETI> | null>(null)
  const [modalProy, setModalProy] = useState<Partial<ProyectoInnovacion> | null>(null)
  const [modalMiembro, setModalMiembro] = useState<Partial<MiembroETI> | null>(null)

  async function load() {
    setLoading(true)
    const [hRes, pRes, eRes] = await Promise.all([
      supabase.from('herramientas_eti').select('*').order('nombre'),
      supabase.from('proyectos_innovacion').select('*').order('created_at', { ascending: false }),
      supabase.from('equipo_eti').select('*').order('nombre'),
    ])
    setHerramientas((hRes.data || []) as HerramientaETI[])
    setProyectos((pRes.data || []) as ProyectoInnovacion[])
    setEquipoETI((eRes.data || []) as MiembroETI[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Consolidado ──
  const consol = useMemo(() => {
    const activas = herramientas.filter(h => h.estado === 'activa')
    const costoMensual = activas.reduce((s, h) => s + h.costo_mensual_usd, 0)
    const costoAnual = activas.reduce((s, h) => s + h.costo_anual_usd, 0)
    const totalCosto = costoMensual * 12 + costoAnual
    const totalUsuarios = activas.reduce((s, h) => s + h.usuarios, 0)
    const enEvaluacion = herramientas.filter(h => h.estado === 'en_evaluacion').length
    const proyActivos = proyectos.filter(p => ['idea', 'en_desarrollo', 'piloto'].includes(p.estado)).length
    const presupuestoInn = proyectos.filter(p => p.estado !== 'descartado').reduce((s, p) => s + p.presupuesto_usd, 0)
    return { activas: activas.length, costoMensual, totalCosto, totalUsuarios, enEvaluacion, proyActivos, presupuestoInn }
  }, [herramientas, proyectos])

  // ── CRUD Herramientas ──
  async function saveHerr() {
    if (!modalHerr || !modalHerr.nombre?.trim()) return
    // Strip non-column fields before sending to Supabase
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_at, ...payload } = modalHerr as HerramientaETI & { created_at?: string }
    if (id) {
      await supabase.from('herramientas_eti').update(payload).eq('id', id)
    } else {
      await supabase.from('herramientas_eti').insert(payload)
    }
    setModalHerr(null)
    load()
  }

  async function deleteHerr(id: string) {
    if (!confirm('¿Eliminar esta herramienta?')) return
    await supabase.from('herramientas_eti').delete().eq('id', id)
    load()
  }

  // ── CRUD Proyectos Innovación ──
  async function saveProy() {
    if (!modalProy || !modalProy.nombre?.trim()) return
    if ((modalProy as ProyectoInnovacion).id) {
      const { id, ...rest } = modalProy as ProyectoInnovacion
      await supabase.from('proyectos_innovacion').update(rest).eq('id', id)
    } else {
      await supabase.from('proyectos_innovacion').insert(modalProy)
    }
    setModalProy(null)
    load()
  }

  async function deleteProy(id: string) {
    if (!confirm('¿Eliminar este proyecto?')) return
    await supabase.from('proyectos_innovacion').delete().eq('id', id)
    load()
  }

  // ── CRUD Equipo ETI ──
  async function saveMiembro() {
    if (!modalMiembro || !modalMiembro.nombre?.trim()) return
    if ((modalMiembro as MiembroETI).id) {
      const { id, ...rest } = modalMiembro as MiembroETI
      await supabase.from('equipo_eti').update(rest).eq('id', id)
    } else {
      await supabase.from('equipo_eti').insert(modalMiembro)
    }
    setModalMiembro(null)
    load()
  }

  async function deleteMiembro(id: string) {
    if (!confirm('¿Eliminar este miembro?')) return
    await supabase.from('equipo_eti').delete().eq('id', id)
    load()
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-20 skeleton rounded-xl" />
        <div className="h-48 skeleton rounded-xl" />
      </div>
    )
  }

  return (
    <div>
      {/* Consolidado */}
      <KpiCards items={[
        { label: 'Herramientas Activas', value: consol.activas, color: '#E1BA10', sub: consol.enEvaluacion > 0 ? `${consol.enEvaluacion} en evaluación` : undefined },
        { label: 'Costo Mensual', value: `$${fmtMoney(consol.costoMensual).replace('$', '')}`, color: '#D97706', sub: 'USD/mes' },
        { label: 'Gasto Anual Est.', value: `$${fmtMoney(consol.totalCosto).replace('$', '')}`, color: '#E1BA10', sub: 'USD/año (mensual×12 + anual)' },
        { label: 'Usuarios Totales', value: consol.totalUsuarios, color: '#0B5ED7', sub: consol.totalUsuarios > 0 && consol.costoMensual > 0 ? `$${Math.round(consol.costoMensual / consol.totalUsuarios)}/user/mes` : undefined },
        { label: 'Innovación', value: consol.proyActivos, color: '#06B6D4', sub: 'proyectos activos' },
      ]} />

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4">
        {([
          { id: 'herramientas' as const, label: 'Herramientas', count: herramientas.length },
          { id: 'innovacion' as const, label: 'Innovación', count: proyectos.length },
          { id: 'equipo' as const, label: 'Equipo', count: equipoETI.length },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
              tab === t.id ? 'bg-cobalt text-white border-cobalt' : 'bg-white border-[#E2E8F0] text-slate-500 hover:border-cobalt'
            }`}>
            {t.label} ({t.count})
          </button>
        ))}
        <div className="flex-1" />
        {tab === 'herramientas' && (
          <div className="flex items-center gap-2">
            <ViewToggle view={viewHerr} onChange={v => setViewHerr(v)} options={['cards', 'tabla', 'grafico']} />
            {ce && <button onClick={() => setModalHerr({ ...EMPTY_HERRAMIENTA })} className="bg-cobalt text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold">+ Nueva herramienta</button>}
          </div>
        )}
        {ce && tab === 'innovacion' && (
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex gap-0.5 bg-[#F1F5F9] rounded-lg p-0.5 border border-[#E2E8F0]">
              {(['gantt', 'cards', 'tabla'] as const).map(v => (
                <button key={v} onClick={() => setViewInn(v)}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${viewInn === v ? 'bg-white text-ink shadow-sm' : 'text-slate hover:text-ink'}`}>
                  {v === 'gantt' ? 'Gantt' : v === 'cards' ? 'Cards' : 'Tabla'}
                </button>
              ))}
            </div>
            <button onClick={() => setModalProy({ ...EMPTY_PROYECTO_INN })} className="bg-cobalt text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold">+ Nuevo proyecto</button>
          </div>
        )}
        {ce && tab === 'equipo' && (
          <button onClick={() => setModalMiembro({ nombre: '', cargo: '', rol: 'miembro', dedicacion: 'completa', costo_mensual_usd: 0, email: '', observacion: '', activo: true })} className="bg-cobalt text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold">+ Agregar miembro</button>
        )}
      </div>

      {/* ══ TAB HERRAMIENTAS ══ */}
      {tab === 'herramientas' && (
        herramientas.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate-500 text-sm">
            Sin herramientas registradas. Agrega licencias, suscripciones y plataformas.
          </div>
        ) : (
          <>
            {/* Cards view */}
            {viewHerr === 'cards' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {herramientas.map(h => {
                  const est = ESTADO_HERR[h.estado]
                  return (
                    <div key={h.id} className="bg-white rounded-xl border border-[#E2E8F0] p-4 hover:shadow-md transition-shadow cursor-pointer" style={{ borderLeftWidth: 3, borderLeftColor: est.color }}
                      onClick={() => ce && setModalHerr({ ...h })}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-xs font-bold text-ink">{h.nombre}</h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{CAT_LABELS[h.categoria]}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: est.color + '15', color: est.color }}>{est.label}</span>
                          </div>
                        </div>
                        {ce && <button onClick={e => { e.stopPropagation(); deleteHerr(h.id) }} className="text-slate-300 hover:text-red-500 text-sm">×</button>}
                      </div>
                      {h.proveedor && <p className="text-[11px] text-slate-500 mb-1">{h.proveedor}</p>}
                      <div className="flex items-center gap-3 mt-2 text-[11px]">
                        {h.costo_mensual_usd > 0 && <span className="font-condensed font-bold text-cobalt">${h.costo_mensual_usd}/mes</span>}
                        {h.costo_anual_usd > 0 && <span className="font-condensed font-bold text-slate-500">${h.costo_anual_usd}/año</span>}
                        {h.usuarios > 0 && <span className="text-slate-400">{h.usuarios} users</span>}
                      </div>
                      {h.responsable && <p className="text-[10px] text-slate-400 mt-1.5">{h.responsable}</p>}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Tabla view */}
            {viewHerr === 'tabla' && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                      <th className="text-left px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Herramienta</th>
                      <th className="text-left px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Cat.</th>
                      <th className="text-left px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Estado</th>
                      <th className="text-right px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">$/mes</th>
                      <th className="text-right px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">$/año</th>
                      <th className="text-center px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Users</th>
                      <th className="text-left px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Resp.</th>
                      {ce && <th className="w-16" />}
                    </tr>
                  </thead>
                  <tbody>
                    {herramientas.map(h => {
                      const est = ESTADO_HERR[h.estado]
                      return (
                        <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer" onClick={() => ce && setModalHerr({ ...h })}>
                          <td className="px-3.5 py-2.5 font-semibold text-ink">
                            {h.url ? <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-cobalt hover:underline" onClick={e => e.stopPropagation()}>{h.nombre}</a> : h.nombre}
                            {h.proveedor && <span className="text-slate-500 font-normal ml-1">({h.proveedor})</span>}
                          </td>
                          <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{CAT_LABELS[h.categoria]}</span></td>
                          <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: est.color + '15', color: est.color }}>{est.label}</span></td>
                          <td className="px-3.5 py-2.5 text-right font-condensed font-bold text-ink">{h.costo_mensual_usd > 0 ? `$${h.costo_mensual_usd}` : '—'}</td>
                          <td className="px-3.5 py-2.5 text-right font-condensed font-bold text-slate-500">{h.costo_anual_usd > 0 ? `$${h.costo_anual_usd}` : '—'}</td>
                          <td className="px-3.5 py-2.5 text-center">{h.usuarios || '—'}</td>
                          <td className="px-3.5 py-2.5 text-slate-500">{h.responsable || '—'}</td>
                          {ce && (
                            <td className="px-2 py-2.5 text-right">
                              <button onClick={e => { e.stopPropagation(); setModalHerr({ ...h }) }} className="text-slate-500 hover:text-cobalt text-[10px] mr-1">editar</button>
                              <button onClick={e => { e.stopPropagation(); deleteHerr(h.id) }} className="text-slate-300 hover:text-red-500 text-sm">×</button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-[#E2E8F0]">
                      <td className="px-3.5 py-2.5 font-bold text-ink" colSpan={3}>Total activas ({herramientas.filter(h => h.estado === 'activa').length})</td>
                      <td className="px-3.5 py-2.5 text-right font-condensed font-bold text-cobalt">${consol.costoMensual}</td>
                      <td className="px-3.5 py-2.5 text-right font-condensed font-bold text-slate-500">${herramientas.filter(h => h.estado === 'activa').reduce((s, h) => s + h.costo_anual_usd, 0)}</td>
                      <td className="px-3.5 py-2.5 text-center font-bold">{consol.totalUsuarios}</td>
                      <td colSpan={ce ? 2 : 1} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Grafico view — horizontal bars by cost */}
            {viewHerr === 'grafico' && (() => {
              const activas = herramientas.filter(h => h.estado === 'activa')
              const sorted = [...activas].sort((a, b) => (b.costo_mensual_usd * 12 + b.costo_anual_usd) - (a.costo_mensual_usd * 12 + a.costo_anual_usd))
              const maxCost = sorted.length > 0 ? (sorted[0].costo_mensual_usd * 12 + sorted[0].costo_anual_usd) : 1
              return (
                <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-4">Costo anual estimado por herramienta (activas)</h4>
                  <div className="space-y-2.5">
                    {sorted.map(h => {
                      const totalAnual = h.costo_mensual_usd * 12 + h.costo_anual_usd
                      const pct = maxCost > 0 ? Math.round((totalAnual / maxCost) * 100) : 0
                      return (
                        <div key={h.id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 rounded-lg px-2 py-1 -mx-2 transition-colors" onClick={() => ce && setModalHerr({ ...h })}>
                          <span className="w-32 text-xs font-semibold text-ink truncate flex-shrink-0">{h.nombre}</span>
                          <div className="flex-1 h-5 bg-[#F1F5F9] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #0B5ED7, #3B82F6)' }} />
                          </div>
                          <span className="text-xs font-condensed font-bold text-cobalt w-24 text-right flex-shrink-0">${totalAnual.toLocaleString()}/año</span>
                        </div>
                      )
                    })}
                    {sorted.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Sin herramientas activas con costo.</p>}
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex justify-end">
                    <span className="text-xs font-bold text-ink">Total: <span className="font-condensed text-cobalt">${sorted.reduce((s, h) => s + h.costo_mensual_usd * 12 + h.costo_anual_usd, 0).toLocaleString()} USD/año</span></span>
                  </div>
                </div>
              )
            })()}
          </>
        )
      )}

      {/* ══ TAB INNOVACIÓN ══ */}
      {tab === 'innovacion' && (
        proyectos.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate-500 text-sm">
            Sin proyectos de innovación. Agrega ideas, pilotos y desarrollos en curso.
          </div>
        ) : (
          <>
            {/* Insight narrativo innovacion */}
            {(() => {
              const enDesarrollo = proyectos.filter(p => ['idea', 'en_desarrollo', 'piloto'].includes(p.estado)).length
              const implementados = proyectos.filter(p => p.estado === 'implementado').length
              const totalPresup = proyectos.filter(p => p.estado !== 'descartado').reduce((s, p) => s + p.presupuesto_usd, 0)
              const vencidos = proyectos.filter(p => p.fecha_objetivo && new Date(p.fecha_objetivo) < new Date() && !['implementado', 'descartado'].includes(p.estado))
              return (
                <div className="mb-4 p-3 rounded-lg bg-cobalt-light border border-cobalt/10">
                  <p className="text-[11px] text-cobalt-dark leading-relaxed">
                    <span className="font-bold">{enDesarrollo} proyecto{enDesarrollo !== 1 ? 's' : ''} en desarrollo</span>, {implementados} implementado{implementados !== 1 ? 's' : ''}.
                    {totalPresup > 0 && <>{' '}Presupuesto total: <b>${totalPresup.toLocaleString()} USD</b>.</>}
                    {consol.totalCosto > 0 && <>{' '}Gasto anual en herramientas: <b>${consol.totalCosto.toLocaleString()} USD</b>.</>}
                    {vencidos.length > 0 && <><br /><span className="text-red-600 font-bold">{vencidos.length} proyecto{vencidos.length > 1 ? 's' : ''} con fecha objetivo vencida:</span> {vencidos.map(p => p.nombre).join(', ')} — revisar avance o reprogramar.</>}
                  </p>
                </div>
              )
            })()}

            {/* Gantt view */}
            {viewInn === 'gantt' && (
              <InnovacionGantt proyectos={proyectos} onEdit={ce ? (p) => setModalProy({ ...p }) : undefined} />
            )}

            {/* Table view */}
            {viewInn === 'tabla' && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
                <table className="w-full text-xs min-w-[700px]">
                  <thead><tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <th className="text-left px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate">Proyecto</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate">Etapa</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate">Ruta</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate">Responsable</th>
                    <th className="text-right px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate">Presupuesto</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate">Inicio</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate">Meta</th>
                    {ce && <th className="w-16" />}
                  </tr></thead>
                  <tbody>
                    {proyectos.map(p => {
                      const etapaCfg = ETAPA_CONFIG[p.etapa] || ETAPA_CONFIG.necesidad
                      return (
                        <tr key={p.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] cursor-pointer" onClick={() => ce && setModalProy({ ...p })}>
                          <td className="px-3 py-2.5 font-bold text-ink">{p.nombre}</td>
                          <td className="px-3 py-2.5"><span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: etapaCfg.color + '15', color: etapaCfg.color }}>{etapaCfg.label}</span></td>
                          <td className="px-3 py-2.5 text-[11px] text-slate">{p.tipo_ruta === 'contratacion_servicio' ? 'Contratación' : 'Desarrollo'}</td>
                          <td className="px-3 py-2.5 text-slate">{p.responsable || '—'}</td>
                          <td className="px-3 py-2.5 text-right font-condensed font-bold text-amber">{p.presupuesto_usd > 0 ? `$${p.presupuesto_usd}` : '—'}</td>
                          <td className="px-3 py-2.5 text-slate">{p.fecha_inicio || '—'}</td>
                          <td className="px-3 py-2.5"><span className={p.fecha_objetivo && new Date(p.fecha_objetivo) < new Date() ? 'text-danger font-bold' : 'text-slate'}>{p.fecha_objetivo || '—'}</span></td>
                          {ce && <td className="px-2 py-2.5 text-right"><button onClick={e => { e.stopPropagation(); deleteProy(p.id) }} className="text-slate-300 hover:text-red-500 text-sm">×</button></td>}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Cards view */}
            {viewInn === 'cards' && (
              <div className="grid grid-cols-2 gap-3">
                {proyectos.map(p => {
                  const etapaCfg = ETAPA_CONFIG[p.etapa] || ETAPA_CONFIG.necesidad
                  const etapas = p.tipo_ruta === 'contratacion_servicio' ? ETAPAS_CONTRATACION : ETAPAS_DESARROLLO
                  const currentIdx = etapas.indexOf(p.etapa)
                  const pctProgreso = etapas.length > 1 ? Math.round((currentIdx / (etapas.length - 1)) * 100) : 0
                  return (
                    <div key={p.id} className="bg-white rounded-xl border border-[#E2E8F0] p-4 hover:shadow-md transition-shadow cursor-pointer" style={{ borderLeftWidth: 3, borderLeftColor: etapaCfg.color }}
                      onClick={() => ce && setModalProy({ ...p })}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-xs font-bold text-ink">{p.nombre}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: etapaCfg.color + '15', color: etapaCfg.color }}>{etapaCfg.label}</span>
                            <span className="text-[10px] text-slate px-1.5 py-0.5 rounded bg-[#F1F5F9] font-semibold">
                              {p.tipo_ruta === 'contratacion_servicio' ? 'Contratación' : 'Desarrollo'}
                            </span>
                          </div>
                        </div>
                        {ce && <button onClick={e => { e.stopPropagation(); deleteProy(p.id) }} className="text-slate-300 hover:text-red-500 text-sm">×</button>}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pctProgreso}%`, background: etapaCfg.color }} />
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: etapaCfg.color }}>{pctProgreso}%</span>
                      </div>
                      {p.descripcion && <p className="text-xs text-slate-500 mb-2 line-clamp-2">{p.descripcion}</p>}
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        {p.responsable && <span>{p.responsable}</span>}
                        {p.presupuesto_usd > 0 && <span className="font-bold text-amber">${p.presupuesto_usd} USD</span>}
                        {p.fecha_objetivo && <span className={new Date(p.fecha_objetivo) < new Date() ? 'text-danger font-bold' : ''}>Meta: {p.fecha_objetivo}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )
      )}

      {/* ══ TAB EQUIPO ══ */}
      {tab === 'equipo' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="text-left px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate">Nombre</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate">Cargo</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate">Rol</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate">Dedicación</th>
                <th className="text-right px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate">USD/mes</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate">Email</th>
                {ce && <th className="w-20" />}
              </tr>
            </thead>
            <tbody>
              {equipoETI.map(m => (
                <tr key={m.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-3.5 py-2.5 font-bold text-ink">
                    {m.nombre}
                    {!m.activo && <span className="ml-1.5 text-[10px] text-slate bg-slate-100 px-1.5 py-0.5 rounded">Inactivo</span>}
                  </td>
                  <td className="px-3.5 py-2.5 text-slate">{m.cargo || '—'}</td>
                  <td className="px-3.5 py-2.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cobalt/10 text-cobalt">{ROL_LABELS[m.rol] || m.rol}</span>
                  </td>
                  <td className="px-3.5 py-2.5 text-slate">{DEDIC_LABELS[m.dedicacion] || m.dedicacion}</td>
                  <td className="px-3.5 py-2.5 text-right font-condensed font-bold">{m.costo_mensual_usd > 0 ? `$${m.costo_mensual_usd}` : '—'}</td>
                  <td className="px-3.5 py-2.5 text-slate text-[11px]">{m.email || '—'}</td>
                  {ce && (
                    <td className="px-2 py-2.5 text-right">
                      <button onClick={() => setModalMiembro({ ...m })} className="text-slate-500 hover:text-cobalt text-[10px] mr-1">editar</button>
                      <button onClick={() => deleteMiembro(m.id)} className="text-slate-300 hover:text-red-500 text-sm">×</button>
                    </td>
                  )}
                </tr>
              ))}
              {equipoETI.length === 0 && (
                <tr><td colSpan={ce ? 7 : 6} className="px-3.5 py-8 text-center text-slate text-sm">Sin miembros registrados.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#F8FAFC] border-t border-[#E2E8F0]">
                <td className="px-3.5 py-2.5 font-bold" colSpan={4}>Total equipo: {equipoETI.filter(m => m.activo).length} activos</td>
                <td className="px-3.5 py-2.5 text-right font-condensed font-bold text-cobalt">${equipoETI.filter(m => m.activo).reduce((s, m) => s + m.costo_mensual_usd, 0)}</td>
                <td colSpan={ce ? 2 : 1} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ══ MODAL HERRAMIENTA ══ */}
      {modalHerr && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-md" onClick={() => setModalHerr(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[560px] max-h-[85vh] overflow-y-auto mx-4" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="font-condensed font-bold text-lg text-ink">{(modalHerr as HerramientaETI).id ? 'Editar herramienta' : 'Nueva herramienta'}</h3>
              <button onClick={() => setModalHerr(null)} className="text-slate-500 hover:text-ink text-lg">×</button>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Nombre</label>
                <input value={modalHerr.nombre || ''} onChange={e => setModalHerr(p => ({ ...p!, nombre: e.target.value }))} className="inp" placeholder="Ej: Microsoft 365" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Categoría</label>
                <select value={modalHerr.categoria || 'software'} onChange={e => setModalHerr(p => ({ ...p!, categoria: e.target.value as HerramientaCategoria }))} className="inp">
                  {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Estado</label>
                <select value={modalHerr.estado || 'activa'} onChange={e => setModalHerr(p => ({ ...p!, estado: e.target.value as HerramientaEstado }))} className="inp">
                  {Object.entries(ESTADO_HERR).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Proveedor</label>
                <input value={modalHerr.proveedor || ''} onChange={e => setModalHerr(p => ({ ...p!, proveedor: e.target.value }))} className="inp" placeholder="Empresa" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Responsable</label>
                <input value={modalHerr.responsable || ''} onChange={e => setModalHerr(p => ({ ...p!, responsable: e.target.value }))} className="inp" placeholder="Nombre" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Costo mensual (USD)</label>
                <input type="number" value={modalHerr.costo_mensual_usd || ''} onChange={e => {
                  const v = parseFloat(e.target.value) || 0
                  setModalHerr(p => ({ ...p!, costo_mensual_usd: v, costo_anual_usd: Math.round(v * 12 * 100) / 100 }))
                }} className="inp" placeholder="0" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Costo anual (USD)</label>
                <input type="number" value={modalHerr.costo_anual_usd || ''} onChange={e => {
                  const v = parseFloat(e.target.value) || 0
                  setModalHerr(p => ({ ...p!, costo_anual_usd: v, costo_mensual_usd: Math.round((v / 12) * 100) / 100 }))
                }} className="inp" placeholder="0" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Usuarios</label>
                <input type="number" value={modalHerr.usuarios || ''} onChange={e => setModalHerr(p => ({ ...p!, usuarios: parseInt(e.target.value) || 0 }))} className="inp" placeholder="0" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">URL</label>
                <input value={modalHerr.url || ''} onChange={e => setModalHerr(p => ({ ...p!, url: e.target.value }))} className="inp" placeholder="https://..." />
              </div>
              {/* Contacto proveedor */}
              <div className="col-span-2 mt-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">Contacto proveedor</p>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Nombre contacto</label>
                <input value={modalHerr.contacto_nombre || ''} onChange={e => setModalHerr(p => ({ ...p!, contacto_nombre: e.target.value }))} className="inp" placeholder="Nombre" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Teléfono contacto</label>
                <input value={modalHerr.contacto_telefono || ''} onChange={e => setModalHerr(p => ({ ...p!, contacto_telefono: e.target.value }))} className="inp" placeholder="+56 9 1234 5678" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Email contacto</label>
                <input type="email" value={modalHerr.contacto_email || ''} onChange={e => setModalHerr(p => ({ ...p!, contacto_email: e.target.value }))} className="inp" placeholder="contacto@proveedor.com" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Descripción / uso</label>
                <textarea value={modalHerr.descripcion || ''} onChange={e => setModalHerr(p => ({ ...p!, descripcion: e.target.value }))} className="inp min-h-[60px]" placeholder="Para qué se usa, qué área la ocupa" />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-[#E2E8F0] flex justify-end gap-2">
              <button onClick={() => setModalHerr(null)} className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-semibold">Cancelar</button>
              <button onClick={saveHerr} className="px-4 py-2 bg-cobalt text-white rounded-lg text-xs font-bold">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL PROYECTO INNOVACIÓN ══ */}
      {modalProy && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-md" onClick={() => setModalProy(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[560px] max-h-[85vh] overflow-y-auto mx-4" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="font-condensed font-bold text-lg text-ink">{(modalProy as ProyectoInnovacion).id ? 'Editar proyecto' : 'Nuevo proyecto'}</h3>
              <button onClick={() => setModalProy(null)} className="text-slate-500 hover:text-ink text-lg">×</button>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Nombre</label>
                <input value={modalProy.nombre || ''} onChange={e => setModalProy(p => ({ ...p!, nombre: e.target.value }))} className="inp" placeholder="Nombre del proyecto" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Ruta</label>
                <select value={modalProy.tipo_ruta || 'desarrollo_interno'} onChange={e => setModalProy(p => ({ ...p!, tipo_ruta: e.target.value as TipoRutaInnovacion }))} className="inp">
                  <option value="desarrollo_interno">Desarrollo interno</option>
                  <option value="contratacion_servicio">Contratación de servicio</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Etapa actual</label>
                <select value={modalProy.etapa || 'necesidad'} onChange={e => setModalProy(p => ({ ...p!, etapa: e.target.value as EtapaInnovacion }))} className="inp">
                  {((modalProy.tipo_ruta || 'desarrollo_interno') === 'contratacion_servicio' ? ETAPAS_CONTRATACION : ETAPAS_DESARROLLO).map(e => (
                    <option key={e} value={e}>{ETAPA_CONFIG[e].label}</option>
                  ))}
                  <option value="descartado">Descartado</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Responsable</label>
                <input value={modalProy.responsable || ''} onChange={e => setModalProy(p => ({ ...p!, responsable: e.target.value }))} className="inp" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Presupuesto (USD)</label>
                <input type="number" value={modalProy.presupuesto_usd || ''} onChange={e => setModalProy(p => ({ ...p!, presupuesto_usd: parseFloat(e.target.value) || 0 }))} className="inp" placeholder="0" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Fecha inicio</label>
                <input type="date" value={modalProy.fecha_inicio || ''} onChange={e => setModalProy(p => ({ ...p!, fecha_inicio: e.target.value || null }))} className="inp" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Fecha objetivo</label>
                <input type="date" value={modalProy.fecha_objetivo || ''} onChange={e => setModalProy(p => ({ ...p!, fecha_objetivo: e.target.value || null }))} className="inp" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Descripción</label>
                <textarea value={modalProy.descripcion || ''} onChange={e => setModalProy(p => ({ ...p!, descripcion: e.target.value }))} className="inp min-h-[60px]" placeholder="Qué se quiere lograr" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Impacto esperado</label>
                <textarea value={modalProy.impacto_esperado || ''} onChange={e => setModalProy(p => ({ ...p!, impacto_esperado: e.target.value }))} className="inp min-h-[60px]" placeholder="Ahorro, eficiencia, calidad, etc." />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-[#E2E8F0] flex justify-end gap-2">
              <button onClick={() => setModalProy(null)} className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-semibold">Cancelar</button>
              <button onClick={saveProy} className="px-4 py-2 bg-cobalt text-white rounded-lg text-xs font-bold">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL MIEMBRO ETI ══ */}
      {modalMiembro && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-md" onClick={() => setModalMiembro(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[480px] max-h-[85vh] overflow-y-auto mx-4" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="font-condensed font-bold text-lg text-ink">{(modalMiembro as MiembroETI).id ? 'Editar miembro' : 'Agregar miembro'}</h3>
              <button onClick={() => setModalMiembro(null)} className="text-slate-500 hover:text-ink text-lg">×</button>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate mb-1">Nombre</label>
                <input value={modalMiembro.nombre || ''} onChange={e => setModalMiembro(p => ({ ...p!, nombre: e.target.value }))} className="inp" placeholder="Nombre completo" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate mb-1">Cargo</label>
                <input value={modalMiembro.cargo || ''} onChange={e => setModalMiembro(p => ({ ...p!, cargo: e.target.value }))} className="inp" placeholder="Ej: Desarrollador Senior" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate mb-1">Rol</label>
                <select value={modalMiembro.rol || 'miembro'} onChange={e => setModalMiembro(p => ({ ...p!, rol: e.target.value }))} className="inp">
                  {Object.entries(ROL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate mb-1">Dedicación</label>
                <select value={modalMiembro.dedicacion || 'completa'} onChange={e => setModalMiembro(p => ({ ...p!, dedicacion: e.target.value }))} className="inp">
                  {Object.entries(DEDIC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate mb-1">Costo mensual (USD)</label>
                <input type="number" value={modalMiembro.costo_mensual_usd || ''} onChange={e => setModalMiembro(p => ({ ...p!, costo_mensual_usd: parseFloat(e.target.value) || 0 }))} className="inp" placeholder="0" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate mb-1">Email</label>
                <input value={modalMiembro.email || ''} onChange={e => setModalMiembro(p => ({ ...p!, email: e.target.value }))} className="inp" placeholder="email@empresa.com" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate mb-1">Estado</label>
                <select value={modalMiembro.activo ? 'true' : 'false'} onChange={e => setModalMiembro(p => ({ ...p!, activo: e.target.value === 'true' }))} className="inp">
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate mb-1">Observación</label>
                <input value={modalMiembro.observacion || ''} onChange={e => setModalMiembro(p => ({ ...p!, observacion: e.target.value }))} className="inp" placeholder="Notas adicionales" />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-[#E2E8F0] flex justify-end gap-2">
              <button onClick={() => setModalMiembro(null)} className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-semibold">Cancelar</button>
              <button onClick={saveMiembro} className="px-4 py-2 bg-cobalt text-white rounded-lg text-xs font-bold">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
