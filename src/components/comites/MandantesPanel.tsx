'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMandantes } from '@/lib/comites/use-mandantes'
import type { Mandante, MandanteInput } from '@/lib/comites/use-mandantes'
import { useProjects } from '@/lib/comites/use-projects'
import { useAuth } from '@/lib/comites/hooks'
import Modal, { Field, Input, Select, Row2, Btn } from '@/components/comites/Modal'
import ViewToggle from '@/components/comites/ViewToggle'
import { toast } from '@/components/ui/Toast'

const TIPO_LABELS: Record<string, string> = { privado: 'Privado', publico: 'Publico', mixto: 'Mixto' }
const TIPO_COLORS: Record<string, string> = { privado: '#0B5ED7', publico: '#16A34A', mixto: '#D97706' }
const SEGMENTO_LABELS: Record<string, string> = {
  edificacion: 'Edificacion', infraestructura: 'Infraestructura', industrial: 'Industrial',
  mineria: 'Mineria', energia: 'Energia', otro: 'Otro',
}

export default function MandantesPanel() {
  const { mandantes, loading, save, remove } = useMandantes()
  const { projects } = useProjects()
  const { isAdmin } = useAuth()
  const [view, setView] = useState<'cards' | 'tabla'>('cards')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Mandante | null>(null)
  const [search, setSearch] = useState('')

  const filtered = mandantes.filter(m => {
    if (!search) return true
    const s = search.toLowerCase()
    return m.nombre.toLowerCase().includes(s) || (m.rut || '').toLowerCase().includes(s) || (m.contacto || '').toLowerCase().includes(s)
  })

  function proyectosDe(nombre: string) {
    return projects.filter(p => p.mandante === nombre)
  }

  function openNew() { setEditing(null); setModal(true) }
  function openEdit(m: Mandante) { setEditing(m); setModal(true) }

  async function handleSave(input: MandanteInput, id?: string) {
    try {
      await save({ ...input, id })
      setModal(false)
      toast(id ? 'Mandante actualizado' : 'Mandante creado')
    } catch { toast('Error al guardar mandante') }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id)
      setModal(false)
      toast('Mandante eliminado')
    } catch { toast('Error al eliminar') }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-cobalt border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="font-condensed text-xl font-extrabold">
            Maestro de <span className="text-cobalt">Mandantes</span>
          </h2>
          <p className="text-xs text-slate">Clientes y mandantes asociados a los proyectos</p>
        </div>
        <div className="flex gap-2 items-center">
          <input type="text" placeholder="Buscar mandante..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-48 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs outline-none focus:border-cobalt transition-colors placeholder:text-[#CBD5E1]" />
          <ViewToggle view={view} onChange={v => setView(v as typeof view)} options={['cards', 'tabla']} />
          {isAdmin && (
            <button onClick={openNew} className="bg-cobalt text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-cobalt-dark transition-colors">
              + Nuevo mandante
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-2 flex-wrap mb-4">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white">
          <span className="font-bold text-ink">{mandantes.length}</span> mandantes
        </div>
        {(['privado', 'publico', 'mixto'] as const).map(tipo => {
          const count = mandantes.filter(m => m.tipo === tipo).length
          if (!count) return null
          return (
            <div key={tipo} className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TIPO_COLORS[tipo] }} />
              {TIPO_LABELS[tipo]}: {count}
            </div>
          )
        })}
      </div>

      {/* Cards */}
      {view === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(m => {
            const proys = proyectosDe(m.nombre)
            return (
              <motion.div key={m.id} onClick={() => openEdit(m)}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                className="bg-white rounded-xl border border-[#E2E8F0] p-4 hover:shadow-md hover:border-[#CBD5E1] transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-bold text-ink">{m.nombre}</h3>
                  <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase"
                    style={{ background: TIPO_COLORS[m.tipo] + '18', color: TIPO_COLORS[m.tipo] }}>
                    {TIPO_LABELS[m.tipo]}
                  </span>
                </div>
                {m.rut && <p className="text-[11px] text-slate mb-1">RUT: {m.rut}</p>}
                <p className="text-[11px] text-slate mb-1">{SEGMENTO_LABELS[m.segmento] || m.segmento}</p>
                {m.contacto && <p className="text-[11px] text-slate">{m.contacto}</p>}
                {m.telefono && <p className="text-[11px] text-slate">{m.telefono}</p>}
                {m.email && <p className="text-[11px] text-cobalt">{m.email}</p>}
                {proys.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-[#E2E8F0]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-1">{proys.length} proyecto{proys.length > 1 ? 's' : ''}</p>
                    <div className="space-y-0.5">
                      {proys.slice(0, 4).map(p => (
                        <p key={p.id} className="text-[11px] text-ink truncate">{p.nombre}</p>
                      ))}
                      {proys.length > 4 && <p className="text-[10px] text-slate">+{proys.length - 4} mas...</p>}
                    </div>
                  </div>
                )}
                {proys.length === 0 && (
                  <p className="text-[10px] text-slate italic mt-2">Sin proyectos asociados</p>
                )}
              </motion.div>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-full bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate text-sm">
              {search ? 'Sin resultados para esta busqueda.' : 'Sin mandantes. Agrega uno con el boton + Nuevo mandante.'}
            </div>
          )}
        </div>
      )}

      {/* Tabla */}
      {view === 'tabla' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="bg-[#F1F5F9] text-[10px] font-extrabold uppercase tracking-wider text-slate">
                <th className="text-left p-3">Mandante</th>
                <th className="text-left p-3">RUT</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Segmento</th>
                <th className="text-left p-3">Contacto</th>
                <th className="text-right p-3">Proyectos</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const proys = proyectosDe(m.nombre)
                return (
                  <tr key={m.id} onClick={() => openEdit(m)} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                    <td className="p-3 font-bold">{m.nombre}</td>
                    <td className="p-3 text-slate">{m.rut || '—'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase"
                        style={{ background: TIPO_COLORS[m.tipo] + '18', color: TIPO_COLORS[m.tipo] }}>
                        {TIPO_LABELS[m.tipo]}
                      </span>
                    </td>
                    <td className="p-3 text-[11px]">{SEGMENTO_LABELS[m.segmento] || m.segmento}</td>
                    <td className="p-3 text-[11px] text-slate">{m.contacto || m.email || '—'}</td>
                    <td className="p-3 text-right font-bold">{proys.length || '—'}</td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate">Sin mandantes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <MandanteModal
        open={modal}
        onClose={() => setModal(false)}
        editing={editing}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </>
  )
}

// ── Modal ──

function MandanteModal({ open, onClose, editing, onSave, onDelete }: {
  open: boolean
  onClose: () => void
  editing: Mandante | null
  onSave: (input: MandanteInput, id?: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [nombre, setNombre] = useState('')
  const [rut, setRut] = useState('')
  const [tipo, setTipo] = useState<MandanteInput['tipo']>('privado')
  const [segmento, setSegmento] = useState<MandanteInput['segmento']>('edificacion')
  const [contacto, setContacto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [observacion, setObservacion] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const isEdit = !!editing

  // Sync form when modal opens or editing changes
  const [prevOpen, setPrevOpen] = useState(false)
  const [prevEditId, setPrevEditId] = useState<string | null>(null)
  if (open !== prevOpen || (editing?.id ?? null) !== prevEditId) {
    setPrevOpen(open)
    setPrevEditId(editing?.id ?? null)
    if (open) {
      if (editing) {
        setNombre(editing.nombre)
        setRut(editing.rut || '')
        setTipo(editing.tipo)
        setSegmento(editing.segmento)
        setContacto(editing.contacto || '')
        setTelefono(editing.telefono || '')
        setEmail(editing.email || '')
        setObservacion(editing.observacion || '')
      } else {
        setNombre(''); setRut(''); setTipo('privado'); setSegmento('edificacion')
        setContacto(''); setTelefono(''); setEmail(''); setObservacion('')
      }
      setErrors([])
    }
  }

  async function handleSave() {
    const errs: string[] = []
    if (!nombre.trim()) errs.push('Nombre es obligatorio')
    if (errs.length) { setErrors(errs); return }
    setErrors([])
    setSaving(true)
    try {
      await onSave({
        nombre: nombre.trim(),
        rut: rut.trim() || null,
        tipo,
        segmento,
        contacto: contacto.trim() || null,
        telefono: telefono.trim() || null,
        email: email.trim() || null,
        observacion: observacion.trim() || null,
      }, editing?.id)
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!editing || !confirm(`Eliminar mandante "${editing.nombre}"?`)) return
    setSaving(true)
    try { await onDelete(editing.id) } finally { setSaving(false) }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar' : 'Nuevo'}
      accent="Mandante"
      footer={
        <>
          {isEdit && <Btn variant="danger" onClick={handleDelete} disabled={saving}>Eliminar</Btn>}
          <div className="flex-1" />
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear mandante'}
          </Btn>
        </>
      }
    >
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
          {errors.map((e, i) => <p key={i} className="text-red-600 text-[13px]">{e}</p>)}
        </div>
      )}
      <Field label="Nombre">
        <Input placeholder="Nombre del mandante" value={nombre} onChange={e => setNombre(e.target.value)} />
      </Field>
      <Row2>
        <Field label="RUT">
          <Input placeholder="12.345.678-9" value={rut} onChange={e => setRut(e.target.value)} />
        </Field>
        <Field label="Tipo">
          <Select value={tipo} onChange={e => setTipo(e.target.value as MandanteInput['tipo'])}>
            <option value="privado">Privado</option>
            <option value="publico">Publico</option>
            <option value="mixto">Mixto</option>
          </Select>
        </Field>
      </Row2>
      <Row2>
        <Field label="Segmento">
          <Select value={segmento} onChange={e => setSegmento(e.target.value as MandanteInput['segmento'])}>
            <option value="edificacion">Edificacion</option>
            <option value="infraestructura">Infraestructura</option>
            <option value="industrial">Industrial</option>
            <option value="mineria">Mineria</option>
            <option value="energia">Energia</option>
            <option value="otro">Otro</option>
          </Select>
        </Field>
        <Field label="Contacto">
          <Input placeholder="Nombre del contacto" value={contacto} onChange={e => setContacto(e.target.value)} />
        </Field>
      </Row2>
      <Row2>
        <Field label="Telefono">
          <Input placeholder="+56 9 1234 5678" value={telefono} onChange={e => setTelefono(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" placeholder="contacto@empresa.cl" value={email} onChange={e => setEmail(e.target.value)} />
        </Field>
      </Row2>
      <Field label="Observacion">
        <Input placeholder="Notas adicionales" value={observacion} onChange={e => setObservacion(e.target.value)} />
      </Field>
    </Modal>
  )
}
