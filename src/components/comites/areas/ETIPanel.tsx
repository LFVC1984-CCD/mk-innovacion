'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/comites/hooks'
import { fmtMoney } from '@/lib/comites/data'

// ── Types ──

type HerramientaEstado = 'activa' | 'en_evaluacion' | 'suspendida' | 'cancelada'
type HerramientaCategoria = 'software' | 'plataforma' | 'hardware' | 'servicio_cloud' | 'licencia' | 'otro'

interface HerramientaETI {
  id: string
  nombre: string
  categoria: HerramientaCategoria
  estado: HerramientaEstado
  proveedor: string | null
  costo_mensual_usd: number
  costo_anual_usd: number
  usuarios: number
  responsable: string | null
  fecha_contratacion: string | null
  fecha_renovacion: string | null
  descripcion: string | null
  url: string | null
  created_at?: string
}

interface ProyectoInnovacion {
  id: string
  nombre: string
  estado: 'idea' | 'en_desarrollo' | 'piloto' | 'implementado' | 'descartado'
  responsable: string | null
  fecha_inicio: string | null
  fecha_objetivo: string | null
  descripcion: string | null
  impacto_esperado: string | null
  presupuesto_usd: number
  created_at?: string
}

const EMPTY_HERRAMIENTA: Omit<HerramientaETI, 'id'> = {
  nombre: '', categoria: 'software', estado: 'activa', proveedor: null,
  costo_mensual_usd: 0, costo_anual_usd: 0, usuarios: 0, responsable: null,
  fecha_contratacion: null, fecha_renovacion: null, descripcion: null, url: null,
}

