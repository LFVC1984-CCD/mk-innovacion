'use client'
import { useState, useEffect } from 'react'
import Modal, { Field, Input, Divider, ChipSelect, Btn } from './Modal'
import { ENTIDADES } from '@/lib/comites/data'
import type { Instrumento } from '@/lib/comites/data'

interface Props {
  open: boolean
  onClose: () => void
  editing?: Instrumento | null
}

const TIPOS_GARANTIA = ['Seriedad de la oferta', 'Fiel cumplimiento', 'Anticipo', 'Correcta ejecución', 'Otra']

export default function InstrumentoModal({ open, onClose, editing }: Props) {
  const [nombre, setNombre] = useState('')
  const [desc, setDesc] = useState('')
  const [tipos, setTipos] = useState<string[]>([])
  const [entidades, setEntidades] = useState<string[]>([])

  useEffect(() => {
    if (editing) {
      setNombre(editing.nombre)
      setTipos(editing.tipos)
      setEntidades(editing.entidades)
    } else {
      setNombre(''); setDesc(''); setTipos([]); setEntidades([])
    }
  }, [editing, open])

  const isEdit = !!editing

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar' : 'Nuevo'}
      accent="Instrumento"
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={onClose}>{isEdit ? 'Guardar cambios' : 'Crear instrumento'}</Btn></>}
    >
      <Field label="Nombre del instrumento">
        <Input type="text" placeholder="Ej: Boleta de garantía, Póliza de seguro" value={nombre} onChange={e => setNombre(e.target.value)} />
      </Field>
      <Field label="Descripción">
        <Input type="text" placeholder="Breve descripción del instrumento financiero" value={desc} onChange={e => setDesc(e.target.value)} />
      </Field>

      <Divider label="Tipos de garantía asociados" />
      <p className="text-[11px] text-slate mb-2">Para qué tipos de garantía se puede usar este instrumento</p>
      <ChipSelect options={TIPOS_GARANTIA} selected={tipos} onChange={setTipos} />

      <Divider label="Entidades que lo ofrecen" />
      <ChipSelect options={ENTIDADES.map(e => e.nombre)} selected={entidades} onChange={setEntidades} />
    </Modal>
  )
}
