'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProjects } from '@/lib/comites/use-projects'
import { useAuth } from '@/lib/comites/hooks'
import { fmtFecha, fmtMM } from '@/lib/comites/data'
import type { CausaLegal, CausaEstado, CausaTipo, DocumentoLegal, DocTipo } from '@/lib/types'

// ── Config ──

const ESTADO_CFG: Record<CausaEstado, { color: string; label: string }> = {
  activa: { color: '#0B5ED7', label: 'Activa' },
  en_negociacion: { color: '#D97706', label: 'En Negociación' },
  en_arbitraje: { color: '#DC2626', label: 'En Arbitraje' },
  resuelta_favor: { color: '#16A34A', label: 'Resuelta a favor' },
  resuelta_contra: { color: '#7C3AED', label: 'Resuelta en contra' },
  desistida: { color: '#94A3B8', label: 'Desistida' },
}

const TIPO_OPTS: { value: CausaTipo; label: string }[] = [
  { value: 'reclamo', label: 'Reclamo' },
  { value: 'arbitraje', label: 'Arbitraje' },
  { value: 'demanda', label: 'Demanda' },
  { value: 'mediacion', label: 'Mediación' },
  { value: 'multa', label: 'Multa' },
  { value: 'otro', label: 'Otro' },
]

const DOC_TIPO_OPTS: { value: DocTipo; label: string }[] = [
  { value: 'contrato', label: 'Contrato' },
  { value: 'poder', label: 'Poder' },
  { value: 'demanda', label: 'Demanda' },
  { value: 'resolucion', label: 'Resolución' },
  { value: 'informe', label: 'Informe' },
  { value: 'correspondencia', label: 'Correspondencia' },
  { value: 'otro', label: 'Otro' },
]

const RIESGO_CFG: Record<string, { color: string; label: string }> = {
  alto: { color: '#DC2626', label: 'Alto' },
  medio: { color: '#D97706', label: 'Medio' },
  bajo: { color: '#16A34A', label: 'Bajo' },
}

// ── Abogados conocidos (se poblan de las causas existentes) ──
function useAbogados(causas: CausaLegal[]) {
  return useMemo(() => {
    const set = new Set<string>()
    causas.forEach(c => { if (c.abogado_responsable) set.add(c.abogado_responsable) })
    return Array.from(set).sort()
  }, [causas])
}

// ── Contrapartes conocidas ──
function useContrapartes(causas: CausaLegal[]) {
  return useMemo(() => {
    const set = new Set<string>()
    causas.forEach(c => { if (c.contraparte) set.add(c.contraparte) })
    return Array.from(set).sort()
  }, [causas])
}

// ══════════════════════════════════════
//  PANEL
// ══════════════════════════════════════

