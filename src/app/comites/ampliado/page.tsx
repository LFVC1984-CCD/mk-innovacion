'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtFechaDate, fmtFecha } from '@/lib/comites/data'
import type { AreaId, KPI, Tarea } from '@/lib/types'
import { AREAS_LIST, AREA_COLORS, AREA_NAMES } from '@/lib/types'

// ── Types ──

interface AreaSnapshot {
  id: AreaId
  kpis: KPI[]
  tareas: Tarea[]
  acuerdos: NuevoAcuerdo[]
  comentario: string
}

interface NuevoAcuerdo {
  texto: string
  responsable: string
  fecha: string
}

// ── Status badge ──

const STATUS_CFG: Record<string, { bg: string; text: string; label: string }> = {
  rojo: { bg: '#FEE2E2', text: '#DC2626', label: 'Crítico' },
  amarillo: { bg: '#FEF3C7', text: '#D97706', label: 'Atención' },
  verde: { bg: '#DCFCE7', text: '#16A34A', label: 'OK' },
}

function StatusDot({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.verde
  return <span className="inline-block w-2 h-2 rounded-full" style={{ background: cfg.text }} />
}

// ── Main ──

export default function AmpliadoPage() {
  const supabase = createClient()

  const [step, setStep] = useState<'selector' | 'sesion'>('selector')
  const [selectedAreas, setSelectedAreas] = useState<AreaId[]>([])
  const [snapshots, setSnapshots] = useState<AreaSnapshot[]>([])
  const [comentarioGeneral, setComentarioGeneral] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [usuarios, setUsuarios] = useState<{ id: string; nombre: string }[]>([])

  // Load users for responsable dropdown
  useEffect(() => {
    supabase.from('perfiles').select('id, nombre').order('nombre')
      .then(({ data }: { data: { id: string; nombre: string }[] | null }) => { if (data) setUsuarios(data) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleArea = (id: AreaId) => {
    setSelectedAreas(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

  // ── Start session: load KPIs + Tareas for all selected areas ──
  const startSession = useCallback(async () => {
    setLoading(true)
    const snaps: AreaSnapshot[] = []
    for (const areaId of selectedAreas) {
      const [kRes, tRes] = await Promise.all([
        supabase.from('kpis').select('*').eq('area_id', areaId).order('orden'),
        supabase.from('tareas').select('*').eq('area_id', areaId).in('estado', ['pendiente', 'en-proceso', 'bloqueada']).order('created_at'),
      ])
      snaps.push({
        id: areaId,
        kpis: (kRes.data || []) as KPI[],
        tareas: (tRes.data || []) as Tarea[],
        acuerdos: [],
        comentario: '',
      })
    }
    setSnapshots(snaps)
    setStep('sesion')
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAreas])

  // ── Add acuerdo to an area ──
  const addAcuerdo = (areaId: AreaId) => {
    setSnapshots(prev => prev.map(s =>
      s.id === areaId ? { ...s, acuerdos: [...s.acuerdos, { texto: '', responsable: '', fecha: '' }] } : s
    ))
  }

  const updateAcuerdo = (areaId: AreaId, idx: number, field: keyof NuevoAcuerdo, value: string) => {
    setSnapshots(prev => prev.map(s =>
      s.id === areaId ? {
        ...s,
        acuerdos: s.acuerdos.map((a, i) => i === idx ? { ...a, [field]: value } : a)
      } : s
    ))
  }

  const removeAcuerdo = (areaId: AreaId, idx: number) => {
    setSnapshots(prev => prev.map(s =>
      s.id === areaId ? { ...s, acuerdos: s.acuerdos.filter((_, i) => i !== idx) } : s
    ))
  }

  const updateComentario = (areaId: AreaId, value: string) => {
    setSnapshots(prev => prev.map(s => s.id === areaId ? { ...s, comentario: value } : s))
  }

  // ── Close session: persist acuerdos as tareas, save minuta ──
  const closeSession = async () => {
    if (!confirm('¿Cerrar sesión y guardar todos los acuerdos?')) return
    setSaving(true)

    // 1. Insert new acuerdos as tareas
    const nuevasTareas: Omit<Tarea, 'id'>[] = []
    for (const snap of snapshots) {
      for (const ac of snap.acuerdos) {
        if (!ac.texto.trim()) continue
        nuevasTareas.push({
          area_id: snap.id,
          texto: ac.texto,
          responsable: ac.responsable || null,
          responsable_id: null,
          estado: 'pendiente',
          tipo: 'acuerdo',
          fecha_compromiso: ac.fecha || null,
          from_decision: false,
          area_destino: null,
        })
      }
    }
    if (nuevasTareas.length > 0) {
      await supabase.from('tareas').insert(nuevasTareas)
    }

    // 2. Save minuta record
    const hoy = new Date().toISOString().slice(0, 10)
    const lineas = snapshots.map(s => ({
      area: s.id,
      kpis_snapshot: s.kpis.map(k => ({ nombre: k.nombre, valor: k.valor, meta: k.meta, status: k.status })),
      tareas_activas: s.tareas.length,
      acuerdos_nuevos: s.acuerdos.filter(a => a.texto.trim()).length,
      comentario: s.comentario,
    }))
    await supabase.from('minutas').insert({
      area_id: 'finanzas', // ampliado uses finanzas as default area_id
      fecha: hoy,
      lineas: lineas,
      texto_completo: `Comité Ampliado ${fmtFechaDate(new Date())} — ${selectedAreas.length} áreas — ${nuevasTareas.length} acuerdos`,
      enviada: false,
    })

    // 3. Save comentarios de área
    for (const snap of snapshots) {
      if (snap.comentario.trim()) {
        await supabase.from('comentarios_area').insert({
          area_id: snap.id,
          texto: snap.comentario,
          tipo: 'ampliado',
        })
      }
    }

    setSaving(false)
    setStep('selector')
    setSelectedAreas([])
    setSnapshots([])
    setComentarioGeneral('')
    alert(`Sesión cerrada. ${nuevasTareas.length} acuerdos guardados como tareas.`)
  }

  // ════════════════════════════════════
  //  STEP 1: Selector de áreas
  // ════════════════════════════════════
  if (step === 'selector') {
    return (
      <>
        <div className="mb-6">
          <h1 className="font-condensed text-[28px] font-extrabold">
            Comité <span className="text-cobalt">Ampliado</span>
          </h1>
          <p className="text-xs text-slate">Selecciona las áreas que se revisarán en esta sesión</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
          {AREAS_LIST.filter(a => a.id !== 'admin' && a.id !== 'viewer').map(area => {
            const sel = selectedAreas.includes(area.id)
            return (
              <button
                key={area.id}
                onClick={() => toggleArea(area.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  sel ? 'border-cobalt bg-blue-50 shadow-sm' : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ background: area.color }} />
                  <span className="text-sm font-bold">{area.name}</span>
                </div>
                <p className="text-[11px] text-slate">{area.freq}</p>
                {sel && <p className="text-[10px] font-bold text-cobalt mt-1">Seleccionada</p>}
              </button>
            )
          })}
        </div>

        <div className="flex justify-end">
          <button
            onClick={startSession}
            disabled={selectedAreas.length === 0 || loading}
            className="px-6 py-2.5 rounded-lg bg-gold text-[#1A1200] text-sm font-bold hover:bg-gold-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Cargando...' : `Iniciar sesión (${selectedAreas.length} áreas)`}
          </button>
        </div>
      </>
    )
  }

  // ════════════════════════════════════
  //  STEP 2: Sesión activa
  // ════════════════════════════════════
  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="font-condensed text-[28px] font-extrabold">
            Comité <span className="text-cobalt">Ampliado</span>
          </h1>
          <p className="text-xs text-slate">
            {fmtFechaDate(new Date())} · {snapshots.length} áreas · Sesión en curso
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { if (confirm('¿Descartar sesión?')) { setStep('selector'); setSnapshots([]) } }}
            className="border border-[#E2E8F0] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#F1F5F9] transition-colors">
            Cancelar
          </button>
          <button onClick={closeSession} disabled={saving}
            className="bg-gold text-[#1A1200] px-5 py-2 rounded-lg text-xs font-bold hover:bg-gold-dark transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : 'Cerrar sesión y guardar'}
          </button>
        </div>
      </div>

      {/* Comentario general */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 mb-5">
        <label className="text-[10px] font-bold uppercase tracking-wide text-slate mb-1 block">Comentario general de la sesión</label>
        <textarea
          value={comentarioGeneral}
          onChange={e => setComentarioGeneral(e.target.value)}
          placeholder="Notas generales del comité ampliado..."
          className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs outline-none focus:border-cobalt resize-none h-16"
        />
      </div>

      {/* Areas */}
      <div className="space-y-5">
        {snapshots.map(snap => (
          <div key={snap.id} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            {/* Area header */}
            <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: `3px solid ${AREA_COLORS[snap.id]}` }}>
              <div className="w-3 h-3 rounded-full" style={{ background: AREA_COLORS[snap.id] }} />
              <h2 className="font-condensed text-lg font-extrabold">{AREA_NAMES[snap.id]}</h2>
              <div className="ml-auto flex gap-3 text-[10px] font-bold text-slate">
                <span>{snap.kpis.length} KPIs</span>
                <span>{snap.tareas.length} tareas activas</span>
                <span className="text-gold">{snap.acuerdos.length} acuerdos nuevos</span>
              </div>
            </div>

            <div className="p-5 space-y-4">

              {/* KPIs */}
              {snap.kpis.length > 0 && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate mb-2">Indicadores</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {snap.kpis.map(k => (
                      <div key={k.id} className="bg-[#F8FAFC] rounded-lg p-3 border border-[#F1F5F9]">
                        <div className="flex items-center gap-1.5 mb-1">
                          <StatusDot status={k.status} />
                          <span className="text-[10px] font-semibold text-slate truncate">{k.nombre}</span>
                        </div>
                        <p className="font-condensed text-lg font-extrabold">{k.valor || '—'}</p>
                        {k.meta && <p className="text-[10px] text-slate">Meta: {k.meta}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tareas activas */}
              {snap.tareas.length > 0 && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate mb-2">Tareas activas</p>
                  <div className="space-y-1">
                    {snap.tareas.map(t => {
                      const estadoCfg: Record<string, { color: string; label: string }> = {
                        'bloqueada': { color: '#DC2626', label: 'BLQ' },
                        'en-proceso': { color: '#D97706', label: 'EP' },
                        'pendiente': { color: '#64748B', label: 'PND' },
                      }
                      const ec = estadoCfg[t.estado] || estadoCfg.pendiente
                      return (
                        <div key={t.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded hover:bg-[#F8FAFC]">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold" style={{ background: ec.color + '18', color: ec.color }}>{ec.label}</span>
                          <span className="flex-1 truncate">{t.texto}</span>
                          {t.responsable && <span className="text-[10px] text-slate">{t.responsable}</span>}
                          {t.fecha_compromiso && <span className="text-[10px] text-slate">{fmtFecha(t.fecha_compromiso)}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Nuevos acuerdos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-gold">Acuerdos nuevos</p>
                  <button onClick={() => addAcuerdo(snap.id)}
                    className="text-[11px] font-bold text-cobalt hover:underline">
                    + Agregar acuerdo
                  </button>
                </div>
                {snap.acuerdos.length === 0 && (
                  <p className="text-[11px] text-slate italic">Sin acuerdos — presiona &quot;+ Agregar acuerdo&quot;</p>
                )}
                <div className="space-y-2">
                  {snap.acuerdos.map((ac, idx) => (
                    <div key={idx} className="flex gap-2 items-start bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-2.5">
                      <input
                        type="text"
                        placeholder="Descripción del acuerdo..."
                        value={ac.texto}
                        onChange={e => updateAcuerdo(snap.id, idx, 'texto', e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-[#E2E8F0] rounded text-xs outline-none focus:border-cobalt bg-white"
                      />
                      <select
                        value={ac.responsable}
                        onChange={e => updateAcuerdo(snap.id, idx, 'responsable', e.target.value)}
                        className="w-36 px-2 py-1.5 border border-[#E2E8F0] rounded text-xs outline-none focus:border-cobalt bg-white"
                      >
                        <option value="">Responsable</option>
                        {usuarios.map(u => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
                      </select>
                      <input
                        type="date"
                        value={ac.fecha}
                        onChange={e => updateAcuerdo(snap.id, idx, 'fecha', e.target.value)}
                        className="w-36 px-2 py-1.5 border border-[#E2E8F0] rounded text-xs outline-none focus:border-cobalt bg-white"
                      />
                      <button onClick={() => removeAcuerdo(snap.id, idx)}
                        className="text-slate hover:text-danger text-sm px-1">×</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comentario del área */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate mb-1 block">Comentario del área</label>
                <textarea
                  value={snap.comentario}
                  onChange={e => updateComentario(snap.id, e.target.value)}
                  placeholder={`Notas sobre ${AREA_NAMES[snap.id]}...`}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs outline-none focus:border-cobalt resize-none h-14"
                />
              </div>

            </div>
          </div>
        ))}
      </div>
    </>
  )
}
