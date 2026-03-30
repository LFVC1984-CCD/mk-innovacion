'use client'
import { useState, useEffect } from 'react'
import Modal, { Field, Input, Select, Row2, Row3, Divider, Btn } from './Modal'
import { DIVISAS, UF_REF } from '@/lib/comites/data'
import type { Divisa } from '@/lib/comites/data'
import type { GarantiaInput, GarantiaRow, EntidadComputed, ProyectoOption } from '@/lib/comites/use-garantias'

const TIPOS_GARANTIA = [
  { value: 'seriedad_oferta', label: 'Seriedad de la oferta' },
  { value: 'fiel_cumplimiento', label: 'Fiel cumplimiento' },
  { value: 'anticipo', label: 'Anticipo' },
  { value: 'correcta_ejecucion', label: 'Correcta ejecución' },
  { value: 'otra', label: 'Otra' },
]
// por_vencer y vencida son automáticos (calculados por fecha), no se seleccionan manual
const ESTADOS = [
  { value: 'solicitada', label: 'Solicitada' },
  { value: 'vigente', label: 'Vigente (documento gestionado)' },
  { value: 'en_renovacion', label: 'En renovación' },
  { value: 'devuelta', label: 'Devuelta' },
]
const INSTRUMENTOS = [
  { value: 'boleta_garantia', label: 'Boleta de garantía' },
  { value: 'poliza_garantia', label: 'Póliza' },
  { value: 'credito_comercial', label: 'Crédito comercial' },
  { value: 'factoring', label: 'Factoring' },
]