export default function LegalPanel() {
  const supabase = createClient()
  const { projects } = useProjects()
  const { canEdit } = useAuth()
  const ce = canEdit('legal')

  const [causas, setCausas] = useState<CausaLegal[]>([])
  const [docs, setDocs] = useState<DocumentoLegal[]>([])
  const [loading, setLoading] = useState(true)

  const [modalCausa, setModalCausa] = useState<Partial<CausaLegal> | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [addingDocFor, setAddingDocFor] = useState<string | null>(null) // causa_id
  const [newDoc, setNewDoc] = useState<{ tipo: DocTipo; nombre: string; url: string }>({ tipo: 'contrato', nombre: '', url: '' })

  const abogados = useAbogados(causas)
  const contrapartes = useContrapartes(causas)

  async function load() {
    setLoading(true)
    const [cRes, dRes] = await Promise.all([
      supabase.from('causas_legal').select('*').order('updated_at', { ascending: false }),
      supabase.from('documentos_legal').select('*').order('created_at', { ascending: false }),
    ])
    setCausas((cRes.data || []).map((c: Record<string, unknown>) => ({ ...c, monto_reclamado: Number(c.monto_reclamado) || 0, monto_provision: Number(c.monto_provision) || 0 })) as CausaLegal[])
    setDocs((dRes.data || []) as DocumentoLegal[])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  const proyectoName = (id: string | null) => {
    if (!id) return 'General'
    return projects.find(p => p.id === id)?.nombre || 'Proyecto'
  }

  // ── KPIs ──
  const consol = useMemo(() => {
    const activas = causas.filter(c => ['activa', 'en_negociacion', 'en_arbitraje'].includes(c.estado))
    const totalReclamado = activas.reduce((s, c) => s + c.monto_reclamado, 0)
    const totalProvision = activas.reduce((s, c) => s + c.monto_provision, 0)
    const altoRiesgo = activas.filter(c => c.riesgo === 'alto').length
    const proxAudiencia = activas
      .filter(c => c.fecha_audiencia && new Date(c.fecha_audiencia) >= new Date())
      .sort((a, b) => new Date(a.fecha_audiencia!).getTime() - new Date(b.fecha_audiencia!).getTime())[0]
    return { activas: activas.length, totalReclamado, totalProvision, altoRiesgo, proxAudiencia, totalDocs: docs.length }
  }, [causas, docs])

  // ── CRUD Causas ──
  async function saveCausa() {
    if (!modalCausa || !modalCausa.titulo?.trim()) return
    const row = { ...modalCausa, updated_at: new Date().toISOString() }
    if ((modalCausa as CausaLegal).id) {
      const { id, ...rest } = row as CausaLegal & { updated_at: string }
      await supabase.from('causas_legal').update(rest).eq('id', id)
    } else {
      await supabase.from('causas_legal').insert(row)
    }
    setModalCausa(null)
    load()
  }

  async function deleteCausa(id: string) {
    if (!confirm('¿Eliminar esta causa y sus documentos?')) return
    await supabase.from('documentos_legal').delete().eq('causa_id', id)
    await supabase.from('causas_legal').delete().eq('id', id)
    load()
  }

  // ── CRUD Docs (inline) ──
  async function addDoc(causaId: string) {
    if (!newDoc.nombre.trim()) return
    await supabase.from('documentos_legal').insert({
      causa_id: causaId, nombre: newDoc.nombre, tipo: newDoc.tipo, url: newDoc.url || null, fecha: new Date().toISOString().slice(0, 10),
    })
    setNewDoc({ tipo: 'contrato', nombre: '', url: '' })
    setAddingDocFor(null)
    load()
  }

  async function deleteDoc(id: string) {
    await supabase.from('documentos_legal').delete().eq('id', id)
    load()
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-28 skeleton rounded-xl" />
        <div className="h-20 skeleton rounded-xl" />
        <div className="h-20 skeleton rounded-xl" />
      </div>
    )
  }

  const causasActivas = causas.filter(c => ['activa', 'en_negociacion', 'en_arbitraje'].includes(c.estado))
  const causasCerradas = causas.filter(c => !['activa', 'en_negociacion', 'en_arbitraje'].includes(c.estado))

  return (
    <div>
      {/* ── Consolidado ── */}
      <div className="hero-gradient rounded-xl p-5 grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Causas Activas</p>
          <p className="font-condensed text-[28px] font-black text-gold leading-tight mt-1">{consol.activas}</p>
          {consol.altoRiesgo > 0 && <p className="text-[10px] text-red-400 mt-0.5">{consol.altoRiesgo} riesgo alto</p>}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Monto Reclamado</p>
          <p className="font-condensed text-[28px] font-black text-amber leading-tight mt-1">{fmtMM(consol.totalReclamado)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Provisión</p>
          <p className="font-condensed text-[28px] font-black leading-tight mt-1" style={{ color: consol.totalProvision > 0 ? '#DC2626' : '#16A34A' }}>
            {fmtMM(consol.totalProvision)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Próx. Audiencia</p>
          {consol.proxAudiencia ? (
            <p className="font-condensed text-lg font-black text-white leading-tight mt-1">{fmtFecha(consol.proxAudiencia.fecha_audiencia)}</p>
          ) : (
            <p className="text-sm text-white/20 mt-2">Sin audiencias</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Documentos</p>
          <p className="font-condensed text-[28px] font-black text-cobalt leading-tight mt-1">{consol.totalDocs}</p>
        </div>
      </div>

      {/* ── Header + New ── */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate">Causas ({causas.length})</p>
        {ce && (
          <button onClick={() => setModalCausa({ proyecto_id: null, titulo: '', tipo: 'reclamo', estado: 'activa', contraparte: null, monto_reclamado: 0, monto_provision: 0, fecha_inicio: null, fecha_audiencia: null, abogado_responsable: null, descripcion: null, riesgo: 'medio' })}
            className="bg-cobalt text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-cobalt-dark transition-colors btn-scale">
            + Nueva causa
          </button>
        )}
      </div>

      {/* ── Lista ── */}
      {causas.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate text-sm">
          Sin causas registradas. Agrega la primera.
        </div>
      ) : (
        <>
          {causasActivas.length > 0 && (
            <div className="space-y-2.5 mb-5">
              {causasActivas.map(c => {
                const est = ESTADO_CFG[c.estado]
                const riesgo = RIESGO_CFG[c.riesgo]
                const causaDocs = docs.filter(d => d.causa_id === c.id)
                const isExp = expanded === c.id
                return (
                  <div key={c.id} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden hover:shadow-md transition-shadow">
                    {/* Row */}
                    <div className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-[#F8FAFC] transition-colors" onClick={() => setExpanded(isExp ? null : c.id)}>
                      <span className="w-1 h-8 rounded-full shrink-0" style={{ background: est.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[13px] font-bold text-ink truncate">{c.titulo}</h3>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: riesgo.color + '15', color: riesgo.color }}>{riesgo.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate">
                          <span>{TIPO_OPTS.find(t => t.value === c.tipo)?.label}</span>
                          <span>·</span>
                          <span>{proyectoName(c.proyecto_id)}</span>
                          {c.contraparte && <><span>·</span><span>vs {c.contraparte}</span></>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {c.monto_reclamado > 0 && <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber font-bold">{fmtMM(c.monto_reclamado)}</span>}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: est.color + '15', color: est.color }}>{est.label}</span>
                        {causaDocs.length > 0 && <span className="text-[10px] text-slate">{causaDocs.length} doc{causaDocs.length !== 1 ? 's' : ''}</span>}
                        <span className="text-slate text-sm">{isExp ? '▾' : '▸'}</span>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExp && (
                      <div className="px-4 pb-4 border-t border-[#E2E8F0]">
                        <div className="grid grid-cols-4 gap-3 py-3 text-[11px]">
                          <div><span className="text-[10px] font-bold uppercase tracking-wider text-slate block mb-0.5">Abogado</span><span className="text-ink font-semibold">{c.abogado_responsable || '—'}</span></div>
                          <div><span className="text-[10px] font-bold uppercase tracking-wider text-slate block mb-0.5">Inicio</span><span className="text-ink font-semibold">{c.fecha_inicio ? fmtFecha(c.fecha_inicio) : '—'}</span></div>
                          <div><span className="text-[10px] font-bold uppercase tracking-wider text-slate block mb-0.5">Audiencia</span><span className={`font-semibold ${c.fecha_audiencia && new Date(c.fecha_audiencia) <= new Date(Date.now() + 30*86400000) ? 'text-danger' : 'text-ink'}`}>{c.fecha_audiencia ? fmtFecha(c.fecha_audiencia) : '—'}</span></div>
                          <div><span className="text-[10px] font-bold uppercase tracking-wider text-slate block mb-0.5">Provisión</span><span className="font-condensed font-bold" style={{ color: c.monto_provision > 0 ? '#DC2626' : '#64748B' }}>{c.monto_provision > 0 ? fmtMM(c.monto_provision) : '—'}</span></div>
                        </div>

                        {c.descripcion && (
                          <div className="bg-[#F8FAFC] rounded-lg p-3 mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate block mb-1">Contexto</span>
                            <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">{c.descripcion}</p>
                          </div>
                        )}

                        {/* ── Documentos de esta causa ── */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate">Documentos ({causaDocs.length})</span>
                            {ce && (
                              <button onClick={() => { setAddingDocFor(addingDocFor === c.id ? null : c.id); setNewDoc({ tipo: 'contrato', nombre: '', url: '' }) }}
                                className="text-[10px] font-bold text-cobalt hover:underline">
                                {addingDocFor === c.id ? 'Cancelar' : '+ Agregar'}
                              </button>
                            )}
                          </div>
                          {causaDocs.map(d => (
                            <div key={d.id} className="flex items-center gap-2 py-1.5 border-b border-[#F1F5F9] last:border-0 text-xs">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-slate shrink-0">{DOC_TIPO_OPTS.find(t => t.value === d.tipo)?.label || d.tipo}</span>
                              {d.url ? (
                                <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-cobalt hover:underline flex-1 truncate">{d.nombre}</a>
                              ) : (
                                <span className="text-ink flex-1 truncate">{d.nombre}</span>
                              )}
                              {d.fecha && <span className="text-slate text-[10px] shrink-0">{fmtFecha(d.fecha)}</span>}
                              {ce && <button onClick={() => deleteDoc(d.id)} className="text-[#CBD5E1] hover:text-danger text-sm shrink-0">×</button>}
                            </div>
                          ))}
                          {causaDocs.length === 0 && !addingDocFor && (
                            <p className="text-[10px] text-slate italic py-1">Sin documentos aún</p>
                          )}

                          {/* Inline add doc */}
                          {addingDocFor === c.id && (
                            <div className="flex gap-1.5 mt-2 items-end">
                              <div className="w-32">
                                <span className="text-[9px] font-bold text-slate block mb-0.5">Tipo</span>
                                <select value={newDoc.tipo} onChange={e => setNewDoc(p => ({ ...p, tipo: e.target.value as DocTipo }))}
                                  className="w-full px-2 py-1.5 border border-[#E2E8F0] rounded text-xs outline-none focus:border-cobalt">
                                  {DOC_TIPO_OPTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                              </div>
                              <div className="flex-1">
                                <span className="text-[9px] font-bold text-slate block mb-0.5">Nombre</span>
                                <input value={newDoc.nombre} onChange={e => setNewDoc(p => ({ ...p, nombre: e.target.value }))}
                                  placeholder="Ej: Contrato principal"
                                  className="w-full px-2 py-1.5 border border-[#E2E8F0] rounded text-xs outline-none focus:border-cobalt" />
                              </div>
                              <div className="flex-1">
                                <span className="text-[9px] font-bold text-slate block mb-0.5">URL (opcional)</span>
                                <input value={newDoc.url} onChange={e => setNewDoc(p => ({ ...p, url: e.target.value }))}
                                  placeholder="https://..."
                                  className="w-full px-2 py-1.5 border border-[#E2E8F0] rounded text-xs outline-none focus:border-cobalt" />
                              </div>
                              <button onClick={() => addDoc(c.id)} className="px-3 py-1.5 bg-cobalt text-white rounded text-[10px] font-bold hover:bg-cobalt-dark shrink-0">Agregar</button>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1.5 pt-1">
                          {ce && <button onClick={() => setModalCausa({ ...c })} className="px-3 py-1 border border-[#E2E8F0] rounded text-[10px] font-semibold hover:border-cobalt hover:text-cobalt transition-all">Editar causa</button>}
                          {ce && <button onClick={() => deleteCausa(c.id)} className="px-3 py-1 border border-[#E2E8F0] rounded text-[10px] font-semibold text-[#CBD5E1] hover:border-danger hover:text-danger transition-all">Eliminar</button>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {causasCerradas.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-2">Cerradas / Resueltas ({causasCerradas.length})</p>
              <div className="space-y-2 opacity-70">
                {causasCerradas.map(c => {
                  const est = ESTADO_CFG[c.estado]
                  return (
                    <div key={c.id} className="bg-white rounded-xl border border-[#E2E8F0] px-4 py-3 flex items-center gap-3">
                      <span className="w-1 h-6 rounded-full shrink-0" style={{ background: est.color }} />
                      <span className="text-[13px] font-bold text-ink flex-1 truncate">{c.titulo}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: est.color + '15', color: est.color }}>{est.label}</span>
                      {c.monto_reclamado > 0 && <span className="text-[11px] text-slate">{fmtMM(c.monto_reclamado)}</span>}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ══ MODAL CAUSA ══ */}
      {modalCausa && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-md" onClick={() => setModalCausa(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] max-h-[85vh] overflow-y-auto mx-4 ring-1 ring-black/5" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="font-condensed font-bold text-lg">{(modalCausa as CausaLegal).id ? 'Editar causa' : 'Nueva causa'}</h3>
              <button onClick={() => setModalCausa(null)} className="w-7 h-7 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-slate hover:bg-[#F1F5F9]">×</button>
            </div>
            <div className="px-5 py-4">
              <div className="grid grid-cols-2 gap-3">

                {/* Título — único campo texto libre obligatorio */}
                <div className="col-span-2">
                  <L>Título de la causa</L>
                  <input value={modalCausa.titulo || ''} onChange={e => setModalCausa(p => ({ ...p!, titulo: e.target.value }))}
                    className="inp" placeholder="Ej: Reclamo adicionales Edificio Centro" />
                </div>

                {/* Selects */}
                <div>
                  <L>Tipo</L>
                  <select value={modalCausa.tipo || 'reclamo'} onChange={e => setModalCausa(p => ({ ...p!, tipo: e.target.value as CausaTipo }))} className="inp">
                    {TIPO_OPTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <L>Estado</L>
                  <select value={modalCausa.estado || 'activa'} onChange={e => setModalCausa(p => ({ ...p!, estado: e.target.value as CausaEstado }))} className="inp">
                    {Object.entries(ESTADO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <L>Riesgo</L>
                  <div className="flex gap-1">
                    {(['bajo', 'medio', 'alto'] as const).map(r => {
                      const cfg = RIESGO_CFG[r]
                      const sel = modalCausa.riesgo === r
                      return (
                        <button key={r} type="button" onClick={() => setModalCausa(p => ({ ...p!, riesgo: r }))}
                          className={`flex-1 py-2 rounded-lg text-[11px] font-bold border transition-all ${sel ? 'text-white shadow-sm' : 'bg-white text-slate hover:border-[#CBD5E1]'}`}
                          style={sel ? { background: cfg.color, borderColor: cfg.color } : { borderColor: '#E2E8F0' }}>
                          {cfg.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <L>Proyecto</L>
                  <select value={modalCausa.proyecto_id || ''} onChange={e => setModalCausa(p => ({ ...p!, proyecto_id: e.target.value || null }))} className="inp">
                    <option value="">General (sin proyecto)</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>

                {/* Contraparte — combo: select de existentes o texto libre */}
                <div>
                  <L>Contraparte</L>
                  <input list="contrapartes-list" value={modalCausa.contraparte || ''} onChange={e => setModalCausa(p => ({ ...p!, contraparte: e.target.value }))}
                    className="inp" placeholder="Seleccionar o escribir" />
                  <datalist id="contrapartes-list">
                    {contrapartes.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <L>Abogado responsable</L>
                  <input list="abogados-list" value={modalCausa.abogado_responsable || ''} onChange={e => setModalCausa(p => ({ ...p!, abogado_responsable: e.target.value }))}
                    className="inp" placeholder="Seleccionar o escribir" />
                  <datalist id="abogados-list">
                    {abogados.map(a => <option key={a} value={a} />)}
                  </datalist>
                </div>

                {/* Montos */}
                <div>
                  <L>Monto reclamado ($MM)</L>
                  <input type="number" value={modalCausa.monto_reclamado || ''} onChange={e => setModalCausa(p => ({ ...p!, monto_reclamado: parseFloat(e.target.value) || 0 }))} className="inp" placeholder="0" />
                </div>
                <div>
                  <L>Provisión ($MM)</L>
                  <input type="number" value={modalCausa.monto_provision || ''} onChange={e => setModalCausa(p => ({ ...p!, monto_provision: parseFloat(e.target.value) || 0 }))} className="inp" placeholder="0" />
                </div>

                {/* Fechas */}
                <div>
                  <L>Fecha inicio</L>
                  <input type="date" value={modalCausa.fecha_inicio || ''} onChange={e => setModalCausa(p => ({ ...p!, fecha_inicio: e.target.value || null }))} className="inp" />
                </div>
                <div>
                  <L>Fecha audiencia</L>
                  <input type="date" value={modalCausa.fecha_audiencia || ''} onChange={e => setModalCausa(p => ({ ...p!, fecha_audiencia: e.target.value || null }))} className="inp" />
                </div>

                {/* Descripción — opcional, textarea */}
                <div className="col-span-2">
                  <L>Contexto (opcional)</L>
                  <textarea value={modalCausa.descripcion || ''} onChange={e => setModalCausa(p => ({ ...p!, descripcion: e.target.value }))}
                    className="inp min-h-[60px]" placeholder="Breve contexto de la causa" />
                </div>
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-[#E2E8F0] flex justify-end gap-2">
              <button onClick={() => setModalCausa(null)} className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-semibold hover:bg-[#F1F5F9] transition-colors">Cancelar</button>
              <button onClick={saveCausa} className="px-4 py-2 bg-cobalt text-white rounded-lg text-xs font-bold hover:bg-cobalt-dark transition-colors btn-scale">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Small label ──
function L({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-1">{children}</label>
}
