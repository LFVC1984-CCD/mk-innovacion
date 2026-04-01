'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth, useAreaData } from '@/lib/comites/hooks'
import { useAutoKpis } from '@/lib/comites/use-auto-kpis'
import { toast } from '@/components/ui/Toast'
import { fmtFecha, fmtFechaDate } from '@/lib/comites/data'
import { createClient } from '@/lib/supabase/client'
import { AREAS_LIST, TAREA_TIPO_LABELS, TAREA_TIPO_COLORS } from '@/lib/types'
import type { AreaId, TareaTipo } from '@/lib/types'
import KPIDashboard from '@/components/comites/KPIDashboard'
import PDFExportButton from '@/components/comites/PDFExportButton'

const ML = ['Momento 1 — Scoreboard', 'Momento 2 — Estado de Tareas', 'Momento 3 — Compromisos', 'Momento 4 — Minutas']

interface MinutaRow { id: string; fecha: string; texto_completo: string | null; enviada: boolean; created_at: string }

// ── Animated Bar for task charts ──
function StatBar({ label, value, max, color, total, delay = 0 }: { label: string; value: number; max: number; color: string; total: number; delay?: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  const pctTotal = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold w-24 text-right">{label}</span>
      <div className="flex-1 h-7 bg-[#F1F5F9] rounded-lg overflow-hidden relative">
        <motion.div
          className="h-full rounded-lg"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: color, minWidth: value > 0 ? 4 : 0 }}
        />
        <span className="absolute inset-0 flex items-center px-3 text-xs font-bold" style={{ color: pct > 40 ? '#fff' : color }}>
          {value} ({pctTotal}%)
        </span>
      </div>
    </div>
  )
}