const EMPTY_PROYECTO_INN: Omit<ProyectoInnovacion, 'id'> = {
  nombre: '', estado: 'idea', responsable: null, fecha_inicio: null,
  fecha_objetivo: null, descripcion: null, impacto_esperado: null, presupuesto_usd: 0,
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

const ESTADO_PROY: Record<ProyectoInnovacion['estado'], { label: string; color: string }> = {
  idea: { label: 'Idea', color: '#64748B' },
  en_desarrollo: { label: 'En Desarrollo', color: '#0B5ED7' },
  piloto: { label: 'Piloto', color: '#D97706' },
  implementado: { label: 'Implementado', color: '#16A34A' },
  descartado: { label: 'Descartado', color: '#94A3B8' },
}

export default function ETIPanel() {
  const supabase = createClient()
  const { canEdit } = useAuth()
  const ce = canEdit('eti')

  const [herramientas, setHerramientas] = useState<HerramientaETI[]>([])
  const [proyectos, setProyectos] = useState<ProyectoInnovacion[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'herramientas' | 'innovacion'>('herramientas')
  const [modalHerr, setModalHerr] = useState<Partial<HerramientaETI> | null>(null)
  const [modalProy, setModalProy] = useState<Partial<ProyectoInnovacion> | null>(null)

  async function load() {
    setLoading(true)
    const [hRes, pRes] = await Promise.all([
      supabase.from('herramientas_eti').select('*').order('nombre'),
      supabase.from('proyectos_innovacion').select('*').order('created_at', { ascending: false }),
    ])
    setHerramientas((hRes.data || []) as HerramientaETI[])
    setProyectos((pRes.data || []) as ProyectoInnovacion[])
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
    if ((modalHerr as HerramientaETI).id) {
      const { id, ...rest } = modalHerr as HerramientaETI
      await supabase.from('herramientas_eti').update(rest).eq('id', id)
    } else {
      await supabase.from('herramientas_eti').insert(modalHerr)
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

  if (loading) {
    return <div className="py-8 text-center text-slate-400 text-sm">Cargando datos ETI...</div>
  }

  return (
    <div>
      {/* Consolidado */}
      <div className="bg-[#0F172A] rounded-xl p-5 grid grid-cols-5 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Herramientas Activas</p>
          <p className="font-condensed text-[28px] font-black text-gold leading-tight mt-1">{consol.activas}</p>
          <p className="text-[10px] text-white/30 mt-0.5">{consol.enEvaluacion > 0 && `${consol.enEvaluacion} en evaluación`}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Costo Mensual</p>
          <p className="font-condensed text-[28px] font-black text-amber leading-tight mt-1">
            ${fmtMoney(consol.costoMensual).replace('$', '')}
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">USD/mes</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Gasto Anual Est.</p>
          <p className="font-condensed text-[28px] font-black leading-tight mt-1" style={{ color: '#E1BA10' }}>
            ${fmtMoney(consol.totalCosto).replace('$', '')}
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">USD/año (mensual×12 + anual)</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Usuarios Totales</p>
          <p className="font-condensed text-[28px] font-black text-cobalt leading-tight mt-1">{consol.totalUsuarios}</p>
          <p className="text-[10px] text-white/30 mt-0.5">
            {consol.totalUsuarios > 0 && consol.costoMensual > 0
              ? `$${Math.round(consol.costoMensual / consol.totalUsuarios)}/user/mes`
              : ''}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Innovación</p>
          <p className="font-condensed text-[28px] font-black text-cyan-400 leading-tight mt-1">{consol.proyActivos}</p>
          <p className="text-[10px] text-white/30 mt-0.5">proyectos activos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4">
        <button onClick={() => setTab('herramientas')}
          className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
            tab === 'herramientas' ? 'bg-cobalt text-white border-cobalt' : 'bg-white border-[#E2E8F0] text-slate-500 hover:border-cobalt'
          }`}>
          Herramientas ({herramientas.length})
        </button>
        <button onClick={() => setTab('innovacion')}
          className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
            tab === 'innovacion' ? 'bg-cobalt text-white border-cobalt' : 'bg-white border-[#E2E8F0] text-slate-500 hover:border-cobalt'
          }`}>
          Innovación ({proyectos.length})
        </button>
        <div className="flex-1" />
        {ce && tab === 'herramientas' && (
          <button onClick={() => setModalHerr({ ...EMPTY_HERRAMIENTA })} className="bg-cobalt text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold">+ Nueva herramienta</button>
        )}
        {ce && tab === 'innovacion' && (
          <button onClick={() => setModalProy({ ...EMPTY_PROYECTO_INN })} className="bg-cobalt text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold">+ Nuevo proyecto</button>
        )}
      </div>

      {/* ══ TAB HERRAMIENTAS ══ */}
      {tab === 'herramientas' && (
        herramientas.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate-400 text-sm">
            Sin herramientas registradas. Agrega licencias, suscripciones y plataformas.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                  <th className="text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Herramienta</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Cat.</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Estado</th>
                  <th className="text-right px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">$/mes</th>
                  <th className="text-right px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">$/año</th>
                  <th className="text-center px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Users</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Resp.</th>
                  {ce && <th className="w-16" />}
                </tr>
              </thead>
              <tbody>
                {herramientas.map(h => {
                  const est = ESTADO_HERR[h.estado]
                  return (
                    <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-3.5 py-2.5 font-semibold text-ink">
                        {h.url ? <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-cobalt hover:underline">{h.nombre}</a> : h.nombre}
                        {h.proveedor && <span className="text-slate-400 font-normal ml-1">({h.proveedor})</span>}
                      </td>
                      <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{CAT_LABELS[h.categoria]}</span></td>
                      <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: est.color + '15', color: est.color }}>{est.label}</span></td>
                      <td className="px-3.5 py-2.5 text-right font-condensed font-bold text-ink">{h.costo_mensual_usd > 0 ? `$${h.costo_mensual_usd}` : '—'}</td>
                      <td className="px-3.5 py-2.5 text-right font-condensed font-bold text-slate-400">{h.costo_anual_usd > 0 ? `$${h.costo_anual_usd}` : '—'}</td>
                      <td className="px-3.5 py-2.5 text-center">{h.usuarios || '—'}</td>
                      <td className="px-3.5 py-2.5 text-slate-500">{h.responsable || '—'}</td>
                      {ce && (
                        <td className="px-2 py-2.5 text-right">
                          <button onClick={() => setModalHerr({ ...h })} className="text-slate-400 hover:text-cobalt text-[10px] mr-1">editar</button>
                          <button onClick={() => deleteHerr(h.id)} className="text-slate-300 hover:text-red-500 text-sm">×</button>
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
        )
      )}

      {/* ══ TAB INNOVACIÓN ══ */}
      {tab === 'innovacion' && (
        proyectos.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate-400 text-sm">
            Sin proyectos de innovación. Agrega ideas, pilotos y desarrollos en curso.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {proyectos.map(p => {
              const est = ESTADO_PROY[p.estado]
              return (
                <div key={p.id} className="bg-white rounded-xl border border-[#E2E8F0] p-4" style={{ borderLeftWidth: 3, borderLeftColor: est.color }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-[13px] font-bold text-ink">{p.nombre}</h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 inline-block" style={{ background: est.color + '15', color: est.color }}>{est.label}</span>
                    </div>
                    {ce && (
                      <div className="flex gap-1">
                        <button onClick={() => setModalProy({ ...p })} className="text-slate-400 hover:text-cobalt text-[10px]">editar</button>
                        <button onClick={() => deleteProy(p.id)} className="text-slate-300 hover:text-red-500 text-sm">×</button>
                      </div>
                    )}
                  </div>
                  {p.descripcion && <p className="text-xs text-slate-500 mb-2 line-clamp-2">{p.descripcion}</p>}
                  {p.impacto_esperado && (
                    <div className="bg-cyan-50 rounded p-2 mb-2">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-600">Impacto esperado</span>
                      <p className="text-xs text-ink mt-0.5">{p.impacto_esperado}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    {p.responsable && <span>{p.responsable}</span>}
                    {p.presupuesto_usd > 0 && <span className="font-bold text-amber">${p.presupuesto_usd} USD</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ══ MODAL HERRAMIENTA ══ */}
      {modalHerr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalHerr(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[560px] max-h-[85vh] overflow-y-auto mx-4" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="font-condensed font-bold text-lg text-ink">{(modalHerr as HerramientaETI).id ? 'Editar herramienta' : 'Nueva herramienta'}</h3>
              <button onClick={() => setModalHerr(null)} className="text-slate-400 hover:text-ink text-lg">×</button>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Nombre</label>
                <input value={modalHerr.nombre || ''} onChange={e => setModalHerr(p => ({ ...p!, nombre: e.target.value }))} className="inp" placeholder="Ej: Microsoft 365" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Categoría</label>
                <select value={modalHerr.categoria || 'software'} onChange={e => setModalHerr(p => ({ ...p!, categoria: e.target.value as HerramientaCategoria }))} className="inp">
                  {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Estado</label>
                <select value={modalHerr.estado || 'activa'} onChange={e => setModalHerr(p => ({ ...p!, estado: e.target.value as HerramientaEstado }))} className="inp">
                  {Object.entries(ESTADO_HERR).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Proveedor</label>
                <input value={modalHerr.proveedor || ''} onChange={e => setModalHerr(p => ({ ...p!, proveedor: e.target.value }))} className="inp" placeholder="Empresa" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Responsable</label>
                <input value={modalHerr.responsable || ''} onChange={e => setModalHerr(p => ({ ...p!, responsable: e.target.value }))} className="inp" placeholder="Nombre" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Costo mensual (USD)</label>
                <input type="number" value={modalHerr.costo_mensual_usd || ''} onChange={e => setModalHerr(p => ({ ...p!, costo_mensual_usd: parseFloat(e.target.value) || 0 }))} className="inp" placeholder="0" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Costo anual (USD)</label>
                <input type="number" value={modalHerr.costo_anual_usd || ''} onChange={e => setModalHerr(p => ({ ...p!, costo_anual_usd: parseFloat(e.target.value) || 0 }))} className="inp" placeholder="0" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Usuarios</label>
                <input type="number" value={modalHerr.usuarios || ''} onChange={e => setModalHerr(p => ({ ...p!, usuarios: parseInt(e.target.value) || 0 }))} className="inp" placeholder="0" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">URL</label>
                <input value={modalHerr.url || ''} onChange={e => setModalHerr(p => ({ ...p!, url: e.target.value }))} className="inp" placeholder="https://..." />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Descripción / uso</label>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalProy(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[560px] max-h-[85vh] overflow-y-auto mx-4" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="font-condensed font-bold text-lg text-ink">{(modalProy as ProyectoInnovacion).id ? 'Editar proyecto' : 'Nuevo proyecto'}</h3>
              <button onClick={() => setModalProy(null)} className="text-slate-400 hover:text-ink text-lg">×</button>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Nombre</label>
                <input value={modalProy.nombre || ''} onChange={e => setModalProy(p => ({ ...p!, nombre: e.target.value }))} className="inp" placeholder="Nombre del proyecto" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Estado</label>
                <select value={modalProy.estado || 'idea'} onChange={e => setModalProy(p => ({ ...p!, estado: e.target.value as ProyectoInnovacion['estado'] }))} className="inp">
                  {Object.entries(ESTADO_PROY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Responsable</label>
                <input value={modalProy.responsable || ''} onChange={e => setModalProy(p => ({ ...p!, responsable: e.target.value }))} className="inp" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Presupuesto (USD)</label>
                <input type="number" value={modalProy.presupuesto_usd || ''} onChange={e => setModalProy(p => ({ ...p!, presupuesto_usd: parseFloat(e.target.value) || 0 }))} className="inp" placeholder="0" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Fecha objetivo</label>
                <input type="date" value={modalProy.fecha_objetivo || ''} onChange={e => setModalProy(p => ({ ...p!, fecha_objetivo: e.target.value || null }))} className="inp" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Descripción</label>
                <textarea value={modalProy.descripcion || ''} onChange={e => setModalProy(p => ({ ...p!, descripcion: e.target.value }))} className="inp min-h-[60px]" placeholder="Qué se quiere lograr" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Impacto esperado</label>
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
    </div>
  )
}