interface Props {
  open: boolean
  onClose: () => void
  editing?: (GarantiaRow & { dias: number | null; proyecto: string }) | null
  proyectos: ProyectoOption[]
  entidades: EntidadComputed[]
  onSave: (input: GarantiaInput, id?: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onUpload?: (file: File, garantiaId: string, tipo: 'documento' | 'comprobante') => Promise<string>
  defaultEstado?: string
}

export default function GarantiaModal({ open, onClose, editing, proyectos, entidades, onSave, onDelete, onUpload, defaultEstado }: Props) {
  const [proyectoId, setProyectoId] = useState('')
  const [instrumento, setInstrumento] = useState('')
  const [tipo, setTipo] = useState('')
  const [entidad, setEntidad] = useState('')
  const [monto, setMonto] = useState('')
  const [divisa, setDivisa] = useState<Divisa>('CLP')
  const [fSolicitud, setFSolicitud] = useState('')
  const [fInicio, setFInicio] = useState('')
  const [fVencimiento, setFVencimiento] = useState('')
  const [estado, setEstado] = useState('solicitada')
  const [nDoc, setNDoc] = useState('')
  const [obs, setObs] = useState('')
  const [docUrl, setDocUrl] = useState('')
  const [docNombre, setDocNombre] = useState('')
  const [compUrl, setCompUrl] = useState('')
  const [compNombre, setCompNombre] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editing) {
      setProyectoId(editing.proyecto_id || '')
      setInstrumento(editing.instrumento)
      setTipo(editing.tipo)
      setEntidad(editing.entidad)
      setMonto(String(editing.monto))
      setFSolicitud(editing.fecha_solicitud || '')
      setFInicio(editing.fecha_inicio || '')
      setFVencimiento(editing.fecha_vencimiento || '')
      setEstado(editing.estado)
      setObs(editing.observacion || '')
      setDocUrl(editing.documento_url || '')
      setDocNombre(editing.documento_nombre || '')
      setCompUrl(editing.comprobante_url || '')
      setCompNombre(editing.comprobante_nombre || '')
    } else {
      setProyectoId(''); setInstrumento(''); setTipo(''); setEntidad(''); setMonto(''); setDivisa('CLP')
      setFSolicitud(''); setFInicio(''); setFVencimiento(''); setEstado(defaultEstado || 'solicitada'); setNDoc(''); setObs('')
      setDocUrl(''); setDocNombre(''); setCompUrl(''); setCompNombre('')
    }
  }, [editing, open, defaultEstado])

  async function handleFileUpload(file: File, tipo: 'documento' | 'comprobante') {
    if (!onUpload || !editing?.id) return
    setUploading(true)
    try {
      const url = await onUpload(file, editing.id, tipo)
      if (tipo === 'documento') { setDocUrl(url); setDocNombre(file.name) }
      else { setCompUrl(url); setCompNombre(file.name) }
    } catch { /* toast handled upstream */ }
    setUploading(false)
  }

  const isEdit = !!editing

  const [errors, setErrors] = useState<string[]>([])

  async function handleSave() {
    const errs: string[] = []
    if (!instrumento) errs.push('Selecciona un instrumento')
    if (!tipo) errs.push('Selecciona un tipo de garantía')
    if (!entidad) errs.push('Selecciona una entidad')
    if (!monto || Number(monto) <= 0) errs.push('Ingresa un monto válido')
    if (errs.length > 0) { setErrors(errs); return }
    setErrors([])
    setSaving(true)
    try {
      await onSave({
        proyecto_id: proyectoId || null,
        tipo,
        instrumento,
        entidad,
        monto: Number(monto) || 0,
        divisa,
        fecha_solicitud: fSolicitud || null,
        fecha_inicio: fInicio || null,
        fecha_vencimiento: fVencimiento || null,
        estado,
        observacion: obs,
        documento_url: docUrl,
        documento_nombre: docNombre,
        comprobante_url: compUrl,
        comprobante_nombre: compNombre,
      }, editing?.id)
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Error al guardar'])
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editing || !confirm('¿Eliminar esta garantía?')) return
    setSaving(true)
    await onDelete(editing.id)
    setSaving(false)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar' : 'Nueva'}
      accent="Garantía"
      footer={
        <>
          {isEdit && <Btn variant="danger" onClick={handleDelete} disabled={saving}>Eliminar</Btn>}
          <div className="flex-1" />
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear garantía'}</Btn>
        </>
      }
    >
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
          {errors.map((e, i) => <p key={i} className="text-red-600 text-[13px]">{e}</p>)}
        </div>
      )}
      <Field label="Proyecto asociado">
        <Select value={proyectoId} onChange={e => setProyectoId(e.target.value)}>
          <option value="">— Seleccionar proyecto —</option>
          {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </Select>
      </Field>

      <Row2>
        <Field label="Instrumento">
          <Select value={instrumento} onChange={e => setInstrumento(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {INSTRUMENTOS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </Select>
        </Field>
        <Field label="Tipo de garantía">
          <Select value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {TIPOS_GARANTIA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </Field>
      </Row2>

      <Field label="Entidad">
        <Select value={entidad} onChange={e => setEntidad(e.target.value)}>
          <option value="">— Seleccionar entidad —</option>
          {entidades.map(e => <option key={e.id} value={e.nombre}>{e.nombre} ({e.tipo})</option>)}
        </Select>
      </Field>

      <Row3>
        <Field label="Divisa">
          <Select value={divisa} onChange={e => setDivisa(e.target.value as Divisa)}>
            {DIVISAS.map(d => <option key={d} value={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label={divisa === 'UF' ? 'Monto (UF)' : `Monto (${divisa})`}>
          <Input type="number" placeholder="0" value={monto} onChange={e => setMonto(e.target.value)} />
        </Field>
        {divisa === 'UF' && monto ? (
          <Field label={`Equivalente CLP (UF $${UF_REF.toLocaleString('es-CL')})`}>
            <div className="px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-[13px] bg-[#F8FAFC] text-slate font-semibold">
              ${(parseFloat(monto) * UF_REF).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
            </div>
          </Field>
        ) : <div />}
      </Row3>

      <Divider label="Fechas" />
      <Row3>
        <Field label="Fecha solicitud"><Input type="date" value={fSolicitud} onChange={e => setFSolicitud(e.target.value)} /></Field>
        <Field label="Fecha inicio"><Input type="date" value={fInicio} onChange={e => setFInicio(e.target.value)} /></Field>
        <Field label="Fecha vencimiento"><Input type="date" value={fVencimiento} onChange={e => setFVencimiento(e.target.value)} /></Field>
      </Row3>

      <Row2>
        <Field label="Estado">
          <Select value={estado} onChange={e => setEstado(e.target.value)}>
            {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </Select>
        </Field>
        <Field label="N° documento">
          <Input type="text" placeholder="Ej: BG-2026-0042" value={nDoc} onChange={e => setNDoc(e.target.value)} />
        </Field>
      </Row2>

      <Field label="Observaciones">
        <Input type="text" placeholder="Notas adicionales" value={obs} onChange={e => setObs(e.target.value)} />
      </Field>

      <Divider label="Documentos" />

      {/* Documento de garantía — solo adjuntable cuando estado = vigente (Finanzas ya gestionó) */}
      <Field label="Documento de garantia (PDF, foto del instrumento)">
        {docUrl ? (
          <div className="flex items-center gap-2 px-3 py-2 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC]">
            <span className="text-[11px]">📄</span>
            <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium hover:underline flex-1 truncate" style={{ color: 'var(--org-primary)' }}>{docNombre || 'Ver documento'}</a>
            {estado === 'vigente' && <button onClick={() => { setDocUrl(''); setDocNombre('') }} className="text-[10px] text-red-400 hover:text-red-600">✕</button>}
          </div>
        ) : estado === 'vigente' && isEdit ? (
          <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-[#CBD5E1] rounded-lg cursor-pointer hover:border-cobalt hover:bg-[#F8FAFC] transition-colors">
            <span className="text-[11px]">📎</span>
            <span className="text-[12px] text-[#9CA3AF]">{uploading ? 'Subiendo...' : 'Adjuntar documento de garantia'}</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'documento') }} />
          </label>
        ) : (
          <p className="text-[11px] text-[#9CA3AF] px-3 py-2">
            {estado === 'solicitada' ? 'Disponible cuando el estado sea Vigente (garantia gestionada)' :
             estado === 'devuelta' ? 'Garantia devuelta' : 'Sin documento adjunto'}
          </p>
        )}
      </Field>

      {/* Comprobante de entrega/retiro — solo adjuntable cuando estado = devuelta */}
      <Field label="Comprobante de entrega o retiro (correo, foto, PDF)">
        {compUrl ? (
          <div className="flex items-center gap-2 px-3 py-2 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC]">
            <span className="text-[11px]">📋</span>
            <a href={compUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium hover:underline flex-1 truncate" style={{ color: 'var(--org-primary)' }}>{compNombre || 'Ver comprobante'}</a>
            <button onClick={() => { setCompUrl(''); setCompNombre('') }} className="text-[10px] text-red-400 hover:text-red-600">✕</button>
          </div>
        ) : estado === 'devuelta' && isEdit ? (
          <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-[#CBD5E1] rounded-lg cursor-pointer hover:border-cobalt hover:bg-[#F8FAFC] transition-colors">
            <span className="text-[11px]">📎</span>
            <span className="text-[12px] text-[#9CA3AF]">{uploading ? 'Subiendo...' : 'Adjuntar evidencia de devolucion'}</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.eml" className="hidden" disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'comprobante') }} />
          </label>
        ) : (
          <p className="text-[11px] text-[#9CA3AF] px-3 py-2">
            {estado !== 'devuelta' ? 'Disponible al marcar como Devuelta (fondos recuperados)' : 'Sin comprobante'}
          </p>
        )}
      </Field>
    </Modal>
  )
}
