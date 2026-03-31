'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProcedimientos, PROC_ETAPAS, PROC_TIPOS } from '@/lib/comites/use-procedimientos'
import type { Procedimiento, ProcEstado, ProcTipo, ProcInput } from '@/lib/comites/use-procedimientos'
import { useAuth } from '@/lib/comites/hooks'
import { fmtFecha } from '@/lib/comites/data'
import Modal, { Field, Input, Select, Row2, Btn, Divider } from '@/components/comites/Modal'
import UserSelect from '@/components/comites/UserSelect'
import { toast } from '@/components/ui/Toast'

const FECHA_FIELDS: { key: keyof Procedimiento; label: string; etapa: ProcEstado }[] = [
  { key: 'fecha_necesidad', label: 'Necesidad', etapa: 'necesidad' },
  { key: 'fecha_diseno', label: 'Diseño', etapa: 'diseno' },
  { key: 'fecha_revision', label: 'Revisión', etapa: 'revision' },
  { key: 'fecha_validacion', label: 'Validación', etapa: 'validacion' },
  { key: 'fecha_desarrollo', label: 'Desarrollo', etapa: 'desarrollo' },
  { key: 'fecha_aprobacion', label: 'Aprobación', etapa: 'aprobacion' },
  { key: 'fecha_implementacion', label: 'Implementación', etapa: 'implementacion' },
  { key: 'fecha_vigencia', label: 'Vigencia', etapa: 'vigente' },
]

function etapaConfig(estado: string) {
  return PROC_ETAPAS.find(e => e.id === estado) || PROC_ETAPAS[0]
}

function tipoLabel(tipo: string) {
  return PROC_TIPOS.find(t => t.value === tipo)?.label || tipo
}

