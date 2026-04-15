'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/comites/hooks'
import Modal, { Field, Input, Select, Row2, Row3, Divider, Btn } from './Modal'
import type { EstadisticaSemanal, Proyecto } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  projects: Proyecto[]
  onSaved?: () => void
}

type View = 'lista' | 'form'

const EMPTY: Omit<EstadisticaSemanal, 'id'> = {
  proyecto_id: null,
  semana: '',
  n_accidentes: 0,
  n_enfermedades_profesionales: 0,
  dias_perdidos_accidentes: 0,
  dias_perdidos_enfermedad: 0,
  promedio_trabajadores: 0,
  n_accidentes_fatales: 0,
  n_pensionados: 0,
  n_indemnizados: 0,
  hh_trabajadas: 0,
  tasa_siniestralidad_temporal: 0,
  factor_siniestralidad_invalidez: 0,
  tasa_accidentabilidad: 0,
  tasa_frecuencia: 0,
  tasa_gravedad: 0,
  capacitaciones_horas: 0,
  inspecciones: 0,
  charlas_realizadas: 0,
}

// ── Utilidades de fechas ─────────────────────────────
function mondayOf(d: Date): string {
  const x = new Date(d)
  const day = x.getDay() // 0 dom, 1 lun
  const diff = (day === 0 ? -6 : 1 - day)
  x.setDate(x.getDate() + diff)
  return x.toISOString().slice(0, 10)
}

