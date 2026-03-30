'use client'
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { usePlanInversion, ESTADO_PLAN } from '@/lib/comites/use-plan-inversion'
import type { PlanInversion, PlanInversionInput } from '@/lib/comites/use-plan-inversion'
import { useAuth } from '@/lib/comites/hooks'
import { fmtMM } from '@/lib/comites/data'
import KpiCards from '@/components/comites/KpiCards'
import Modal, { Field, Input, Select, Row2, Btn } from '@/components/comites/Modal'
import ViewToggle from '@/components/comites/ViewToggle'
import { toast } from '@/components/ui/Toast'

const SEGMENTO_LABELS: Record<string, string> = {
  edificacion: 'Edificacion', infraestructura: 'Infraestructura', industrial: 'Industrial',
  mineria: 'Mineria', energia: 'Energia', otro: 'Otro',
}

export default function PlanInversionPanel() {
  const { items, loading, save, remove } = usePlanInversion()
  const { canEdit } = useAuth()
  const ce = canEdit('estudios')
  const [view, setView] = useState<'cards' | 'tabla'>('tabla')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<PlanInversion | null>(null)
  const [filterEstado, setFilterEstado] = useState<string>('activos')

  const activos = useMemo(() => items.filter(i => i.estado !== 'descartado' && i.estado !== 'adjudicado'), [items])
  const adjudicados = useMemo(() => items.filter(i => i.estado === 'adjudicado'), [items])
  const descartados = useMemo(() => items.filter(i => i.estado === 'descartado'), [items])

  const filtered = filterEstado === 'activos' ? activos
    : filterEstado === 'adjudicados' ? adjudicados
    : filterEstado === 'descartados' ? descartados : items

  // Consolidado
  const consol = useMemo(() => {
    const activosMonto = activos.reduce((s, i) => s + i.monto_estimado, 0)
    const ponderado = activos.reduce((s, i) => s + i.monto_estimado * (i.probabilidad / 100), 0)
    const margenPond = activos.reduce((s, i) => s + i.monto_estimado * (i.probabilidad / 100) * (i.margen_esperado_pct / 100), 0)
    const adjMonto = adjudicados.reduce((s, i) => s + i.monto_estimado, 0)
    return { activosMonto, ponderado, margenPond, adjMonto, totalItems: activos.length }
  }, [activos, adjudicados])

  function openNew() { setEditing(null); setModal(true) }
  function openEdit(item: PlanInversion) { setEditing(item); setModal(true) }

  async function handleSave(input: PlanInversionInput, id?: string) {
    try {
      await save({ ...input, id })
      setModal(false)
      toast(id ? 'Oportunidad actualizada' : 'Oportunidad creada')
    } catch { toast('Error al guardar') }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id)
      setModal(false)
      toast('Oportunidad eliminada')
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
      {/* Consolidado */}
      <KpiCards items={[
        { label: 'Pipeline Bruto', value: fmtMM(consol.activosMonto), color: '#E1BA10', sub: `${consol.totalItems} oportunidad${consol.totalItems !== 1 ? 'es' : ''} activa${consol.totalItems !== 1 ? 's' : ''}` },
        { label: 'Ponderado (prob.)', value: fmtMM(Math.round(consol.ponderado)), color: '#E1BA10', sub: 'Monto × probabilidad' },
        { label: 'Margen Ponderado', value: fmtMM(Math.round(consol.margenPond)), color: consol.margenPond >= 0 ? '#16A34A' : '#DC2626', sub: 'Margen esperado ponderado' },
        { label: 'Adjudicado', value: fmtMM(consol.adjMonto), color: '#16A34A', sub: `${adjudicados.length} oportunidad${adjudicados.length !== 1 ? 'es' : ''}` },
      ]} />

      {/* Controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1.5">
          {[
            { key: 'activos', label: 'Activos', count: activos.length },
            { key: 'adjudicados', label: 'Adjudicados', count: adjudicados.length },
            { key: 'descartados', label: 'Descartados', count: descartados.length },
          ].map(f => (
            <button key={f.key} onClick={() => setFilterEstado(f.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                filterEstado === f.key
                  ? 'bg-cobalt text-white border-cobalt'
                  : 'bg-white border-[#E2E8F0] text-slate hover:border-cobalt hover:text-cobalt'
              }`}>
              {f.label}
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                filterEstado === f.key ? 'bg-white/20' : 'bg-slate-100'
              }`}>{f.count}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <ViewToggle view={view} onChange={v => setView(v as typeof view)} options={['cards', 'tabla']} />
          {ce && (
            <button onClick={openNew} className="bg-cobalt text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-cobalt-dark transition-colors">
              + Nueva oportunidad
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      {view === 'tabla' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
          <table className="w-full text-xs min-w-[800px]">
            <thead>
              <tr className="bg-[#F1F5F9] text-[10px] font-extrabold uppercase tracking-wider text-slate">
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Proyecto</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-right p-3">Monto ($MM)</th>
                <th className="text-right p-3">Prob.</th>
                <th className="text-right p-3">Ponderado</th>
                <th className="text-right p-3">Margen</th>
                <th className="text-left p-3">Fecha est.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const est = ESTADO_PLAN[item.estado]
                const pond = item.monto_estimado * (item.probabilidad / 100)
                return (
                  <tr key={item.id} onClick={() => openEdit(item)} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                    <td className="p-3 font-bold">{item.cliente}</td>
                    <td className="p-3 text-[11px] text-slate">{item.proyecto || '—'}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.tipo_cliente === 'actual' ? 'bg-cobalt/10 text-cobalt' : 'bg-amber-100 text-amber-700'}`}>
                        {item.tipo_cliente === 'actual' ? 'Actual' : 'Potencial'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase"
                        style={{ background: est.color + '18', color: est.color }}>
                        {est.label}
                      </span>
                    </td>
                    <td className="p-3 text-right font-condensed text-sm font-extrabold">{fmtMM(item.monto_estimado)}</td>
                    <td className="p-3 text-right font-bold" style={{ color: item.probabilidad >= 60 ? '#16A34A' : item.probabilidad >= 30 ? '#D97706' : '#94A3B8' }}>
                      {item.probabilidad}%
                    </td>
                    <td className="p-3 text-right font-condensed font-bold text-cobalt">{fmtMM(Math.round(pond))}</td>
                    <td className="p-3 text-right font-bold" style={{ color: item.margen_esperado_pct >= 15 ? '#16A34A' : '#D97706' }}>
                      {item.margen_esperado_pct > 0 ? `${item.margen_esperado_pct}%` : '—'}
                    </td>
                    <td className="p-3 text-[11px] text-slate">{item.fecha_estimada || '—'}</td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-slate">Sin oportunidades en este filtro.</td></tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-[#F1F5F9] border-t border-[#E2E8F0]">
                  <td className="p-3 font-bold" colSpan={4}>Total ({filtered.length})</td>
                  <td className="p-3 text-right font-condensed font-bold text-cobalt">{fmtMM(filtered.reduce((s, i) => s + i.monto_estimado, 0))}</td>
                  <td className="p-3" />
                  <td className="p-3 text-right font-condensed font-bold text-cobalt">{fmtMM(Math.round(filtered.reduce((s, i) => s + i.monto_estimado * (i.probabilidad / 100), 0)))}</td>
                  <td className="p-3" colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Cards */}
      {view === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(item => {
            const est = ESTADO_PLAN[item.estado]
            const pond = item.monto_estimado * (item.probabilidad / 100)
            return (
              <motion.div key={item.id} onClick={() => openEdit(item)}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                className="bg-white rounded-xl border border-[#E2E8F0] p-4 hover:shadow-md hover:border-[#CBD5E1] transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-ink">{item.cliente}</h3>
                    {item.proyecto && <p className="text-[11px] text-slate">{item.proyecto}</p>}
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0"
                    style={{ background: est.color + '18', color: est.color }}>
                    {est.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.tipo_cliente === 'actual' ? 'bg-cobalt/10 text-cobalt' : 'bg-amber-100 text-amber-700'}`}>
                    {item.tipo_cliente === 'actual' ? 'Actual' : 'Potencial'}
                  </span>
                  {item.segmento && <span className="text-[10px] text-slate">{SEGMENTO_LABELS[item.segmento] || item.segmento}</span>}
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <p className="text-slate">Monto</p>
                    <p className="font-condensed font-bold text-ink">{fmtMM(item.monto_estimado)}</p>
                  </div>
                  <div>
                    <p className="text-slate">Prob.</p>
                    <p className="font-bold" style={{ color: item.probabilidad >= 60 ? '#16A34A' : item.probabilidad >= 30 ? '#D97706' : '#94A3B8' }}>
                      {item.probabilidad}%
                    </p>
                  </div>
                  <div>
                    <p className="text-slate">Ponderado</p>
                    <p className="font-condensed font-bold text-cobalt">{fmtMM(Math.round(pond))}</p>
                  </div>
                </div>
                {item.observacion && <p className="text-[10px] text-slate mt-2 truncate">{item.observacion}</p>}
              </motion.div>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-full bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate text-sm">
              Sin oportunidades en este filtro.
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <PlanInversionModal
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

function PlanInversionModal({ open, onClose, editing, onSave, onDelete }: {
  open: boolean
  onClose: () => void
  editing: PlanInversion | null
  onSave: (input: PlanInversionInput, id?: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [cliente, setCliente] = useState('')
  const [tipoCliente, setTipoCliente] = useState<PlanInversionInput['tipo_cliente']>('actual')
  const [proyecto, setProyecto] = useState('')
  const [segmento, setSegmento] = useState('edificacion')
  const [monto, setMonto] = useState('')
  const [probabilidad, setProbabilidad] = useState('50')
  const [margen, setMargen] = useState('')
  const [fecha, setFecha] = useState('')
  const [estado, setEstado] = useState<PlanInversionInput['estado']>('prospecto')
  const [observacion, setObservacion] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const isEdit = !!editing

  // Sync form
  const [prevOpen, setPrevOpen] = useState(false)
  const [prevEditId, setPrevEditId] = useState<string | null>(null)
  if (open !== prevOpen || (editing?.id ?? null) !== prevEditId) {
    setPrevOpen(open)
    setPrevEditId(editing?.id ?? null)
    if (open) {
      if (editing) {
        setCliente(editing.cliente)
        setTipoCliente(editing.tipo_cliente)
        setProyecto(editing.proyecto || '')
        setSegmento(editing.segmento || 'edificacion')
        setMonto(String(editing.monto_estimado || ''))
        setProbabilidad(String(editing.probabilidad))
        setMargen(String(editing.margen_esperado_pct || ''))
        setFecha(editing.fecha_estimada || '')
        setEstado(editing.estado)
        setObservacion(editing.observacion || '')
      } else {
        setCliente(''); setTipoCliente('actual'); setProyecto(''); setSegmento('edificacion')
        setMonto(''); setProbabilidad('50'); setMargen(''); setFecha('')
        setEstado('prospecto'); setObservacion('')
      }
      setErrors([])
    }
  }

  async function handleSave() {
    const errs: string[] = []
    if (!cliente.trim()) errs.push('Cliente es obligatorio')
    if (errs.length) { setErrors(errs); return }
    setErrors([])
    setSaving(true)
    try {
      await onSave({
        cliente: cliente.trim(),
        tipo_cliente: tipoCliente,
        proyecto: proyecto.trim() || null,
        segmento,
        monto_estimado: Number(monto) || 0,
        probabilidad: Math.min(100, Math.max(0, Number(probabilidad) || 0)),
        margen_esperado_pct: Number(margen) || 0,
        fecha_estimada: fecha || null,
        estado,
        observacion: observacion.trim() || null,
      }, editing?.id)
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!editing || !confirm(`Eliminar oportunidad "${editing.cliente}"?`)) return
    setSaving(true)
    try { await onDelete(editing.id) } finally { setSaving(false) }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar' : 'Nueva'}
      accent="Oportunidad"
      footer={
        <>
          {isEdit && <Btn variant="danger" onClick={handleDelete} disabled={saving}>Eliminar</Btn>}
          <div className="flex-1" />
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear oportunidad'}
          </Btn>
        </>
      }
    >
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
          {errors.map((e, i) => <p key={i} className="text-red-600 text-xs">{e}</p>)}
        </div>
      )}
      <Row2>
        <Field label="Cliente">
          <Input placeholder="Nombre del cliente" value={cliente} onChange={e => setCliente(e.target.value)} />
        </Field>
        <Field label="Tipo cliente">
          <Select value={tipoCliente} onChange={e => setTipoCliente(e.target.value as PlanInversionInput['tipo_cliente'])}>
            <option value="actual">Actual</option>
            <option value="potencial">Potencial</option>
          </Select>
        </Field>
      </Row2>
      <Row2>
        <Field label="Proyecto / Oportunidad">
          <Input placeholder="Nombre del proyecto" value={proyecto} onChange={e => setProyecto(e.target.value)} />
        </Field>
        <Field label="Segmento">
          <Select value={segmento} onChange={e => setSegmento(e.target.value)}>
            <option value="edificacion">Edificacion</option>
            <option value="infraestructura">Infraestructura</option>
            <option value="industrial">Industrial</option>
            <option value="mineria">Mineria</option>
            <option value="energia">Energia</option>
            <option value="otro">Otro</option>
          </Select>
        </Field>
      </Row2>
      <Row2>
        <Field label="Monto estimado ($MM)">
          <Input type="number" placeholder="0" value={monto} onChange={e => setMonto(e.target.value)} />
        </Field>
        <Field label="Probabilidad (%)">
          <Input type="number" placeholder="50" min="0" max="100" value={probabilidad} onChange={e => setProbabilidad(e.target.value)} />
        </Field>
      </Row2>
      <Row2>
        <Field label="Margen esperado (%)">
          <Input type="number" placeholder="15" value={margen} onChange={e => setMargen(e.target.value)} />
        </Field>
        <Field label="Estado">
          <Select value={estado} onChange={e => setEstado(e.target.value as PlanInversionInput['estado'])}>
            {Object.entries(ESTADO_PLAN).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </Field>
      </Row2>
      <Row2>
        <Field label="Fecha estimada">
          <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
        </Field>
        <Field label="Observacion">
          <Input placeholder="Notas" value={observacion} onChange={e => setObservacion(e.target.value)} />
        </Field>
      </Row2>
    </Modal>
  )
}
