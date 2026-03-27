'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProjects } from '@/lib/comites/use-projects'
import { useAuth } from '@/lib/comites/hooks'
import { fmtFecha, fmtMM } from '@/lib/comites/data'

// ── Types ──

type CausaEstado = 'activa' | 'en_negociacion' | 'en_arbitraje' | 'resuelta_favor' | 'resuelta_contra' | 'desistida'
type CausaTipo = 'reclamo' | 'arbitraje' | 'demanda' | 'mediacion' | 'multa' | 'otro'

interface CausaLegal {
  id: string
  proyecto_id: string | null
  titulo: string
  tipo: CausaTipo
  estado: CausaEstado
  contraparte: string | null
  monto_reclamado: number
  monto_provision: number
  fecha_inicio: string | null
  fecha_audiencia: string | null
  abogado_responsable: string | null
  descripcion: string | null
  riesgo: 'alto' | 'medio' | 'bajo'
  updated_at?: string
}

interface DocumentoLegal {
  id: string
  causa_id: string | null
  nombre: string
  tipo: 'contrato' | 'poder' | 'demanda' | 'resolucion' | 'informe' | 'correspondencia' | 'otro'
  descripcion: string | null
  url: string | null
  fecha: string | null
  created_at?: string
}

const EMPTY_CAUSA: Omit<CausaLegal, 'id'> = {
  proyecto_id: null, titulo: '', tipo: 'reclamo', estado: 'activa',
  contraparte: null, monto_reclamado: 0, monto_provision: 0,
  fecha_inicio: null, fecha_audiencia: null, abogado_responsable: null,
  descripcion: null, riesgo: 'medio',
}

const EMPTY_DOC: Omit<DocumentoLegal, 'id'> = {
  causa_id: null, nombre: '', tipo: 'otro', descripcion: null, url: null, fecha: null,
}

// ── Config de colores/labels ──

const ESTADO_CONFIG: Record<CausaEstado, { color: string; label: string }> = {
  activa: { color: '#0B5ED7', label: 'Activa' },
  en_negociacion: { color: '#D97706', label: 'En Negociación' },
  en_arbitraje: { color: '#DC2626', label: 'En Arbitraje' },
  resuelta_favor: { color: '#16A34A', label: 'Resuelta a favor' },
  resuelta_contra: { color: '#7C3AED', label: 'Resuelta en contra' },
  desistida: { color: '#94A3B8', label: 'Desistida' },
}

const TIPO_LABELS: Record<CausaTipo, string> = {
  reclamo: 'Reclamo', arbitraje: 'Arbitraje', demanda: 'Demanda',
  mediacion: 'Mediación', multa: 'Multa', otro: 'Otro',
}

const DOC_TIPO_LABELS: Record<DocumentoLegal['tipo'], string> = {
  contrato: 'Contrato', poder: 'Poder', demanda: 'Demanda',
  resolucion: 'Resolución', informe: 'Informe', correspondencia: 'Correspondencia', otro: 'Otro',
}

const RIESGO_CONFIG: Record<string, { color: string; label: string }> = {
  alto: { color: '#DC2626', label: 'Alto' },
  medio: { color: '#D97706', label: 'Medio' },
  bajo: { color: '#16A34A', label: 'Bajo' },
}

// ── Component ──

