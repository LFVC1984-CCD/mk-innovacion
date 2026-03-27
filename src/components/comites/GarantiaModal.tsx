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
const ESTADOS = [
  { value: 'solicitada', label: 'Solicitada' },
  { value: 'vigente', label: 'Vigente' },
  { value: 'por_vencer', label: 'Por vencer' },
  { value: 'en_renovacion', label: 'En renovación' },
  { value: 'vencida', label: 'Vencida' },
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
}

export default function GarantiaModal({ open, onClose, editing, proyectos, entidades, onSave, onDelete }: Props) {
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
    } else {
      setProyectoId(''); setInstrumento(''); setTipo(''); setEntidad(''); setMonto(''); setDivisa('CLP')
      setFSolicitud(''); setFInicio(''); setFVencimiento(''); setEstado('solicitada'); setNDoc(''); setObs('')
    }
  }, [editing, open])

  const isEdit = !!editing

  async function handleSave() {
    setSaving(true)
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
    }, editing?.id)
    setSaving(false)
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
    </Modal>
  )
}