function fmtSemana(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return iso
  const fin = new Date(d); fin.setDate(d.getDate() + 6)
  const sd = d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
  const sf = fin.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${sd} – ${sf}`
}

// ── Cálculo de tasas ─────────────────────────────────
function round2(n: number): number {
  if (!isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

function calcTasas(s: Pick<EstadisticaSemanal,
  'n_accidentes' | 'dias_perdidos_accidentes' | 'dias_perdidos_enfermedad' |
  'hh_trabajadas' | 'promedio_trabajadores' | 'n_accidentes_fatales' |
  'n_pensionados' | 'n_indemnizados'>) {
  const hh = s.hh_trabajadas
  const trab = s.promedio_trabajadores
  return {
    tasa_frecuencia: hh > 0 ? round2((s.n_accidentes * 1_000_000) / hh) : 0,
    tasa_gravedad: hh > 0 ? round2(((s.dias_perdidos_accidentes + s.dias_perdidos_enfermedad) * 1_000_000) / hh) : 0,
    tasa_accidentabilidad: trab > 0 ? round2((s.n_accidentes / trab) * 100) : 0,
    tasa_siniestralidad_temporal: trab > 0 ? round2((s.dias_perdidos_accidentes / trab) * 100) : 0,
    factor_siniestralidad_invalidez: trab > 0 ? round2(((s.n_pensionados + s.n_indemnizados + s.n_accidentes_fatales) / trab) * 100) : 0,
  }
}

type TasaKey = keyof ReturnType<typeof calcTasas>

const TASAS_META: { key: TasaKey; label: string; sub: string }[] = [
  { key: 'tasa_siniestralidad_temporal', label: 'Tasa Siniestralidad Inc. Temporal', sub: 'Días Acc. / Trab. × 100' },
  { key: 'factor_siniestralidad_invalidez', label: 'Factor Siniestralidad Inv. y Muertes', sub: '(Pens.+Indem.+Fatales) / Trab. × 100' },
  { key: 'tasa_accidentabilidad', label: 'Tasa de Accidentabilidad', sub: 'Acc. / Trab. × 100' },
  { key: 'tasa_frecuencia', label: 'Tasa de Frecuencia', sub: 'Acc. × 10⁶ / HH' },
  { key: 'tasa_gravedad', label: 'Tasa de Gravedad', sub: 'Días × 10⁶ / HH' },
]

export default function EstadisticasSeguridadModal({ open, onClose, projects, onSaved }: Props) {
  const supabase = createClient()
  const { canEdit } = useAuth()
  const ce = canEdit('prevencion')

  const [view, setView] = useState<View>('lista')
  const [registros, setRegistros] = useState<EstadisticaSemanal[]>([])
  const [loading, setLoading] = useState(false)
  const [filtroProj, setFiltroProj] = useState<string>('')
  const [search, setSearch] = useState('')

  const [editing, setEditing] = useState<EstadisticaSemanal | (Omit<EstadisticaSemanal, 'id'> & { id?: string }) | null>(null)
  const [tasaManual, setTasaManual] = useState<Record<TasaKey, boolean>>({
    tasa_siniestralidad_temporal: false,
    factor_siniestralidad_invalidez: false,
    tasa_accidentabilidad: false,
    tasa_frecuencia: false,
    tasa_gravedad: false,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('estadisticas_seguridad')
      .select('*')
      .order('semana', { ascending: false })
    setRegistros((data || []) as EstadisticaSemanal[])
    setLoading(false)
  }

  useEffect(() => {
    if (!open) return
    setView('lista')
    setEditing(null)
    setErr(null)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const proyectoName = (id: string | null) =>
    !id ? 'General' : projects.find(p => p.id === id)?.nombre || 'Proyecto'

  const filtrados = useMemo(() => {
    let l = registros
    if (filtroProj) l = l.filter(r => r.proyecto_id === filtroProj)
    if (search) {
      const s = search.toLowerCase()
      l = l.filter(r => proyectoName(r.proyecto_id).toLowerCase().includes(s) || r.semana.includes(s))
    }
    return l
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registros, filtroProj, search, projects])

  // ── Form handlers ─────────────────────────────────
  function abrirNueva() {
    setEditing({ ...EMPTY, semana: mondayOf(new Date()) })
    setTasaManual({ tasa_siniestralidad_temporal: false, factor_siniestralidad_invalidez: false, tasa_accidentabilidad: false, tasa_frecuencia: false, tasa_gravedad: false })
    setErr(null)
    setView('form')
  }

  function abrirEditar(r: EstadisticaSemanal) {
    setEditing({ ...r })
    // Si el valor guardado difiere del calculado → marcar como manual
    const auto = calcTasas(r)
    setTasaManual({
      tasa_siniestralidad_temporal: r.tasa_siniestralidad_temporal !== auto.tasa_siniestralidad_temporal,
      factor_siniestralidad_invalidez: r.factor_siniestralidad_invalidez !== auto.factor_siniestralidad_invalidez,
      tasa_accidentabilidad: r.tasa_accidentabilidad !== auto.tasa_accidentabilidad,
      tasa_frecuencia: r.tasa_frecuencia !== auto.tasa_frecuencia,
      tasa_gravedad: r.tasa_gravedad !== auto.tasa_gravedad,
    })
    setErr(null)
    setView('form')
  }

  function update<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setEditing(prev => prev ? { ...prev, [key]: value } : prev)
  }

  function num(v: string): number {
    const n = parseFloat(v.replace(',', '.'))
    return isFinite(n) ? n : 0
  }

  // Recalcular tasas cuando cambian los inputs base, salvo override manual
  useEffect(() => {
    if (!editing) return
    const auto = calcTasas(editing)
    setEditing(prev => {
      if (!prev) return prev
      const next = { ...prev }
      ;(Object.keys(auto) as TasaKey[]).forEach(k => {
        if (!tasaManual[k]) next[k] = auto[k]
      })
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.n_accidentes, editing?.dias_perdidos_accidentes, editing?.dias_perdidos_enfermedad, editing?.hh_trabajadas, editing?.promedio_trabajadores, editing?.n_accidentes_fatales, editing?.n_pensionados, editing?.n_indemnizados, tasaManual])

  function toggleManual(k: TasaKey) {
    setTasaManual(prev => ({ ...prev, [k]: !prev[k] }))
  }

  function recalcular(k: TasaKey) {
    if (!editing) return
    const auto = calcTasas(editing)
    setEditing({ ...editing, [k]: auto[k] })
    setTasaManual(prev => ({ ...prev, [k]: false }))
  }

  async function guardar() {
    if (!editing) return
    if (!editing.proyecto_id) { setErr('Selecciona un proyecto'); return }
    if (!editing.semana) { setErr('Selecciona la semana'); return }

    setSaving(true)
    setErr(null)
    const full = editing as EstadisticaSemanal
    const payload: Omit<EstadisticaSemanal, 'id' | 'created_at'> & { id?: string } = {
      proyecto_id: full.proyecto_id,
      semana: full.semana,
      n_accidentes: full.n_accidentes,
      n_enfermedades_profesionales: full.n_enfermedades_profesionales,
      dias_perdidos_accidentes: full.dias_perdidos_accidentes,
      dias_perdidos_enfermedad: full.dias_perdidos_enfermedad,
      promedio_trabajadores: full.promedio_trabajadores,
      n_accidentes_fatales: full.n_accidentes_fatales,
      n_pensionados: full.n_pensionados,
      n_indemnizados: full.n_indemnizados,
      hh_trabajadas: full.hh_trabajadas,
      tasa_siniestralidad_temporal: full.tasa_siniestralidad_temporal,
      factor_siniestralidad_invalidez: full.factor_siniestralidad_invalidez,
      tasa_accidentabilidad: full.tasa_accidentabilidad,
      tasa_frecuencia: full.tasa_frecuencia,
      tasa_gravedad: full.tasa_gravedad,
      capacitaciones_horas: full.capacitaciones_horas,
      inspecciones: full.inspecciones,
      charlas_realizadas: full.charlas_realizadas,
    }
    if (full.id) payload.id = full.id
    const { error } = await supabase
      .from('estadisticas_seguridad')
      .upsert(payload, { onConflict: 'proyecto_id,semana' })
    setSaving(false)
    if (error) { setErr(error.message); return }
    await load()
    onSaved?.()
    setView('lista')
    setEditing(null)
  }

  async function eliminar(r: EstadisticaSemanal) {
    if (!confirm(`¿Eliminar registro de ${proyectoName(r.proyecto_id)} – ${fmtSemana(r.semana)}?`)) return
    await supabase.from('estadisticas_seguridad').delete().eq('id', r.id)
    await load()
    onSaved?.()
  }

  // ── Render ────────────────────────────────────────
  const titulo = view === 'lista' ? 'Estadísticas' : (editing && (editing as EstadisticaSemanal).id ? 'Editar' : 'Nueva')
  const accent = view === 'lista' ? 'semanales' : 'estadística semanal'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo}
      accent={accent}
      size="xl"
      footer={view === 'form' ? (
        <>
          <Btn onClick={() => { setView('lista'); setEditing(null) }}>Cancelar</Btn>
          {ce && <Btn variant="primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Btn>}
        </>
      ) : (
        <Btn onClick={onClose}>Cerrar</Btn>
      )}
    >
      {view === 'lista' && (
        <>
          {/* Controles lista */}
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div className="flex gap-2 items-center">
              <Select value={filtroProj} onChange={e => setFiltroProj(e.target.value)}>
                <option value="">Todos los proyectos</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Select>
              <input
                type="text" placeholder="Buscar proyecto o fecha…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-56 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs outline-none focus:border-cobalt transition-colors placeholder:text-[#CBD5E1]"
              />
            </div>
            {ce && (
              <button onClick={abrirNueva}
                className="bg-cobalt text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-cobalt-dark btn-scale">
                + Nueva semana
              </button>
            )}
          </div>

          {/* Tabla histórica */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                  <th className="text-left px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Proyecto</th>
                  <th className="text-left px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Semana</th>
                  <th className="text-center px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-red-400">Acc.</th>
                  <th className="text-center px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Días</th>
                  <th className="text-right px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">HH</th>
                  <th className="text-right px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">T. Frec.</th>
                  <th className="text-right px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">T. Grav.</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-slate text-[11px]">Cargando…</td></tr>
                )}
                {!loading && filtrados.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-slate text-[11px]">
                    {registros.length === 0 ? 'Aún no hay estadísticas registradas.' : 'Sin resultados para el filtro.'}
                  </td></tr>
                )}
                {filtrados.map(r => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-3 py-2 font-semibold text-ink">{proyectoName(r.proyecto_id)}</td>
                    <td className="px-3 py-2 text-slate">{fmtSemana(r.semana)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-condensed font-bold ${r.n_accidentes > 0 ? 'text-red-500' : 'text-green-500'}`}>{r.n_accidentes}</span>
                    </td>
                    <td className="px-3 py-2 text-center text-slate">{r.dias_perdidos_accidentes + r.dias_perdidos_enfermedad}</td>
                    <td className="px-3 py-2 text-right text-slate">{r.hh_trabajadas > 0 ? r.hh_trabajadas.toLocaleString('es-CL') : '—'}</td>
                    <td className="px-3 py-2 text-right font-condensed font-bold" style={{ color: r.tasa_frecuencia === 0 ? '#16A34A' : r.tasa_frecuencia < 5 ? '#D97706' : '#DC2626' }}>{r.tasa_frecuencia}</td>
                    <td className="px-3 py-2 text-right font-condensed font-bold" style={{ color: r.tasa_gravedad === 0 ? '#16A34A' : r.tasa_gravedad < 50 ? '#D97706' : '#DC2626' }}>{r.tasa_gravedad}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {ce && (<>
                        <button onClick={() => abrirEditar(r)} className="text-cobalt hover:underline text-[11px] font-semibold mr-2">Editar</button>
                        <button onClick={() => eliminar(r)} className="text-red-500 hover:underline text-[11px] font-semibold">Eliminar</button>
                      </>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-[11px] text-slate">
            Cada registro corresponde a una <span className="font-semibold">semana específica</span> (lo ocurrido en esos 7 días) por proyecto. Si vuelves a registrar la misma combinación se actualiza, no se duplica.
          </p>
        </>
      )}

      {view === 'form' && editing && (
        <div>
          {/* Header form: proyecto + semana */}
          <Row2>
            <Field label="Proyecto">
              <Select value={editing.proyecto_id || ''} onChange={e => update('proyecto_id', e.target.value || null)}>
                <option value="">Selecciona…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Select>
            </Field>
            <Field label="Semana (lunes)">
              <Input
                type="date"
                value={editing.semana || ''}
                onChange={e => update('semana', e.target.value ? mondayOf(new Date(e.target.value + 'T00:00:00')) : '')}
              />
            </Field>
          </Row2>

          {/* Sección base */}
          <Divider label="Datos base de la semana" />
          <Row3>
            <Field label="Nº Accidentes">
              <Input type="number" min={0} value={editing.n_accidentes} onChange={e => update('n_accidentes', num(e.target.value))} />
            </Field>
            <Field label="Nº Enf. Profesionales">
              <Input type="number" min={0} value={editing.n_enfermedades_profesionales} onChange={e => update('n_enfermedades_profesionales', num(e.target.value))} />
            </Field>
            <Field label="Nº Acc. Fatales">
              <Input type="number" min={0} value={editing.n_accidentes_fatales} onChange={e => update('n_accidentes_fatales', num(e.target.value))} />
            </Field>
          </Row3>
          <Row3>
            <Field label="Días Perd. Accidentes">
              <Input type="number" min={0} value={editing.dias_perdidos_accidentes} onChange={e => update('dias_perdidos_accidentes', num(e.target.value))} />
            </Field>
            <Field label="Días Perd. Enfermedad">
              <Input type="number" min={0} value={editing.dias_perdidos_enfermedad} onChange={e => update('dias_perdidos_enfermedad', num(e.target.value))} />
            </Field>
            <Field label="Promedio Trabajadores">
              <Input type="number" min={0} step="0.01" value={editing.promedio_trabajadores} onChange={e => update('promedio_trabajadores', num(e.target.value))} />
            </Field>
          </Row3>
          <Row3>
            <Field label="Nº Pensionados">
              <Input type="number" min={0} value={editing.n_pensionados} onChange={e => update('n_pensionados', num(e.target.value))} />
            </Field>
            <Field label="Nº Indemnizados">
              <Input type="number" min={0} value={editing.n_indemnizados} onChange={e => update('n_indemnizados', num(e.target.value))} />
            </Field>
            <Field label="Horas Hombre">
              <Input type="number" min={0} value={editing.hh_trabajadas} onChange={e => update('hh_trabajadas', num(e.target.value))} />
            </Field>
          </Row3>

          {/* Sección tasas */}
          <Divider label="Tasas (calculadas en vivo, editables)" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TASAS_META.map(t => {
              const manual = tasaManual[t.key]
              return (
                <div key={t.key} className="border border-[#E2E8F0] rounded-lg p-2.5 bg-slate-50/40">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate">{t.label}</label>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${manual ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {manual ? 'manual' : 'auto'}
                      </span>
                      <button type="button" onClick={() => toggleManual(t.key)}
                        className="text-[10px] text-cobalt hover:underline font-semibold">
                        {manual ? 'volver a auto' : 'editar'}
                      </button>
                      {manual && (
                        <button type="button" onClick={() => recalcular(t.key)}
                          className="text-[10px] text-slate hover:text-cobalt font-semibold" title="Recalcular desde datos base">
                          ↺
                        </button>
                      )}
                    </div>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing[t.key]}
                    readOnly={!manual}
                    onChange={e => update(t.key, num(e.target.value))}
                  />
                  <p className="text-[10px] text-slate mt-1">{t.sub}</p>
                </div>
              )
            })}
          </div>

          {/* Actividad preventiva (opcional) */}
          <Divider label="Actividad preventiva (opcional)" />
          <Row3>
            <Field label="Capacitaciones (h)">
              <Input type="number" min={0} value={editing.capacitaciones_horas} onChange={e => update('capacitaciones_horas', num(e.target.value))} />
            </Field>
            <Field label="Inspecciones">
              <Input type="number" min={0} value={editing.inspecciones} onChange={e => update('inspecciones', num(e.target.value))} />
            </Field>
            <Field label="Charlas realizadas">
              <Input type="number" min={0} value={editing.charlas_realizadas} onChange={e => update('charlas_realizadas', num(e.target.value))} />
            </Field>
          </Row3>

          {err && (
            <p className="mt-3 text-[11px] text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>
          )}
        </div>
      )}
    </Modal>
  )
}