export default function ProyectarPage({ params }: { params: { area: string } }) {
  const areaId = params.area
  const { loading: authLoading, canEdit } = useAuth()
  const { kpis, tareas, loading, supabase } = useAreaData(areaId as AreaId)
  const { kpis: autoKpis, loading: autoLoading } = useAutoKpis(areaId as AreaId)
  const areaInfo = AREAS_LIST.find(a => a.id === areaId)
  const isRRHH = areaId === 'rrhh'

  // KPI visibility preferences
  const [kpiSelectedKeys, setKpiSelectedKeys] = useState<string[] | null>(null)

  useEffect(() => {
    const sb = createClient()
    sb.from('comentarios_area')
      .select('clave, valor')
      .eq('area_id', areaId)
      .like('clave', 'kpi_visible_%')
      .then(({ data }: { data: { clave: string; valor: string }[] | null }) => {
        if (data) {
          const selected = data.filter(d => d.valor === '1').map(d => d.clave.replace('kpi_visible_', ''))
          setKpiSelectedKeys(selected)
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId])

  // Filter autoKpis: if some are selected, show only those; if none selected, show all
  const visibleAutoKpis = (kpiSelectedKeys && kpiSelectedKeys.length > 0)
    ? autoKpis.filter(k => kpiSelectedKeys.includes(k.key))
    : autoKpis

  const [scoreView, setScoreView] = useState<'cards' | 'tabla'>('cards')
  const [taskView, setTaskView] = useState<'cards' | 'tabla'>('cards')
  const [slide, setSlide] = useState(0)
  const [minutaLines, setMinutaLines] = useState<{ tag: string; text: string }[]>([])
  const [minutas, setMinutas] = useState<MinutaRow[]>([])
  const [minutaExpanded, setMinutaExpanded] = useState<string | null>(null)
  const [pdfMode, setPdfMode] = useState(false)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null])

  // Slide comments (persisted in minuta)
  const [comments, setComments] = useState<Record<number, string>>({})

  const ce = canEdit(areaId)

  function changeSlide(n: number) { setSlide(n) }

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); if (slide < 3) changeSlide(slide + 1) }
    if (e.key === 'ArrowLeft' && slide > 0) changeSlide(slide - 1)
    if (e.key === 'Escape') window.history.back()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide])
  useEffect(() => { window.addEventListener('keydown', handleKey); return () => window.removeEventListener('keydown', handleKey) }, [handleKey])

  // Build minuta
  useEffect(() => {
    const lines: typeof minutaLines = []
    kpis.filter(k => k.comentario).forEach(k => lines.push({ tag: 'KPI', text: `${k.nombre}: ${k.comentario}` }))
    tareas.filter(t => t.from_decision).forEach(t => lines.push({ tag: 'Tarea', text: `${t.texto} · ${t.responsable || 'por asignar'}` }))
    Object.entries(comments).forEach(([idx, txt]) => { if (txt.trim()) lines.push({ tag: `Slide ${Number(idx) + 1}`, text: txt }) })
    setMinutaLines(lines)
  }, [kpis, tareas, comments])

  // Load minutas
  useEffect(() => {
    const sb = createClient()
    sb.from('minutas').select('id, fecha, texto_completo, enviada, created_at')
      .eq('area_id', areaId).order('created_at', { ascending: false }).limit(10)
      .then(({ data }: { data: MinutaRow[] | null }) => { if (data) setMinutas(data) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId])

  async function saveMinuta() {
    if (!minutaLines.length) { toast('Sin líneas en la minuta'); return }
    const texto = minutaLines.map(l => `[${l.tag}] ${l.text}`).join('\n')
    await supabase.from('minutas').insert({ area_id: areaId, lineas: minutaLines, texto_completo: texto })
    for (const k of kpis) { await supabase.from('kpi_historial').insert({ kpi_id: k.id, valor: k.valor }) }
    toast('Reunión cerrada y minuta guardada')
  }

  if (authLoading || loading || autoLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-cobalt border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const show = (n: number) => slide === n || pdfMode

  // ── Task stats ──
  const byEstado = {
    bloqueada: tareas.filter(t => t.estado === 'bloqueada').length,
    'en-proceso': tareas.filter(t => t.estado === 'en-proceso').length,
    pendiente: tareas.filter(t => t.estado === 'pendiente').length,
    completada: tareas.filter(t => t.estado === 'completada').length,
  }
  const totalTareas = tareas.length
  const maxEstado = Math.max(...Object.values(byEstado), 1)
  const bloqueadas = tareas.filter(t => t.estado === 'bloqueada').slice(0, 3)

  // ── Comment input ──
  function SlideComment({ slideIdx }: { slideIdx: number }) {
    return (
      <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate mb-1">Comentario de esta sección</div>
        <textarea
          value={comments[slideIdx] || ''}
          onChange={e => setComments(prev => ({ ...prev, [slideIdx]: e.target.value }))}
          placeholder="Agregar comentario para la minuta..."
          className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg outline-none focus:border-cobalt focus:shadow-[0_0_0_3px_rgba(11,94,215,0.1)] resize-none h-14 transition-all"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="hero-gradient px-7 py-3.5 flex items-center justify-between">
        <div>
          <h1 className="font-condensed font-black text-3xl text-white uppercase tracking-wider">
            {areaInfo?.name} <span className="text-gold">·</span>
          </h1>
          <p className="text-white/40 text-xs uppercase tracking-wider mt-0.5">Comité · {fmtFechaDate(new Date())} · MK Ingeniería</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={() => slide > 0 && changeSlide(slide - 1)} className="px-3 py-1.5 rounded text-xs font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20">←</button>
          <div className="flex flex-col items-center">
            <span className="text-white/50 text-xs">{slide + 1}/4</span>
            <div className="flex gap-1.5 mt-1">
              {[0, 1, 2, 3].map(i => (
                <button key={i} onClick={() => changeSlide(i)} className={`rounded-full transition-all ${i === slide ? 'bg-gold w-2.5 h-2.5' : 'bg-white/25 w-2 h-2 hover:bg-white/40'}`} />
              ))}
            </div>
          </div>
          <button onClick={() => slide < 3 && changeSlide(slide + 1)} className="px-3 py-1.5 rounded text-xs font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20">→</button>
          <PDFExportButton slideCount={3} filename={`comite-${areaId}`} areaName={areaInfo?.name || areaId}
            renderSlide={(idx) => slideRefs.current[idx] || null}
            onBeforeExport={() => setPdfMode(true)} onAfterExport={() => setPdfMode(false)} />
          <Link href={`/comites/${areaId}`} className="px-3 py-1.5 rounded text-xs font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20 ml-1">Editar</Link>
          <Link href="/comites" className="px-3 py-1.5 rounded text-xs font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20">Salir</Link>
        </div>
      </div>

      {/* Slide label bar (replaces timer) */}
      {!pdfMode && (
        <div className="flex items-center justify-between px-7 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <span className="text-xs font-bold text-slate uppercase tracking-wider">{ML[slide]}</span>
          <div className="flex gap-0.5">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= slide ? 'bg-cobalt' : 'bg-[#E2E8F0]'}`} style={{ width: i === slide ? 48 : 24 }} />
            ))}
          </div>
        </div>
      )}

      {/* ═══ SLIDES ═══ */}
      <div className="px-7 py-5">

        {/* ── Slide 0: Scoreboard ── */}
        <div ref={el => { slideRefs.current[0] = el }} style={{ display: show(0) ? 'block' : 'none' }}>
          <Hdr color={areaInfo?.color} text="Momento 1 · Scoreboard" right={<ViewToggleInline view={scoreView} setView={setScoreView} />} />

          {scoreView === 'cards' ? (
            <>
              {!isRRHH && visibleAutoKpis.length > 0 ? (
                <KPIDashboard kpis={visibleAutoKpis.slice(0, 8)} areaColor={areaInfo?.color} />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  {kpis.slice(0, 8).map(k => {
                    const color = k.status === 'verde' ? '#16A34A' : k.status === 'amarillo' ? '#D97706' : '#DC2626'
                    return (
                      <div key={k.id} className="bg-[#F8FAFC] rounded-lg p-4 border border-[#E2E8F0]" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
                        <div className="text-xs font-bold uppercase text-slate mb-2">{k.nombre}</div>
                        <div className="flex items-baseline gap-2.5">
                          <span className="font-condensed font-black text-4xl" style={{ color }}>{k.valor}</span>
                          {k.meta && <span className="text-xs text-slate">meta: {k.meta}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            /* Tabla view for Scoreboard */
            <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate">Indicador</th>
                    <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate">Valor</th>
                    <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate">Meta</th>
                    <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate">Estado</th>
                    <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate">Tendencia</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const kpiList = (!isRRHH && visibleAutoKpis.length > 0)
                      ? visibleAutoKpis.slice(0, 8).map(k => ({
                          id: k.key,
                          nombre: k.nombre,
                          valor: k.valor,
                          meta: k.meta || null,
                          statusKey: k.status,
                          statusColor: k.status === 'ok' ? '#16A34A' : k.status === 'warn' ? '#D97706' : '#DC2626',
                          statusLabel: k.status === 'ok' ? 'En meta' : k.status === 'warn' ? 'Alerta' : 'Critico',
                        }))
                      : kpis.slice(0, 8).map(k => ({
                          id: k.id,
                          nombre: k.nombre,
                          valor: k.valor || '—',
                          meta: k.meta,
                          statusKey: k.status === 'verde' ? 'ok' : k.status === 'amarillo' ? 'warn' : 'bad',
                          statusColor: k.status === 'verde' ? '#16A34A' : k.status === 'amarillo' ? '#D97706' : '#DC2626',
                          statusLabel: k.status === 'verde' ? 'En meta' : k.status === 'amarillo' ? 'Alerta' : 'Critico',
                        }))
                    return kpiList.map(k => (
                      <tr key={k.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: k.statusColor }} />
                            <span className="font-semibold text-ink">{k.nombre}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-condensed text-xl font-black" style={{ color: areaInfo?.color || '#0B5ED7' }}>{k.valor}</td>
                        <td className="px-4 py-3 text-slate">{k.meta || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                            style={{
                              background: k.statusKey === 'ok' ? '#DCFCE7' : k.statusKey === 'warn' ? '#FEF3C7' : '#FEE2E2',
                              color: k.statusColor,
                            }}>
                            {k.statusLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate">—</td>
                      </tr>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {ce && <SlideComment slideIdx={0} />}
        </div>

        {/* ── Slide 1: Estado de Tareas ── */}
        <div ref={el => { slideRefs.current[1] = el }} style={{ display: show(1) ? 'block' : 'none' }}>
          <Hdr color="#D97706" text="Momento 2 · Estado de Tareas" right={<ViewToggleInline view={taskView} setView={setTaskView} />} />

          {taskView === 'cards' ? (
            <>
              {/* 4 stat cards */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Bloqueadas', value: byEstado.bloqueada, color: '#DC2626', bg: '#FEE2E2' },
                  { label: 'En proceso', value: byEstado['en-proceso'], color: '#0B5ED7', bg: '#EFF6FF' },
                  { label: 'Abiertas', value: byEstado.pendiente, color: '#D97706', bg: '#FEF3C7' },
                  { label: 'Completadas', value: byEstado.completada, color: '#16A34A', bg: '#DCFCE7' },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 16, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="rounded-xl p-5 text-center"
                    style={{ background: s.bg }}
                  >
                    <p className="font-condensed text-6xl font-black leading-none" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs font-bold mt-2" style={{ color: s.color }}>{s.label}</p>
                    <p className="text-[10px] text-slate mt-0.5">{totalTareas > 0 ? Math.round((s.value / totalTareas) * 100) : 0}%</p>
                  </motion.div>
                ))}
              </div>

              {/* Animated horizontal bar chart */}
              <div className="bg-[#F8FAFC] rounded-xl p-5 border border-[#E2E8F0]">
                <div className="space-y-3">
                  <StatBar label="Bloqueadas" value={byEstado.bloqueada} max={maxEstado} color="#DC2626" total={totalTareas} delay={0} />
                  <StatBar label="En proceso" value={byEstado['en-proceso']} max={maxEstado} color="#0B5ED7" total={totalTareas} delay={0.1} />
                  <StatBar label="Abiertas" value={byEstado.pendiente} max={maxEstado} color="#D97706" total={totalTareas} delay={0.2} />
                  <StatBar label="Completadas" value={byEstado.completada} max={maxEstado} color="#16A34A" total={totalTareas} delay={0.3} />
                </div>
              </div>

              {/* Stacked bar */}
              {totalTareas > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-2">Distribución</p>
                  <div className="h-4 rounded-full overflow-hidden flex">
                    {[
                      { pct: byEstado.bloqueada / totalTareas * 100, color: '#DC2626' },
                      { pct: byEstado['en-proceso'] / totalTareas * 100, color: '#0B5ED7' },
                      { pct: byEstado.pendiente / totalTareas * 100, color: '#D97706' },
                      { pct: byEstado.completada / totalTareas * 100, color: '#16A34A' },
                    ].map((s, i) => (
                      <motion.div
                        key={i}
                        initial={{ width: 0 }}
                        animate={{ width: `${s.pct}%` }}
                        transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                        style={{ background: s.color, minWidth: s.pct > 0 ? 3 : 0 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Top 3 bloqueadas alert */}
              {bloqueadas.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
                  <p className="text-xs font-bold text-danger uppercase tracking-wider mb-2">Requieren atención</p>
                  {bloqueadas.map(t => (
                    <div key={t.id} className="flex items-center gap-2.5 py-1.5 border-b border-red-100 last:border-0">
                      <div className="w-2 h-2 rounded-full bg-danger shrink-0" />
                      <span className="flex-1 text-xs text-ink">{t.texto}</span>
                      <span className="text-[10px] text-slate">{t.responsable || '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Tabla view for Tareas */
            (() => {
              const today = new Date().toISOString().slice(0, 10)
              const estadoOrder: Record<string, number> = { bloqueada: 0, 'en-proceso': 1, pendiente: 2, completada: 3 }
              const estadoColors: Record<string, string> = { bloqueada: '#DC2626', 'en-proceso': '#0B5ED7', pendiente: '#D97706', completada: '#16A34A' }
              const estadoIcons: Record<string, string> = { bloqueada: '!', 'en-proceso': '▶', pendiente: '○', completada: '✓' }
              const estadoLabels: Record<string, string> = { bloqueada: 'Bloqueada', 'en-proceso': 'En proceso', pendiente: 'Pendiente', completada: 'Completada' }
              const sorted = [...tareas].sort((a, b) => (estadoOrder[a.estado] ?? 9) - (estadoOrder[b.estado] ?? 9))
              const areaNames: Record<string, string> = {}
              AREAS_LIST.forEach(a => { areaNames[a.id] = a.name })

              return (
                <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                        <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate w-24">Estado</th>
                        <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate">Tarea</th>
                        <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate">Responsable</th>
                        <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate">Tipo</th>
                        <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate">Fecha compromiso</th>
                        <th className="text-left px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate">Area destino</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-slate text-xs">Sin tareas registradas.</td></tr>
                      )}
                      {sorted.map(t => {
                        const isOverdue = t.fecha_compromiso && t.fecha_compromiso < today && t.estado !== 'completada'
                        const eColor = estadoColors[t.estado] || '#94A3B8'
                        const tipoLabel = TAREA_TIPO_LABELS[t.tipo as TareaTipo] || t.tipo
                        const tipoColor = TAREA_TIPO_COLORS[t.tipo as TareaTipo] || '#64748B'

                        return (
                          <tr key={t.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0" style={{ background: eColor }}>
                                  {estadoIcons[t.estado] || '?'}
                                </span>
                                <span className="text-[10px] font-bold" style={{ color: eColor }}>{estadoLabels[t.estado] || t.estado}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 max-w-[280px]">
                              <span className="text-xs text-ink truncate block">{t.texto}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate">{t.responsable || '—'}</td>
                            <td className="px-4 py-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: tipoColor + '18', color: tipoColor }}>
                                {tipoLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold ${isOverdue ? 'text-[#DC2626]' : 'text-slate'}`}>
                                {t.fecha_compromiso ? fmtFecha(t.fecha_compromiso) : '—'}
                              </span>
                              {isOverdue && <span className="text-[9px] text-[#DC2626] font-bold ml-1">VENCIDA</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate">
                              {t.area_destino && t.area_destino !== areaId ? areaNames[t.area_destino] || t.area_destino : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()
          )}

          {ce && <SlideComment slideIdx={1} />}
        </div>

        {/* ── Slide 2: Compromisos + Minuta ── */}
        <div ref={el => { slideRefs.current[2] = el }} style={{ display: show(2) ? 'block' : 'none' }}>
          <Hdr color="#16A34A" text="Momento 3 · Compromisos y cierre" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-slate mb-2">Compromisos activos ({tareas.filter(t => t.estado !== 'completada').length})</p>
              {tareas.filter(t => t.estado !== 'completada').slice(0, 8).map(t => (
                <div key={t.id} className="flex items-start gap-2 py-1.5 border-b border-[#F1F5F9] last:border-0">
                  <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: t.estado === 'bloqueada' ? '#DC2626' : t.estado === 'en-proceso' ? '#0B5ED7' : '#94A3B8' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ink leading-snug truncate">{t.texto}</p>
                    <p className="text-[10px] text-slate">{t.responsable || '—'} · {t.fecha_compromiso ? fmtFecha(t.fecha_compromiso) : <span className="text-danger font-bold">sin fecha</span>}</p>
                  </div>
                </div>
              ))}
              {tareas.filter(t => t.estado !== 'completada').length > 8 && <p className="text-[10px] text-slate mt-1">... y {tareas.filter(t => t.estado !== 'completada').length - 8} más</p>}
              {tareas.filter(t => t.estado !== 'completada').length === 0 && <p className="text-xs text-slate py-2">Sin compromisos pendientes.</p>}
            </div>

            <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
              <div className="hero-gradient px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-white text-xs font-bold uppercase">Minuta</span>
                <span className="text-[10px] bg-success text-white px-2 py-0.5 rounded-full font-bold">{minutaLines.length}</span>
              </div>
              <div className="p-3.5 max-h-[200px] overflow-y-auto">
                {minutaLines.length === 0 && <p className="text-xs text-slate italic py-2">Los comentarios aparecerán aquí.</p>}
                {minutaLines.map((l, i) => (
                  <div key={i} className="flex items-start gap-2 py-1 border-b border-[#F1F5F9] last:border-0">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${l.tag === 'KPI' ? 'bg-cobalt-light text-cobalt' : 'bg-green-50 text-success'}`}>{l.tag}</span>
                    <span className="text-[11px] text-ink flex-1">{l.text}</span>
                  </div>
                ))}
              </div>
              <div className="px-3.5 py-2.5 border-t border-[#E2E8F0] flex gap-1.5">
                <button onClick={saveMinuta} className="px-3 py-1.5 bg-cobalt text-white text-xs rounded-lg font-semibold btn-scale">Guardar y cerrar</button>
                <button onClick={() => { const txt = minutaLines.map(l => `[${l.tag}] ${l.text}`).join('\n'); navigator.clipboard?.writeText(txt).then(() => toast('Copiada')) }}
                  className="px-3 py-1.5 border border-[#E2E8F0] text-xs rounded-lg font-semibold hover:bg-[#F1F5F9]">Copiar</button>
              </div>
            </div>
          </div>
          {ce && <SlideComment slideIdx={2} />}
        </div>

        {/* ── Slide 3: Minutas ── */}
        <div style={{ display: slide === 3 ? 'block' : 'none' }}>
          <Hdr color="#0B5ED7" text="Momento 4 · Biblioteca de Minutas" />
          {minutas.length === 0 ? (
            <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-12 text-center text-slate text-sm">Sin minutas anteriores.</div>
          ) : (
            <div className="space-y-2.5">
              {minutas.map(m => (
                <div key={m.id} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                  <button onClick={() => setMinutaExpanded(minutaExpanded === m.id ? null : m.id)} className="w-full flex items-center gap-3 p-4 hover:bg-[#F8FAFC] text-left">
                    <div className="w-2.5 h-2.5 rounded-full bg-cobalt shrink-0" />
                    <span className="text-sm font-bold">{fmtFecha(m.fecha)}</span>
                    {m.texto_completo && <span className="text-[11px] text-slate truncate flex-1">{m.texto_completo.slice(0, 80)}</span>}
                    <span className="text-slate text-sm shrink-0">{minutaExpanded === m.id ? '▲' : '▼'}</span>
                  </button>
                  {minutaExpanded === m.id && m.texto_completo && (
                    <div className="px-5 pb-4 border-t border-[#F1F5F9]">
                      <pre className="text-xs text-ink whitespace-pre-wrap mt-3 leading-relaxed font-sans">{m.texto_completo}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom */}
      {!pdfMode && (
        <div className="hero-gradient px-5 py-2.5 flex items-center gap-4">
          {['Sin fecha = no es compromiso', 'Verde = meta · Amarillo = alerta · Rojo = crítico'].map((r, i) => (
            <span key={i} className="text-xs text-white/40">{i > 0 && '· '}{r}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function Hdr({ color, text, right }: { color?: string; text: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-0.5 h-4 rounded" style={{ background: color || '#64748B' }} />
      <span className="text-xs font-black uppercase tracking-wider text-slate flex-1">{text}</span>
      {right}
    </div>
  )
}

function ViewToggleInline({ view, setView }: { view: 'cards' | 'tabla'; setView: (v: 'cards' | 'tabla') => void }) {
  return (
    <div className="flex gap-1 bg-[#F1F5F9] rounded p-0.5">
      <button onClick={() => setView('cards')}
        className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${view === 'cards' ? 'bg-white text-ink shadow-sm' : 'text-slate hover:text-ink'}`}>
        Tarjetas
      </button>
      <button onClick={() => setView('tabla')}
        className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${view === 'tabla' ? 'bg-white text-ink shadow-sm' : 'text-slate hover:text-ink'}`}>
        Tabla
      </button>
    </div>
  )
}
