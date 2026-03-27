'use client'
import { useState, useEffect } from 'react'
import Modal, { Field, Input, Select, Btn } from './Modal'
import type { Miembro, MiembroEstado, Proyecto } from '@/lib/types'
import { EMPTY_MIEMBRO, CARGOS_OBRA } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (m: Omit<Miembro, 'id' | 'proyecto_nombre'> & { id?: string }) => Promise<boolean>
  miembro: Miembro | null
  proyectos: Proyecto[]
}

export default function MiembroModal({ open, onClose, onSave, miembro, proyectos }: Props) {
  const [form, setForm] = useState<Omit<Miembro, 'id' | 'proyecto_nombre'> & { id?: string }>(EMPTY_MIEMBRO)
  const [saving, setSaving] = useState(false)
  const [cargoOtro, setCargoOtro] = useState('')

  useEffect(() => {
    if (miembro) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { proyecto_nombre, ...rest } = miembro
      setForm(rest)
      // If cargo is not in the standard list, set it as "Otro"
      if (rest.cargo && !CARGOS_OBRA.includes(rest.cargo as typeof CARGOS_OBRA[number])) {
        setCargoOtro(rest.cargo)
      } else {
        setCargoOtro('')
      }
    } else {
      setForm({ ...EMPTY_MIEMBRO })
      setCargoOtro('')
    }
  }, [miembro, open])

  function upd<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    if (!form.nombre.trim()) return
    setSaving(true)
    const ok = await onSave(form)
    setSaving(false)
    if (ok) onClose()
  }

  // Only show active projects (not closed)
  const activeProjects = proyectos.filter(p => !['cerrado'].includes(p.estado))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={miembro ? 'Editar' : 'Nuevo'}
      accent="profesional"
      footer={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Btn>
        </>
      }
    >
      <Field label="Nombre completo">
        <Input
          value={form.nombre}
          onChange={e => upd('nombre', e.target.value)}
          placeholder="Ej: Juan Pérez"
        />
      </Field>

      <Field label="Cargo en obra / proyecto">
        <Select
          value={CARGOS_OBRA.includes(form.cargo as typeof CARGOS_OBRA[number]) ? form.cargo : (form.cargo ? 'Otro' : '')}
          onChange={e => {
            const val = e.target.value
            if (val === 'Otro') {
              upd('cargo', cargoOtro || 'Otro')
            } else {
              upd('cargo', val)
              setCargoOtro('')
            }
          }}
        >
          <option value="">— Seleccionar cargo —</option>
          {CARGOS_OBRA.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        {(form.cargo === 'Otro' || (form.cargo && !CARGOS_OBRA.includes(form.cargo as typeof CARGOS_OBRA[number]))) && (
          <Input
            value={cargoOtro || (form.cargo !== 'Otro' ? form.cargo : '')}
            onChange={e => { setCargoOtro(e.target.value); upd('cargo', e.target.value || 'Otro') }}
            placeholder="Especificar cargo..."
            className="mt-1.5"
          />
        )}
      </Field>

      <Field label="Proyecto asignado">
        <Select
          value={form.proyecto_id || ''}
          onChange={e => upd('proyecto_id', e.target.value || null)}
        >
          <option value="">— Sin proyecto (disponible) —</option>
          {activeProjects.map(p => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </Select>
      </Field>

      <Field label="Estado">
        <Select
          value={form.estado}
          onChange={e => upd('estado', e.target.value as MiembroEstado)}
        >
          <option value="activo">Activo</option>
          <option value="disponible">Disponible (sin proyecto)</option>
          <option value="inactivo">Inactivo</option>
        </Select>
      </Field>

      <Field label="Contacto (opcional)">
        <Input
          value={form.contacto || ''}
          onChange={e => upd('contacto', e.target.value)}
          placeholder="Teléfono o email"
        />
      </Field>
    </Modal>
  )
}
