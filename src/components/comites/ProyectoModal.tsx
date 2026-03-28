'use client'
import { useState, useEffect } from 'react'
import Modal, { Field, Input, Select, Row2, Divider, Btn } from './Modal'
import type { Proyecto, ProyectoEstado, TipoProyecto } from '@/lib/types'
import { ESTADO_LABELS, ESTADO_COLORS, EMPTY_PROYECTO, TIPO_PROYECTO_LABELS } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (p: Omit<Proyecto, 'id'> & { id?: string }) => Promise<boolean>
  proyecto: Proyecto | null
  equipoNames?: string[]
}

const ESTADOS_ORDER: ProyectoEstado[] = [
  'en_evaluacion', 'en_estudio', 'en_aclaracion', 'sin_informacion',
  'adjudicado', 'activo', 'no_adjudicado', 'excusa', 'cerrado_saldo', 'cerrado',
]

function showEstFields(e: ProyectoEstado) {
  return ['en_evaluacion', 'en_estudio', 'en_aclaracion', 'sin_informacion', 'no_adjudicado', 'excusa'].includes(e)
}

function showAdjFields(e: ProyectoEstado) {
  return ['adjudicado', 'activo', 'cerrado_saldo', 'cerrado'].includes(e)
}

export default function ProyectoModal({ open, onClose, onSave, proyecto, equipoNames = [] }: Props) {
  const [form, setForm] = useState<Omit<Proyecto, 'id'> & { id?: string }>(EMPTY_PROYECTO)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (proyecto) {
      setForm({ ...proyecto })
    } else {
      setForm({ ...EMPTY_PROYECTO })
    }
  }, [proyecto, open])

  function upd<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function updNum(key: keyof typeof form, val: string) {
    upd(key, (parseFloat(val) || 0) as never)
  }

  async function handleSave() {
    if (!form.nombre.trim()) return
    setSaving(true)
    const ok = await onSave(form)
    setSaving(false)
    if (ok) onClose()
  }

  const color = ESTADO_COLORS[form.estado as ProyectoEstado] || '#64748B'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={proyecto ? 'Editar' : 'Nuevo'}
      accent="proyecto"
      footer={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Btn>
        </>
      }
    >
      <Row2>
        <Field label="Nombre del proyecto">
          <Input
            value={form.nombre}
            onChange={e => upd('nombre', e.target.value)}
            placeholder="Ej: PET CT Clínica Alemana"
          />
        </Field>
        <Field label="Tipo de proyecto">
          <Select
            value={form.tipo_proyecto || 'obra'}
            onChange={e => upd('tipo_proyecto', e.target.value as TipoProyecto)}
          >
            {Object.entries(TIPO_PROYECTO_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </Field>
      </Row2>

      <Row2>
        <Field label="Mandante">
          <Input
            value={form.mandante || ''}
            onChange={e => upd('mandante', e.target.value)}
            placeholder="Ej: Clínica Alemana"
          />
        </Field>
        <Field label="Administrador de obra">
          <Select
            value={form.administrador || ''}
            onChange={e => upd('administrador', e.target.value)}
          >
            <option value="">— Sin asignar —</option>
            {equipoNames.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </Select>
        </Field>
      </Row2>

      <Row2>
        <Field label="Fecha inicio">
          <Input
            type="date"
            value={form.fecha_inicio || ''}
            onChange={e => upd('fecha_inicio', e.target.value || null)}
          />
        </Field>
        <Field label="Fecha término contractual">
          <Input
            type="date"
            value={form.fecha_termino || ''}
            onChange={e => upd('fecha_termino', e.target.value || null)}
          />
        </Field>
      </Row2>

      {showAdjFields(form.estado as ProyectoEstado) && (
        <Field label="Fecha término real (Asbuilt)">
          <Input
            type="date"
            value={form.fecha_fin_asbuilt || ''}
            onChange={e => upd('fecha_fin_asbuilt', e.target.value || null)}
          />
          {form.fecha_termino && form.fecha_fin_asbuilt && new Date(form.fecha_fin_asbuilt) > new Date(form.fecha_termino) && (
            <p className="text-[10px] mt-1 text-amber font-semibold">
              ⚠ {Math.ceil((new Date(form.fecha_fin_asbuilt).getTime() - new Date(form.fecha_termino).getTime()) / 86400000)} días sobre plazo contractual — se usará esta fecha para proyectar equipos y flujos
            </p>
          )}
        </Field>
      )}

      <Field label="Estado">
        <Select
          value={form.estado}
          onChange={e => upd('estado', e.target.value as ProyectoEstado)}
        >
          {ESTADOS_ORDER.map(e => (
            <option key={e} value={e}>{ESTADO_LABELS[e]}</option>
          ))}
        </Select>
        <div className="h-1.5 rounded mt-1.5 transition-colors" style={{ background: color }} />
      </Field>

      {/* Estudio / Licitación */}
      {showEstFields(form.estado as ProyectoEstado) && (
        <>
          <Divider label="Datos de Estudio / Licitación" />
          <Row2>
            <Field label="Monto licitación ($MM)">
              <Input
                type="number"
                value={form.monto_licitacion || ''}
                onChange={e => updNum('monto_licitacion', e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Margen estudio (%)">
              <Input
                type="number"
                value={form.margen_estudio_pct || ''}
                onChange={e => updNum('margen_estudio_pct', e.target.value)}
                placeholder="0"
              />
            </Field>
          </Row2>
          <Field label="Fecha última oferta">
            <Input
              type="date"
              value={form.fecha_oferta || ''}
              onChange={e => upd('fecha_oferta', e.target.value || null)}
            />
          </Field>
          <Field label="Observación / situación">
            <Input
              value={form.observacion || ''}
              onChange={e => upd('observacion', e.target.value)}
              placeholder="Ej: En aclaración 1, esperando respuesta"
            />
          </Field>
        </>
      )}

      {/* Adjudicación */}
      {showAdjFields(form.estado as ProyectoEstado) && (
        <>
          <Divider label="Adjudicación" />
          <Row2>
            <Field label="Presupuesto de venta ($MM)">
              <Input
                type="number"
                value={form.monto_adjudicado || ''}
                onChange={e => updNum('monto_adjudicado', e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Meta margen ($MM)">
              <Input
                type="number"
                value={form.meta_margen || ''}
                onChange={e => updNum('meta_margen', e.target.value)}
                placeholder="0"
              />
            </Field>
          </Row2>
          <Field label="Observación / situación">
            <Input
              value={form.observacion || ''}
              onChange={e => upd('observacion', e.target.value)}
              placeholder="Notas del proyecto"
            />
          </Field>
          <p className="text-[10px] text-slate-400 italic -mt-1 mb-2">
            Los datos financieros detallados y saldos se gestionan en el comité de Obras
          </p>

          {/* Referencia de estudio (colapsable) */}
          {form.monto_licitacion > 0 && (
            <div className="bg-slate-50 border border-[#E2E8F0] rounded-lg p-3 mt-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Datos de estudio (referencia)</p>
              <div className="flex gap-4 text-[11px] text-slate-500">
                <span>Monto licit: <strong className="text-ink">${form.monto_licitacion} MM</strong></span>
                <span>Margen est: <strong className="text-ink">{form.margen_estudio_pct}%</strong></span>
                {form.fecha_oferta && <span>Oferta: <strong className="text-ink">{form.fecha_oferta}</strong></span>}
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