export default function LegalPanel() {
  const supabase = createClient()
  const { projects } = useProjects()
  const { canEdit } = useAuth()
  const ce = canEdit('legal')

  const [causas, setCausas] = useState<CausaLegal[]>([])
  const [docs, setDocs] = useState<DocumentoLegal[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'causas' | 'documentos'>('causas')

  // Modal state
  const [modalCausa, setModalCausa] = useState<Partial<CausaLegal> | null>(null)
  const [modalDoc, setModalDoc] = useState<Partial<DocumentoLegal> | null>(null)

  // Expanded causa
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [cRes, dRes] = await Promise.all([
      supabase.from('causas_legal').select('*').order('updated_at', { ascending: false }),
      supabase.from('documentos_legal').select('*').order('created_at', { ascending: false }),
    ])
    setCausas((cRes.data || []) as CausaLegal[])
    setDocs((dRes.data || []) as DocumentoLegal[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Proyecto name lookup
  const proyectoName = (id: string | null) => {
    if (!id) return 'General'
    return projects.find(p => p.id === id)?.nombre || 'Proyecto'
  }

  // ── Consolidado ──
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
    if ((modalCausa as CausaLegal).id) {
      const { id, ...rest } = modalCausa as CausaLegal
      await supabase.from('causas_legal').update(rest).eq('id', id)
    } else {
      await supabase.from('causas_legal').insert(modalCausa)
    }
    setModalCausa(null)
    load()
  }

  async function deleteCausa(id: string) {
    if (!confirm('¿Eliminar esta causa?')) return
    await supabase.from('causas_legal').delete().eq('id', id)
    // También eliminar documentos asociados
    await supabase.from('documentos_legal').delete().eq('causa_id', id)
    load()
  }

  // ── CRUD Documentos ──
  async function saveDoc() {
    if (!modalDoc || !modalDoc.nombre?.trim()) return
    if ((modalDoc as DocumentoLegal).id) {
      const { id, ...rest } = modalDoc as DocumentoLegal
      await supabase.from('documentos_legal').update(rest).eq('id', id)
    } else {
      await supabase.from('documentos_legal').insert(modalDoc)
    }
    setModalDoc(null)
    load()
  }

  async function deleteDoc(id: string) {
    if (!confirm('¿Eliminar este documento?')) return
    await supabase.from('documentos_legal').delete().eq('id', id)
    load()
  }

  if (loading) {
    return <div className="py-8 text-center text-slate-400 text-sm">Cargando datos legales...</div>
  }

  const causasActivas = causas.filter(c => ['activa', 'en_negociacion', 'en_arbitraje'].includes(c.estado))
  const causasCerradas = causas.filter(c => !['activa', 'en_negociacion', 'en_arbitraje'].includes(c.estado))

  return (
    <div>
      {/* Consolidado */}
      <div className="bg-[#0F172A] rounded-xl p-5 grid grid-cols-5 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Causas Activas</p>
          <p className="font-condensed text-[28px] font-black text-gold leading-tight mt-1">{consol.activas}</p>
          <p className="text-[10px] text-white/30 mt-0.5">{consol.altoRiesgo > 0 && <span className="text-red-400">{consol.altoRiesgo} riesgo alto</span>}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Monto Reclamado</p>
          <p className="font-condensed text-[28px] font-black text-amber leading-tight mt-1">{fmtMM(consol.totalReclamado)}</p>
          <p className="text-[10px] text-white/30 mt-0.5">Exposición total</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Provisión</p>
          <p className="font-condensed text-[28px] font-black leading-tight mt-1" style={{ color: consol.totalProvision > 0 ? '#DC2626' : '#16A34A' }}>
            {fmtMM(consol.totalProvision)}
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">Reserva contable</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Próx. Audiencia</p>
          {consol.proxAudiencia ? (
            <>
              <p className="font-condensed text-lg font-black text-white leading-tight mt-1">
                {fmtFecha(consol.proxAudiencia.fecha_audiencia)}
              </p>
              <p className="text-[10px] text-white/30 mt-0.5 truncate">{consol.proxAudiencia.titulo}</p>
            </>
          ) : (
            <p className="text-[14px] text-white/20 mt-2">Sin audiencias</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Documentos</p>
          <p className="font-condensed text-[28px] font-black text-cobalt leading-tight mt-1">{consol.totalDocs}</p>
          <p className="text-[10px] text-white/30 mt-0.5">Archivos cargados</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4">
        <button
          onClick={() => setTab('causas')}
          className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
            tab === 'causas' ? 'bg-cobalt text-white border-cobalt' : 'bg-white border-[#E2E8F0] text-slate-500 hover:border-cobalt'
          }`}
        >
          Causas ({causas.length})
        </button>
        <button
          onClick={() => setTab('documentos')}
          className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
            tab === 'documentos' ? 'bg-cobalt text-white border-cobalt' : 'bg-white border-[#E2E8F0] text-slate-500 hover:border-cobalt'
          }`}
        >
          Documentos ({docs.length})
        </button>
        <div className="flex-1" />
        {ce && tab === 'causas' && (
          <button onClick={() => setModalCausa({ ...EMPTY_CAUSA })} className="bg-cobalt text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-cobalt-dark transition-colors">
            + Nueva causa
          </button>
        )}
        {ce && tab === 'documentos' && (
          <button onClick={() => setModalDoc({ ...EMPTY_DOC })} className="bg-cobalt text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-cobalt-dark transition-colors">
            + Nuevo documento
          </button>
        )}
      </div>

      {/* ══ TAB: CAUSAS ══ */}
      {tab === 'causas' && (
        <>
          {causas.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate-400 text-sm">
              Sin causas registradas. Agrega la primera para hacer seguimiento.
            </div>
          ) : (
            <>
              {/* Activas */}
              {causasActivas.length > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Activas ({causasActivas.length})</p>
                  {causasActivas.map(c => (
                    <CausaRow key={c.id} causa={c} proyectoName={proyectoName(c.proyecto_id)}
                      expanded={expanded === c.id} onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
                      docs={docs.filter(d => d.causa_id === c.id)}
                      onEdit={ce ? () => setModalCausa({ ...c }) : undefined}
                      onDelete={ce ? () => deleteCausa(c.id) : undefined}
                      onAddDoc={ce ? () => setModalDoc({ ...EMPTY_DOC, causa_id: c.id }) : undefined}
                      onDeleteDoc={ce ? deleteDoc : undefined}
                    />
                  ))}
                </>
              )}

              {/* Cerradas */}
              {causasCerradas.length > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 mt-5">Cerradas / Resueltas ({causasCerradas.length})</p>
                  {causasCerradas.map(c => (
                    <CausaRow key={c.id} causa={c} proyectoName={proyectoName(c.proyecto_id)}
                      expanded={expanded === c.id} onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
                      docs={docs.filter(d => d.causa_id === c.id)}
                      onEdit={ce ? () => setModalCausa({ ...c }) : undefined}
                      onDelete={ce ? () => deleteCausa(c.id) : undefined}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* ══ TAB: DOCUMENTOS ══ */}
      {tab === 'documentos' && (
        <>
          {docs.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate-400 text-sm">
              Sin documentos cargados. Agrega contratos, poderes, resoluciones, informes y correspondencia relevante.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                    <th className="text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Documento</th>
                    <th className="text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Tipo</th>
                    <th className="text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Causa</th>
                    <th className="text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Fecha</th>
                    <th className="text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Descripción</th>
                    {ce && <th className="w-16" />}
                  </tr>
                </thead>
                <tbody>
                  {docs.map(d => {
                    const causa = causas.find(c => c.id === d.causa_id)
                    return (
                      <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-3.5 py-2.5 font-semibold text-ink">
                          {d.url ? (
                            <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-cobalt hover:underline">{d.nombre}</a>
                          ) : d.nombre}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {DOC_TIPO_LABELS[d.tipo]}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-500">{causa?.titulo || 'General'}</td>
                        <td className="px-3.5 py-2.5 text-slate-500">{d.fecha ? fmtFecha(d.fecha) : '—'}</td>
                        <td className="px-3.5 py-2.5 text-slate-400 max-w-[200px] truncate">{d.descripcion || '—'}</td>
                        {ce && (
                          <td className="px-2 py-2.5 text-right">
                            <button onClick={() => setModalDoc({ ...d })} className="text-slate-400 hover:text-cobalt text-[10px] mr-1">editar</button>
                            <button onClick={() => deleteDoc(d.id)} className="text-slate-300 hover:text-red-500 text-sm">×</button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ══ MODAL CAUSA ══ */}
      {modalCausa && (
        <Modal title={(modalCausa as CausaLegal).id ? 'Editar causa' : 'Nueva causa'} onClose={() => setModalCausa(null)} onSave={saveCausa}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Título</Label>
              <input value={modalCausa.titulo || ''} onChange={e => setModalCausa(p => ({ ...p!, titulo: e.target.value }))}
                className="inp" placeholder="Ej: Reclamo adicionales Edificio Centro" />
            </div>
            <div>
              <Label>Tipo</Label>
              <select value={modalCausa.tipo || 'reclamo'} onChange={e => setModalCausa(p => ({ ...p!, tipo: e.target.value as CausaTipo }))} className="inp">
                {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label>Estado</Label>
              <select value={modalCausa.estado || 'activa'} onChange={e => setModalCausa(p => ({ ...p!, estado: e.target.value as CausaEstado }))} className="inp">
                {Object.entries(ESTADO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Riesgo</Label>
              <select value={modalCausa.riesgo || 'medio'} onChange={e => setModalCausa(p => ({ ...p!, riesgo: e.target.value as 'alto' | 'medio' | 'bajo' }))} className="inp">
                {Object.entries(RIESGO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Proyecto (opcional)</Label>
              <select value={modalCausa.proyecto_id || ''} onChange={e => setModalCausa(p => ({ ...p!, proyecto_id: e.target.value || null }))} className="inp">
                <option value="">General (sin proyecto)</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label>Contraparte</Label>
              <input value={modalCausa.contraparte || ''} onChange={e => setModalCausa(p => ({ ...p!, contraparte: e.target.value }))}
                className="inp" placeholder="Nombre contraparte" />
            </div>
            <div>
              <Label>Abogado responsable</Label>
              <input value={modalCausa.abogado_responsable || ''} onChange={e => setModalCausa(p => ({ ...p!, abogado_responsable: e.target.value }))}
                className="inp" placeholder="Nombre abogado" />
            </div>
            <div>
              <Label>Monto reclamado ($MM)</Label>
              <input type="number" value={modalCausa.monto_reclamado || ''} onChange={e => setModalCausa(p => ({ ...p!, monto_reclamado: parseFloat(e.target.value) || 0 }))}
                className="inp" placeholder="0" />
            </div>
            <div>
              <Label>Provisión ($MM)</Label>
              <input type="number" value={modalCausa.monto_provision || ''} onChange={e => setModalCausa(p => ({ ...p!, monto_provision: parseFloat(e.target.value) || 0 }))}
                className="inp" placeholder="0" />
            </div>
            <div>
              <Label>Fecha inicio</Label>
              <input type="date" value={modalCausa.fecha_inicio || ''} onChange={e => setModalCausa(p => ({ ...p!, fecha_inicio: e.target.value || null }))} className="inp" />
            </div>
            <div>
              <Label>Fecha audiencia</Label>
              <input type="date" value={modalCausa.fecha_audiencia || ''} onChange={e => setModalCausa(p => ({ ...p!, fecha_audiencia: e.target.value || null }))} className="inp" />
            </div>
            <div className="col-span-2">
              <Label>Descripción / contexto</Label>
              <textarea value={modalCausa.descripcion || ''} onChange={e => setModalCausa(p => ({ ...p!, descripcion: e.target.value }))}
                className="inp min-h-[80px]" placeholder="Contexto detallado de la causa. En el futuro un agente IA podrá leer esto para plantear opciones y estrategias." />
            </div>
          </div>
        </Modal>
      )}

      {/* ══ MODAL DOCUMENTO ══ */}
      {modalDoc && (
        <Modal title={(modalDoc as DocumentoLegal).id ? 'Editar documento' : 'Nuevo documento'} onClose={() => setModalDoc(null)} onSave={saveDoc}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nombre del documento</Label>
              <input value={modalDoc.nombre || ''} onChange={e => setModalDoc(p => ({ ...p!, nombre: e.target.value }))}
                className="inp" placeholder="Ej: Contrato principal Edificio Centro" />
            </div>
            <div>
              <Label>Tipo</Label>
              <select value={modalDoc.tipo || 'otro'} onChange={e => setModalDoc(p => ({ ...p!, tipo: e.target.value as DocumentoLegal['tipo'] }))} className="inp">
                {Object.entries(DOC_TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label>Causa asociada (opcional)</Label>
              <select value={modalDoc.causa_id || ''} onChange={e => setModalDoc(p => ({ ...p!, causa_id: e.target.value || null }))} className="inp">
                <option value="">General (sin causa)</option>
                {causas.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
              </select>
            </div>
            <div>
              <Label>Fecha del documento</Label>
              <input type="date" value={modalDoc.fecha || ''} onChange={e => setModalDoc(p => ({ ...p!, fecha: e.target.value || null }))} className="inp" />
            </div>
            <div>
              <Label>URL / enlace</Label>
              <input value={modalDoc.url || ''} onChange={e => setModalDoc(p => ({ ...p!, url: e.target.value }))}
                className="inp" placeholder="https://..." />
            </div>
            <div className="col-span-2">
              <Label>Descripción / contenido clave</Label>
              <textarea value={modalDoc.descripcion || ''} onChange={e => setModalDoc(p => ({ ...p!, descripcion: e.target.value }))}
                className="inp min-h-[80px]" placeholder="Resumen del contenido. En el futuro un agente IA podrá leer esta descripción para entender el contexto legal." />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Subcomponents ──

function CausaRow({ causa: c, proyectoName, expanded, onToggle, docs, onEdit, onDelete, onAddDoc, onDeleteDoc }: {
  causa: CausaLegal
  proyectoName: string
  expanded: boolean
  onToggle: () => void
  docs: DocumentoLegal[]
  onEdit?: () => void
  onDelete?: () => void
  onAddDoc?: () => void
  onDeleteDoc?: (id: string) => void
}) {
  const est = ESTADO_CONFIG[c.estado]
  const riesgo = RIESGO_CONFIG[c.riesgo]

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm mb-3">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors" onClick={onToggle}>
        <span className="w-1 h-8 rounded-full shrink-0" style={{ background: est.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-bold text-ink truncate">{c.titulo}</h3>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
              style={{ background: riesgo.color + '15', color: riesgo.color }}>
              {riesgo.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
            <span>{TIPO_LABELS[c.tipo]}</span>
            <span>·</span>
            <span>{proyectoName}</span>
            {c.contraparte && <><span>·</span><span>vs {c.contraparte}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {c.monto_reclamado > 0 && (
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber font-bold">{fmtMM(c.monto_reclamado)}</span>
          )}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: est.color + '15', color: est.color }}>
            {est.label}
          </span>
          {docs.length > 0 && (
            <span className="text-[10px] text-slate-400">{docs.length} doc{docs.length !== 1 ? 's' : ''}</span>
          )}
          <span className="text-slate-400 text-sm">{expanded ? '▾' : '▸'}</span>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#E2E8F0]">
          <div className="grid grid-cols-4 gap-3 py-3 text-[11px]">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Abogado</span>
              <span className="text-ink font-semibold">{c.abogado_responsable || '—'}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Fecha inicio</span>
              <span className="text-ink font-semibold">{c.fecha_inicio ? fmtFecha(c.fecha_inicio) : '—'}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Audiencia</span>
              <span className={`font-semibold ${c.fecha_audiencia && new Date(c.fecha_audiencia) <= new Date(Date.now() + 30 * 86400000) ? 'text-red-500' : 'text-ink'}`}>
                {c.fecha_audiencia ? fmtFecha(c.fecha_audiencia) : '—'}
              </span>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Provisión</span>
              <span className="font-condensed font-bold" style={{ color: c.monto_provision > 0 ? '#DC2626' : '#64748B' }}>
                {c.monto_provision > 0 ? fmtMM(c.monto_provision) : '—'}
              </span>
            </div>
          </div>

          {/* Descripción */}
          {c.descripcion && (
            <div className="bg-slate-50 rounded-lg p-3 mb-3">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Descripción / Contexto</span>
              <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">{c.descripcion}</p>
            </div>
          )}

          {/* Documentos de esta causa */}
          {docs.length > 0 && (
            <div className="mb-3">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">Documentos asociados</span>
              {docs.map(d => (
                <div key={d.id} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0 text-xs">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">{DOC_TIPO_LABELS[d.tipo]}</span>
                  {d.url ? (
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-cobalt hover:underline flex-1 truncate">{d.nombre}</a>
                  ) : (
                    <span className="text-ink flex-1 truncate">{d.nombre}</span>
                  )}
                  {d.fecha && <span className="text-slate-400 text-[10px] shrink-0">{fmtFecha(d.fecha)}</span>}
                  {onDeleteDoc && <button onClick={() => onDeleteDoc(d.id)} className="text-slate-300 hover:text-red-500 text-sm shrink-0">×</button>}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-1.5">
            {onAddDoc && (
              <button onClick={onAddDoc} className="px-3 py-1 border border-slate-200 rounded text-[10px] font-semibold text-cobalt hover:bg-cobalt-light">
                + Documento
              </button>
            )}
            {onEdit && (
              <button onClick={onEdit} className="px-3 py-1 border border-slate-200 rounded text-[10px] font-semibold hover:border-cobalt hover:text-cobalt">
                Editar
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="px-3 py-1 border border-slate-200 rounded text-[10px] font-semibold text-red-400 hover:border-red-400">
                Eliminar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Modal({ title, onClose, onSave, children }: { title: string; onClose: () => void; onSave: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[600px] max-h-[85vh] overflow-y-auto mx-4" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
          <h3 className="font-condensed font-bold text-lg text-ink">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-ink text-lg">×</button>
        </div>
        <div className="px-5 py-4">{children}</div>
        <div className="px-5 py-3.5 border-t border-[#E2E8F0] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-semibold">Cancelar</button>
          <button onClick={onSave} className="px-4 py-2 bg-cobalt text-white rounded-lg text-xs font-bold hover:bg-cobalt-dark">Guardar</button>
        </div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{children}</label>
}
