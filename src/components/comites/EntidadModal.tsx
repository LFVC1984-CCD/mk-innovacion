'use client'
import { useState, useEffect } from 'react'
import Modal, { Field, Input, Select, Row2, Btn } from './Modal'
import type { EntidadComputed, EntidadInput } from '@/lib/comites/use-garantias'

interface Props {
  open: boolean
  onClose: () => void
  editing?: EntidadComputed | null
  onSave: (input: EntidadInput, id?: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function EntidadModal({ open, onClose, editing, onSave, onDelete }: Props) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('banco')
  const [contacto, setContacto] = useState('')
  const [obs, setObs] = useState('')
  const [tasaInteres, setTasaInteres] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editing) {
      setNombre(editing.nombre)
      setTipo(editing.tipo)
      setContacto(editing.contacto || '')
      setObs(editing.observacion || '')
      setTasaInteres(editing.tasa_interes ? String(editing.tasa_interes) : '')
    } else {
      setNombre(''); setTipo('banco'); setContacto(''); setObs(''); setTasaInteres('')
    }
  }, [editing, open])

  const isEdit = !!editing

  const [errors, setErrors] = useState<string[]>([])

  async function handleSave() {
    const errs: string[] = []
    if (!nombre.trim()) errs.push('El nombre de la entidad es obligatorio')
    if (errs.length > 0) { setErrors(errs); return }
    setErrors([])
    setSaving(true)
    try {
      await onSave({ nombre: nombre.trim(), tipo, contacto, observacion: obs, tasa_interes: parseFloat(tasaInteres) || 0 }, editing?.id)
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Error al guardar'])
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editing || !confirm('¿Eliminar esta entidad?')) return
    setSaving(true)
    await onDelete(editing.id)
    setSaving(false)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar' : 'Nueva'}
      accent="Entidad"
      footer={
        <>
          {isEdit && <Btn variant="danger" onClick={handleDelete} disabled={saving}>Eliminar</Btn>}
          <div className="flex-1" />
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear entidad'}</Btn>
        </>
      }
    >
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
          {errors.map((e, i) => <p key={i} className="text-red-600 text-xs">{e}</p>)}
        </div>
      )}
      <Row2>
        <Field label="Nombre de la entidad">
          <Input type="text" placeholder="Ej: BCI, Mapfre, Santander" value={nombre} onChange={e => setNombre(e.target.value)} />
        </Field>
        <Field label="Tipo">
          <Select value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="banco">Banco</option>
            <option value="aseguradora">Aseguradora</option>
          </Select>
        </Field>
      </Row2>

      <Row2>
        <Field label="Contacto (opcional)">
          <Input type="text" placeholder="Nombre del ejecutivo o email" value={contacto} onChange={e => setContacto(e.target.value)} />
        </Field>
        <Field label="Tasa de interés anual (%)">
          <Input type="number" step="0.01" placeholder="Ej: 1.35" value={tasaInteres} onChange={e => setTasaInteres(e.target.value)} />
        </Field>
      </Row2>
      <Field label="Observaciones">
        <Input type="text" placeholder="Notas adicionales" value={obs} onChange={e => setObs(e.target.value)} />
      </Field>
    </Modal>
  )
}
