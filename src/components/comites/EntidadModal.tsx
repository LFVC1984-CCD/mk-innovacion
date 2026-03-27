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
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editing) {
      setNombre(editing.nombre)
      setTipo(editing.tipo)
      setContacto(editing.contacto || '')
      setObs(editing.observacion || '')
    } else {
      setNombre(''); setTipo('banco'); setContacto(''); setObs('')
    }
  }, [editing, open])

  const isEdit = !!editing

  async function handleSave() {
    setSaving(true)
    await onSave({ nombre, tipo, contacto, observacion: obs }, editing?.id)
    setSaving(false)
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

      <Field label="Contacto (opcional)">
        <Input type="text" placeholder="Nombre del ejecutivo o email" value={contacto} onChange={e => setContacto(e.target.value)} />
      </Field>
      <Field label="Observaciones">
        <Input type="text" placeholder="Notas adicionales" value={obs} onChange={e => setObs(e.target.value)} />
      </Field>
    </Modal>
  )
}