// ── Gantt mini bar ──
function EtapaBar({ proc }: { proc: Procedimiento }) {
  const currentIdx = PROC_ETAPAS.findIndex(e => e.id === proc.estado)
  return (
    <div className="flex gap-0.5 items-center">
      {PROC_ETAPAS.filter(e => e.id !== 'obsoleto').map((etapa, i) => {
        const fechaKey = FECHA_FIELDS.find(f => f.etapa === etapa.id)?.key
        const fecha = fechaKey ? (proc[fechaKey] as string | null) : null
        const isPast = i < currentIdx
        const isCurrent = i === currentIdx
        return (
          <div key={etapa.id} className="flex flex-col items-center" title={`${etapa.label}${fecha ? ': ' + fmtFecha(fecha) : ''}`}>
            <div className="w-7 h-1.5 rounded-full transition-all" style={{
              background: isCurrent ? etapa.color : isPast ? etapa.color + '60' : '#E5E7EB',
              boxShadow: isCurrent ? `0 0 4px ${etapa.color}40` : 'none',
            }} />
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════
//  PANEL
// ══════════════════════════════════════

interface Props { areaId: string }

export default function ProcedimientosPanel({ areaId }: Props) {
  const { procedimientos, loading, save, remove, upload } = useProcedimientos(areaId)
  const { canEdit } = useAuth()
  const ce = canEdit(areaId as 'obras')

  const [modal, setModal] = useState<Procedimiento | 'new' | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'todos' | 'activos' | 'vigentes'>('todos')
  const [uploading, setUploading] = useState(false)

  // Form state
  const [form, setForm] = useState<Partial<ProcInput>>({})

  function openNew() {
    setForm({ nombre: '', codigo: '', tipo: 'procedimiento', estado: 'necesidad', responsable: '', descripcion: '', version: '1.0', observacion: '', documento_url: '', diagrama_url: '', video_url: '', video_titulo: '' })
    setModal('new')
  }
  function openEdit(p: Procedimiento) {
    setForm({ ...p })
    setModal(p)
  }

  const filtered = useMemo(() => {
    if (filtro === 'vigentes') return procedimientos.filter(p => p.estado === 'vigente')
    if (filtro === 'activos') return procedimientos.filter(p => p.estado !== 'vigente' && p.estado !== 'obsoleto')
    return procedimientos
  }, [procedimientos, filtro])

  // KPIs
  const total = procedimientos.length
  const vigentes = procedimientos.filter(p => p.estado === 'vigente').length
  const enDesarrollo = procedimientos.filter(p => !['vigente', 'obsoleto'].includes(p.estado)).length
  const conVideo = procedimientos.filter(p => p.video_url).length

  async function handleSave() {
    if (!form.nombre?.trim()) return
    await save(form, typeof modal === 'object' && modal !== null ? modal.id : undefined)
    setModal(null)
    toast('Procedimiento guardado')
  }

  if (loading) return <div className="h-48 skeleton rounded-xl" />

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        {[
          { v: total, l: 'Total', c: '#1E293B' },
          { v: vigentes, l: 'Vigentes', c: '#16A34A' },
          { v: enDesarrollo, l: 'En desarrollo', c: '#D97706' },
          { v: conVideo, l: 'Con video', c: '#0B5ED7' },
        ].map(k => (
          <div key={k.l} className="bg-white rounded-xl border border-[#E2E8F0] p-3 text-center">
            <p className="font-condensed text-2xl font-black" style={{ color: k.c }}>{k.v}</p>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate">{k.l}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {([
            { key: 'todos' as const, label: 'Todos', count: total },
            { key: 'activos' as const, label: 'En desarrollo', count: enDesarrollo },
            { key: 'vigentes' as const, label: 'Vigentes', count: vigentes },
          ]).map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                filtro === f.key ? 'text-white border-transparent' : 'bg-white border-[#E2E8F0] text-slate'
              }`}
              style={filtro === f.key ? { background: 'var(--org-primary)' } : undefined}>
              {f.label} <span className="ml-1 opacity-70">{f.count}</span>
            </button>
          ))}
        </div>
        {ce && (
          <button onClick={openNew} className="bg-cobalt text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-cobalt-dark btn-scale">
            + Nuevo procedimiento
          </button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate text-sm">
          Sin procedimientos en este filtro.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const cfg = etapaConfig(p.estado)
            const isExp = expanded === p.id
            return (
              <div key={p.id} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                {/* Row */}
                <div className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-[#FAFBFD] transition-colors"
                  onClick={() => setExpanded(isExp ? null : p.id)}>
                  {/* Status dot */}
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {p.codigo && <span className="text-[10px] font-mono font-bold text-slate">{p.codigo}</span>}
                      <span className="text-xs font-bold text-ink truncate">{p.nombre}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: cfg.color + '18', color: cfg.color }}>{cfg.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F1F5F9] text-slate font-medium">{tipoLabel(p.tipo)}</span>
                      {p.video_url && <span title="Tiene video"><svg className="w-3 h-3 inline-block" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg></span>}
                    </div>
                    <EtapaBar proc={p} />
                  </div>
                  {/* Version + responsable */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-[10px] font-bold text-slate">v{p.version}</p>
                    {p.responsable && <p className="text-[10px] text-slate">{p.responsable}</p>}
                  </div>
                  <svg className={`w-4 h-4 text-slate transition-transform shrink-0 ${isExp ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExp && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 border-t border-[#F1F5F9]">
                        {/* Description */}
                        {p.descripcion && <p className="text-[11px] text-ink leading-relaxed mt-3 mb-3">{p.descripcion}</p>}

                        {/* Etapas timeline */}
                        <div className="flex gap-1 flex-wrap mb-3">
                          {FECHA_FIELDS.map(f => {
                            const fecha = p[f.key] as string | null
                            const etapa = PROC_ETAPAS.find(e => e.id === f.etapa)!
                            const isCurrent = p.estado === f.etapa
                            return (
                              <div key={f.key} className={`px-2 py-1 rounded text-[10px] border ${isCurrent ? 'font-bold' : ''}`}
                                style={{
                                  borderColor: isCurrent ? etapa.color : '#E5E7EB',
                                  background: isCurrent ? etapa.color + '12' : fecha ? '#F9FAFB' : 'white',
                                  color: fecha ? (isCurrent ? etapa.color : '#374151') : '#CBD5E1',
                                }}>
                                <span className="font-semibold">{f.label}</span>
                                {fecha && <span className="ml-1">{fmtFecha(fecha)}</span>}
                              </div>
                            )
                          })}
                        </div>

                        {/* Links */}
                        <div className="flex gap-3 flex-wrap">
                          {p.documento_url && (
                            <a href={p.documento_url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold hover:underline" style={{ color: 'var(--org-primary)' }}>
                              <svg className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>{p.documento_nombre || 'Documento'}
                            </a>
                          )}
                          {p.diagrama_url && (
                            <a href={p.diagrama_url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-purple-600 hover:underline">
                              <svg className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>{p.diagrama_nombre || 'Diagrama de flujo'}
                            </a>
                          )}
                          {p.video_url && (
                            <a href={p.video_url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-red-500 hover:underline">
                              <svg className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>{p.video_titulo || 'Video capacitación'}
                            </a>
                          )}
                        </div>

                        {p.observacion && <p className="text-[10px] text-slate mt-2 italic">{p.observacion}</p>}

                        {/* Actions */}
                        {ce && (
                          <div className="flex gap-2 mt-3 pt-2 border-t border-[#F1F5F9]">
                            <button onClick={() => openEdit(p)} className="text-[10px] font-bold hover:underline" style={{ color: 'var(--org-primary)' }}>Editar</button>
                            <button onClick={async () => { if (confirm('Eliminar?')) { await remove(p.id); toast('Eliminado') } }} className="text-[10px] font-bold text-red-500 hover:underline">Eliminar</button>
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
      )}

      {/* ══ MODAL ══ */}
      <Modal open={!!modal} onClose={() => setModal(null)}
        title={modal === 'new' ? 'Nuevo procedimiento' : 'Editar procedimiento'}
        footer={<><div className="flex-1" /><Btn onClick={() => setModal(null)}>Cancelar</Btn><Btn variant="primary" onClick={handleSave}>Guardar</Btn></>}>
        <Row2>
          <Field label="Nombre">
            <Input value={form.nombre || ''} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Control de Avance Físico" />
          </Field>
          <Field label="Código">
            <Input value={form.codigo || ''} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="Ej: OBR-001" />
          </Field>
        </Row2>
        <Row2>
          <Field label="Tipo">
            <Select value={form.tipo || 'procedimiento'} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as ProcTipo }))}>
              {PROC_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
          <Field label="Estado">
            <Select value={form.estado || 'necesidad'} onChange={e => setForm(f => ({ ...f, estado: e.target.value as ProcEstado }))}>
              {PROC_ETAPAS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
            </Select>
          </Field>
        </Row2>
        <Row2>
          <Field label="Responsable">
            <UserSelect value={form.responsable || ''} onChange={v => setForm(f => ({ ...f, responsable: v }))} placeholder="Responsable" />
          </Field>
          <Field label="Versión">
            <Input value={form.version || '1.0'} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="1.0" />
          </Field>
        </Row2>
        <Field label="Descripción">
          <Input value={form.descripcion || ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción del procedimiento" />
        </Field>

        <Divider label="Fechas por etapa" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FECHA_FIELDS.map(f => (
            <Field key={f.key} label={f.label}>
              <Input type="date" value={(form[f.key as keyof typeof form] as string) || ''} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value || null }))} />
            </Field>
          ))}
        </div>

        <Divider label="Documentos y recursos" />

        {/* Documento — upload */}
        <Field label="Documento del procedimiento (PDF, Word)">
          {form.documento_url ? (
            <div className="flex items-center gap-2 px-3 py-2 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC]">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
              <a href={form.documento_url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium hover:underline flex-1 truncate" style={{ color: 'var(--org-primary)' }}>{form.documento_nombre || 'Documento'}</a>
              <button type="button" onClick={() => setForm(f => ({ ...f, documento_url: '', documento_nombre: '' }))} className="text-[10px] text-red-400 hover:text-red-600">✕</button>
            </div>
          ) : (
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-[#CBD5E1] rounded-lg cursor-pointer hover:border-cobalt hover:bg-[#F8FAFC] transition-colors">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>
              <span className="text-[12px] text-[#9CA3AF]">{uploading ? 'Subiendo...' : typeof modal === 'object' && modal !== null ? 'Adjuntar documento' : 'Guardar primero para adjuntar'}</span>
              {typeof modal === 'object' && modal !== null && (
                <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" disabled={uploading} onChange={async e => {
                  const f = e.target.files?.[0]; if (!f || typeof modal !== 'object' || !modal) return
                  setUploading(true)
                  const { url, nombre } = await upload(f, modal.id, 'documento')
                  setForm(prev => ({ ...prev, documento_url: url, documento_nombre: nombre }))
                  setUploading(false)
                }} />
              )}
            </label>
          )}
        </Field>

        {/* Diagrama de flujo — upload */}
        <Field label="Diagrama de flujo (PDF, imagen)">
          {form.diagrama_url ? (
            <div className="flex items-center gap-2 px-3 py-2 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC]">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
              <a href={form.diagrama_url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium text-purple-600 hover:underline flex-1 truncate">{form.diagrama_nombre || 'Diagrama'}</a>
              <button type="button" onClick={() => setForm(f => ({ ...f, diagrama_url: '', diagrama_nombre: '' }))} className="text-[10px] text-red-400 hover:text-red-600">✕</button>
            </div>
          ) : (
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-[#CBD5E1] rounded-lg cursor-pointer hover:border-cobalt hover:bg-[#F8FAFC] transition-colors">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>
              <span className="text-[12px] text-[#9CA3AF]">{uploading ? 'Subiendo...' : typeof modal === 'object' && modal !== null ? 'Adjuntar diagrama' : 'Guardar primero para adjuntar'}</span>
              {typeof modal === 'object' && modal !== null && (
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.svg,.webp" className="hidden" disabled={uploading} onChange={async e => {
                  const f = e.target.files?.[0]; if (!f || typeof modal !== 'object' || !modal) return
                  setUploading(true)
                  const { url, nombre } = await upload(f, modal.id, 'diagrama')
                  setForm(prev => ({ ...prev, diagrama_url: url, diagrama_nombre: nombre }))
                  setUploading(false)
                }} />
              )}
            </label>
          )}
        </Field>

        {/* Video — solo URL */}
        <Row2>
          <Field label="Video capacitacion (URL)">
            <Input value={form.video_url || ''} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://youtu.be/..." />
          </Field>
          <Field label="Titulo del video">
            <Input value={form.video_titulo || ''} onChange={e => setForm(f => ({ ...f, video_titulo: e.target.value }))} placeholder="Nombre del video" />
          </Field>
        </Row2>
        <Field label="Observaciones">
          <Input value={form.observacion || ''} onChange={e => setForm(f => ({ ...f, observacion: e.target.value }))} placeholder="Notas" />
        </Field>
      </Modal>
    </div>
  )
}
