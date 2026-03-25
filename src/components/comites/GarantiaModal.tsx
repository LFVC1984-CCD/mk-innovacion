'use client'
import { useState, useEffect } from 'react'
import Modal, { Field, Input, Select, Row2, Row3, Divider, Btn } from './Modal'
import { ENTIDADES, INSTRUMENTOS, DIVISAS, UF_REF } from '@/lib/comites/data'
import type { Garantia, Divisa } from '@/lib/comites/data'

const TIPOS_GARANTIA = ['Seriedad de la oferta', 'Fiel cumplimiento', 'Anticipo', 'Correcta ejecución', 'Otra']
const ESTADOS = ['Solicitada', 'Vigente', 'Por vencer', 'En renovación', 'Vencida', 'Devuelta']
const PROYECTOS = ['Estadio Nacional', 'Costanera Center', 'Hospital Talca', 'Torre Apoquindo', 'Puente Maipo', 'Edificio Providencia', 'Centro Logístico', 'Mall del Sur', 'Ruta 5 Norte']

interface Props {
  open: boolean
  onClose: () => void
  editing?: Garantia | null
}

export default function GarantiaModal({ open, onClose, editing }: Props) {
  const [proyecto, setProyecto] = useState('')
  const [instrumento, setInstrumento] = useState('')
  const [tipo, setTipo] = useState('')
  const [entidad, setEntidad] = useState('')
  const [monto, setMonto] = useState('')
  const [divisa, setDivisa] = useState<Divisa>('CLP')
  const [fSolicitud, setFSolicitud] = useState('')
  const [fInicio, setFInicio] = useState('')
  const [fVencimiento, setFVencimiento] = useState('')
  const [estado, setEstado] = useState('Solicitada')
  const [nDoc, setNDoc] = useState('')
  const [obs, setObs] = useState('')

  useEffect(() => {
    if (editing) {
      setProyecto(editing.proyecto)
      setInstrumento(editing.instrumento)
      setTipo(editing.tipo)
      setEntidad(editing.entidad)
      setMonto(String(editing.monto))
      setFInicio(editing.fechaInicio)
      setFVencimiento(editing.fechaVencimiento)
      setEstado(editing.estado)
    } else {
      setProyecto(''); setInstrumento(''); setTipo(''); setEntidad(''); setMonto(''); setDivisa('CLP')
      setFSolicitud(''); setFInicio(''); setFVencimiento(''); setEstado('Solicitada'); setNDoc(''); setObs('')
    }
  }, [editing, open])

  const isEdit = !!editing

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar' : 'Nueva'}
      accent="Garantía"
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={onClose}>{isEdit ? 'Guardar cambios' : 'Crear garantía'}</Btn></>}
    >
      <Field label="Proyecto asociado">
        <Select value={proyecto} onChange={e => setProyecto(e.target.value)}>
          <option value="">— Seleccionar proyecto —</option>
          {PROYECTOS.map(p => <option key={p} value={p}>{p}</option>)}
        </Select>
      </Field>

      <Row2>
        <Field label="Instrumento">
          <Select value={instrumento} onChange={e => setInstrumento(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {INSTRUMENTOS.map(i => <option key={i.nombre} value={i.nombre}>{i.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Tipo de garantía">
          <Select value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {TIPOS_GARANTIA.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
      </Row2>

      <Field label="Entidad">
        <Select value={entidad} onChange={e => setEntidad(e.target.value)}>
          <option value="">— Seleccionar entidad —</option>
          {ENTIDADES.map(e => <option key={e.nombre} value={e.nombre}>{e.nombre} ({e.tipo})</option>)}
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
        {divisa === 'UF' && monto && (
          <Field label={`Equivalente CLP (UF $${UF_REF.toLocaleString('es-CL')})`}>
            <div className="px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-[13px] bg-[#F8FAFC] text-slate font-semibold">
              ${(parseFloat(monto) * UF_REF).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
            </div>
          </Field>
        )}
        {divisa !== 'UF' && <div />}
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
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
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
