'use client'
import { useState, useEffect } from 'react'
import Modal, { Field, Input, Select, Row2, Divider, ChipSelect, Btn } from './Modal'
import type { Entidad } from '@/lib/comites/data'

interface Props {
  open: boolean
  onClose: () => void
  editing?: Entidad | null
}

const ALL_INSTRUMENTOS = ['Boleta de garantía', 'Póliza', 'Crédito comercial', 'Factoring']

export default function EntidadModal({ open, onClose, editing }: Props) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<'Banco' | 'Aseguradora'>('Banco')
  const [linea, setLinea] = useState('')
  const [instrumentos, setInstrumentos] = useState<string[]>([])
  const [contacto, setContacto] = useState('')
  const [obs, setObs] = useState('')

  useEffect(() => {
    if (editing) {
      setNombre(editing.nombre)
      setTipo(editing.tipo)
      setLinea(String(editing.linea))
      setInstrumentos(editing.instrumentos)
    } else {
      setNombre(''); setTipo('Banco'); setLinea(''); setInstrumentos([]); setContacto(''); setObs('')
    }
  }, [editing, open])

  const isEdit = !!editing

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar' : 'Nueva'}
      accent="Entidad"
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={onClose}>{isEdit ? 'Guardar cambios' : 'Crear entidad'}</Btn></>}
    >
      <Row2>
        <Field label="Nombre de la entidad">
          <Input type="text" placeholder="Ej: BCI, Mapfre, Santander" value={nombre} onChange={e => setNombre(e.target.value)} />
        </Field>
        <Field label="Tipo">
          <Select value={tipo} onChange={e => setTipo(e.target.value as 'Banco' | 'Aseguradora')}>
            <option value="Banco">Banco</option>
            <option value="Aseguradora">Aseguradora</option>
          </Select>
        </Field>
      </Row2>

      <Field label="Monto línea aprobada ($MM)">
        <Input type="number" placeholder="0" value={linea} onChange={e => setLinea(e.target.value)} />
      </Field>

      <Divider label="Instrumentos disponibles" />
      <p className="text-[11px] text-slate mb-2">Selecciona los instrumentos que ofrece esta entidad</p>
      <ChipSelect options={ALL_INSTRUMENTOS} selected={instrumentos} onChange={setInstrumentos} />

      <div className="mt-4" />
      <Field label="Contacto (opcional)">
        <Input type="text" placeholder="Nombre del ejecutivo o email" value={contacto} onChange={e => setContacto(e.target.value)} />
      </Field>
      <Field label="Observaciones">
        <Input type="text" placeholder="Notas adicionales" value={obs} onChange={e => setObs(e.target.value)} />
      </Field>
    </Modal>
  )
}
