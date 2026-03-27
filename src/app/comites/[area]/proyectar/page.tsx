'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useAuth, useAreaData } from '@/lib/comites/hooks'
import { useAutoKpis } from '@/lib/comites/use-auto-kpis'
import { toast } from '@/components/ui/Toast'
import { fmtFecha, fmtFechaDate } from '@/lib/comites/data'
import { createClient } from '@/lib/supabase/client'
import { AREAS_LIST, TAREA_TIPO_LABELS, TAREA_TIPO_COLORS } from '@/lib/types'
import type { AreaId } from '@/lib/types'
import KPIDashboard from '@/components/comites/KPIDashboard'
import TareaMatrix from '@/components/comites/TareaMatrix'
import PDFExportButton from '@/components/comites/PDFExportButton'

const MT = [5 * 60, 5 * 60, 5 * 60, 5 * 60]
const ML = ['Momento 1 — Scoreboard', 'Momento 2 — Estado de Tareas', 'Momento 3 — Compromisos y Cierre', 'Momento 4 — Biblioteca de Minutas']

interface MinutaRow { id: string; fecha: string; texto_completo: string | null; enviada: boolean; created_at: string }

export default function ProyectarPage({ params }: { params: { area: string } }) {
  const areaId = params.area
  const { loading: authLoading, canEdit } = useAuth()
  const { kpis, tareas, loading, refresh, supabase } = useAreaData(areaId as AreaId)
  const { kpis: autoKpis, loading: autoLoading } = useAutoKpis(areaId as AreaId)
  const areaInfo = AREAS_LIST.find(a => a.id === areaId)
  const isRRHH = areaId === 'rrhh'

  const [slide, setSlide] = useState(0)
  const [timerSec, setTimerSec] = useState(MT[0])
  const [timerMax, setTimerMax] = useState(MT[0])
  const [timerRunning, setTimerRunning] = useState(false)
  const [minutaLines, setMinutaLines] = useState<{ tag: string; text: string }[]>([])
  const [minutas, setMinutas] = useState<MinutaRow[]>([])
  const [minutaExpanded, setMinutaExpanded] = useState<string | null>(null)
  const slideRef = useRef<HTMLDivElement>(null)

  // Timer
  useEffect(() => {
    if (!timerRunning) return
    const int = setInterval(() => {
      setTimerSec(s => {
        if (s <= 0) { setTimerRunning(false); toast('Tiempo agotado'); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(int)
  }, [timerRunning])

  function changeSlide(n: number) {
    setSlide(n)
    setTimerSec(MT[n])
    setTimerMax(MT[n])
    setTimerRunning(false)
  }

  // Keyboard
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); if (slide < 3) changeSlide(slide + 1) }
    if (e.key === 'ArrowLeft' && slide > 0) changeSlide(slide - 1)
    if (e.key === 'Escape') window.history.back()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide])
  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // Build minuta
  useEffect(() => {
    const lines: typeof minutaLines = []
    kpis.filter(k => k.comentario).forEach(k => {
      lines.push({ tag: 'KPI', text: `${k.nombre}: ${k.comentario}` })
    })
    tareas.filter(t => t.from_decision).forEach(t => {
      lines.push({ tag: 'Tarea', text: `${t.texto} · ${t.responsable || 'por asignar'}` })
    })
    setMinutaLines(lines)
  }, [kpis, tareas])

  // Load minutas for slide 3
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
    await supabase.from('minutas').insert({
      area_id: areaId, lineas: minutaLines, texto_completo: texto,
    })
    for (const k of kpis) {
      await supabase.from('kpi_historial').insert({ kpi_id: k.id, valor: k.valor })
    }
    toast('Reunión cerrada y minuta guardada')
  }

  function copyMinuta() {
    const txt = minutaLines.map(l => `[${l.tag}] ${l.text}`).join('\n')
    navigator.clipboard?.writeText(txt).then(() => toast('Minuta copiada'))
  }

  if (authLoading || loading || autoLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-cobalt border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const timerMin = Math.floor(timerSec / 60)
  const timerS = timerSec % 60
  const timerPct = timerMax > 0 ? (timerSec / timerMax) * 100 : 0
  const ce = canEdit(areaId)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="hero-gradient px-7 py-3.5 flex items-center justify-between">
        <div>
          <h1 className="font-condensed font-black text-3xl text-white uppercase tracking-wide">
            {areaInfo?.name} <span className="text-gold">·</span>
          </h1>
          <p className="text-white/40 text-xs uppercase tracking-widest mt-0.5">
            Comité · {fmtFechaDate(new Date())} · MK Ingeniería
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={() => slide > 0 && changeSlide(slide - 1)} className="px-3 py-1.5 rounded text-xs font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20">←</button>
          <div className="flex flex-col items-center">
            <span className="text-white/50 text-xs">{slide + 1}/4</span>
            <div className="flex gap-1.5 mt-1">
              {[0, 1, 2, 3].map(i => (
                <button key={i} onClick={() => changeSlide(i)} className={`rounded-full border-none transition-all ${i === slide ? 'bg-gold w-2.5 h-2.5 scale-110' : 'bg-white/25 w-2 h-2 hover:bg-white/40'}`} />
              ))}
            </div>
          </div>
          <button onClick={() => slide < 3 && changeSlide(slide + 1)} className="px-3 py-1.5 rounded text-xs font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20">→</button>
          <PDFExportButton targetRef={slideRef} filename={`comite-${areaId}`} areaName={areaInfo?.name || areaId} />
          <Link href={`/comites/${areaId}`} className="px-3 py-1.5 rounded text-xs font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20 ml-2">Editar</Link>
          <Link href="/comites" className="px-3 py-1.5 rounded text-xs font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20">Salir</Link>
        </div>
      </div>

      {/* Timer bar */}
      <div className="flex items-center justify-between px-7 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <span className="text-xs font-bold text-slate uppercase tracking-wider">{ML[slide]}</span>
        <span className={`font-condensed font-black text-xl ${timerSec < 60 ? 'text-danger' : 'text-cobalt'}`}>
          {timerMin}:{String(timerS).padStart(2, '0')}
        </span>
        <div className="flex gap-1.5">
          <button onClick={() => setTimerRunning(!timerRunning)} className="px-3 py-1 border border-[#E2E8F0] rounded text-xs font-semibold hover:bg-[#F1F5F9]">
            {timerRunning ? 'Pausar' : 'Iniciar'}
          </button>
          <button onClick={() => { setTimerSec(MT[slide]); setTimerRunning(false) }} className="px-3 py-1 border border-[#E2E8F0] rounded text-xs font-semibold hover:bg-[#F1F5F9]">Reset</button>
        </div>
      </div>
      <div className="h-1 bg-[#F1F5F9]">
        <div className="h-full transition-all duration-1000" style={{ width: `${timerPct}%`, background: timerSec < 60 ? '#DC2626' : timerSec < timerMax * 0.3 ? '#D97706' : '#E1BA10' }} />
      </div>

      {/* Slides */}
      <div ref={slideRef} className="px-7 py-5">

        {/* ═══ Slide 0: KPI Scoreboard ═══ */}
        {slide === 0 && (
          <div>
            <SectionHeader color={areaInfo?.color} text="Momento 1 · Scoreboard — Indicadores del período" />

            {/* Auto KPIs */}
            {!isRRHH && autoKpis.length > 0 ? (
              <KPIDashboard kpis={autoKpis} areaColor={areaInfo?.color} />
            ) : (
              /* Manual KPIs for RRHH */
              <div className="grid grid-cols-2 gap-3.5">
                {kpis.map(k => {
                  const color = k.status === 'verde' ? '#16A34A' : k.status === 'amarillo' ? '#D97706' : '#DC2626'
                  return (
                    <div key={k.id} className="bg-[#F8FAFC] rounded-lg p-4 border border-[#E2E8F0]" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
                      <div className="text-xs font-bold uppercase tracking-widest text-slate mb-2">{k.nombre}</div>
                      <div className="flex items-baseline gap-2.5 mb-1.5">
                        <span className="font-condensed font-black text-4xl" style={{ color }}>{k.valor}</span>
                        {k.meta && <span className="text-xs text-slate">meta: {k.meta}</span>}
                      </div>
                      {ce && (
                        <div className="mt-2.5 pt-2.5 border-t border-[#E2E8F0]">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-slate mb-1">Comentario para minuta</div>
                          <input type="text" placeholder="Contexto para el comité..." defaultValue={k.comentario}
                            onBlur={async (e) => { await supabase.from('kpis').update({ comentario: e.target.value }).eq('id', k.id); refresh() }}
                            className="w-full text-xs px-2 py-1.5 border border-[#E2E8F0] rounded outline-none focus:border-cobalt" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {kpis.length === 0 && autoKpis.length === 0 && <p className="text-sm text-slate text-center py-8">Sin indicadores.</p>}

            {/* Compromisos anteriores */}
            {tareas.filter(t => t.estado !== 'completada').length > 0 && (
              <div className="bg-cobalt-light border border-blue-200 rounded-lg p-4 mt-5">
                <div className="text-xs font-bold text-cobalt uppercase tracking-wider mb-2">Compromisos anteriores pendientes</div>
                {tareas.filter(t => t.estado !== 'completada').map(t => (
                  <div key={t.id} className="flex items-center gap-2.5 py-1.5 border-b border-blue-200 last:border-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.estado === 'en-proceso' ? '#0B5ED7' : t.estado === 'bloqueada' ? '#DC2626' : '#94A3B8' }} />
                    <span className="flex-1 text-xs text-ink">{t.texto}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: TAREA_TIPO_COLORS[t.tipo || 'seguimiento'] + '15', color: TAREA_TIPO_COLORS[t.tipo || 'seguimiento'] }}>
                      {TAREA_TIPO_LABELS[t.tipo || 'seguimiento']}
                    </span>
                    <span className="text-xs text-slate">{t.responsable}</span>
                    {t.fecha_compromiso ? <span className="text-xs text-cobalt font-semibold">{fmtFecha(t.fecha_compromiso)}</span> : <span className="text-[10px] text-danger font-bold">sin fecha</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ Slide 1: Tareas por estado + tipo ═══ */}
        {slide === 1 && (
          <div>
            <SectionHeader color="#D97706" text="Momento 2 · Estado de Tareas — por tipo y estado" />
            <TareaMatrix tareas={tareas} />
          </div>
        )}

        {/* ═══ Slide 2: Compromisos + Minuta ═══ */}
        {slide === 2 && (
          <div>
            <SectionHeader color="#16A34A" text="Momento 3 · Compromisos y cierre" />
            <div className="grid grid-cols-2 gap-4">
              {/* Compromisos */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate mb-2">Compromisos — confirmar responsable y fecha</p>
                {tareas.map(t => (
                  <div key={t.id} className="flex items-start gap-2.5 py-2 border-b border-[#F1F5F9] last:border-0">
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${t.estado === 'completada' ? 'bg-success border-success' : 'border-[#CBD5E1]'}`}>
                      {t.estado === 'completada' && <span className="text-white text-[9px] font-black">✓</span>}
                    </div>
                    <div>
                      <p className="text-sm text-ink font-medium">{t.texto}</p>
                      <p className="text-xs text-slate mt-0.5">
                        {t.responsable || 'Sin asignar'} · {t.fecha_compromiso ? fmtFecha(t.fecha_compromiso) : <span className="text-danger font-semibold">sin fecha</span>}
                      </p>
                    </div>
                  </div>
                ))}
                {tareas.length === 0 && <p className="text-xs text-slate">Sin compromisos.</p>}
                <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-bold text-danger">Regla: sin fecha = no es compromiso</p>
                </div>
              </div>

              {/* Minuta */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <div className="hero-gradient px-3.5 py-2.5 flex items-center justify-between">
                  <span className="text-white text-xs font-bold uppercase tracking-wider">Minuta emergente</span>
                  <span className="text-[10px] bg-success text-white px-2 py-0.5 rounded-full font-bold">{minutaLines.length}</span>
                </div>
                <div className="p-3.5">
                  {minutaLines.length === 0 && <p className="text-xs text-slate italic py-2">Los comentarios a KPIs y tareas nuevas aparecerán aquí.</p>}
                  {minutaLines.map((l, i) => (
                    <div key={i} className="flex items-start gap-2 py-1.5 border-b border-[#F1F5F9] last:border-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${l.tag === 'KPI' ? 'bg-cobalt-light text-cobalt' : 'bg-green-50 text-success'}`}>{l.tag}</span>
                      <span className="text-xs text-ink flex-1">{l.text}</span>
                    </div>
                  ))}
                </div>
                <div className="px-3.5 py-2.5 border-t border-[#E2E8F0] flex gap-1.5">
                  <button onClick={saveMinuta} className="px-3 py-1.5 bg-cobalt text-white text-xs rounded-lg font-semibold btn-scale">Guardar y cerrar</button>
                  <button onClick={copyMinuta} className="px-3 py-1.5 border border-[#E2E8F0] text-xs rounded-lg font-semibold hover:bg-[#F1F5F9]">Copiar texto</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Slide 3: Biblioteca de Minutas ═══ */}
        {slide === 3 && (
          <div>
            <SectionHeader color="#0B5ED7" text="Momento 4 · Biblioteca de Minutas — historial de sesiones" />
            {minutas.length === 0 ? (
              <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-12 text-center text-slate text-sm">
                Sin minutas anteriores para esta área.
              </div>
            ) : (
              <div className="space-y-2.5">
                {minutas.map(m => {
                  const isExp = minutaExpanded === m.id
                  return (
                    <div key={m.id} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                      <button onClick={() => setMinutaExpanded(isExp ? null : m.id)} className="w-full flex items-center gap-3 p-4 hover:bg-[#F8FAFC] transition-colors text-left">
                        <div className="w-2.5 h-2.5 rounded-full bg-cobalt shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold">{fmtFecha(m.fecha)}</span>
                          {m.enviada && <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-50 text-success">Enviada</span>}
                          {m.texto_completo && <p className="text-[11px] text-slate truncate mt-0.5">{m.texto_completo.slice(0, 100)}</p>}
                        </div>
                        <span className="text-slate text-sm">{isExp ? '▲' : '▼'}</span>
                      </button>
                      {isExp && m.texto_completo && (
                        <div className="px-5 pb-4 border-t border-[#F1F5F9]">
                          <pre className="text-xs text-ink whitespace-pre-wrap mt-3 leading-relaxed font-sans">{m.texto_completo}</pre>
                          <p className="text-[10px] text-slate mt-2">Creada: {new Date(m.created_at).toLocaleString('es-CL')}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="hero-gradient px-5 py-2.5 flex items-center gap-4 flex-wrap">
        {['Enviar notas la noche anterior', 'Sin fecha = no es compromiso', 'Verde = meta · Amarillo = alerta · Rojo = crítico'].map((r, i) => (
          <span key={i} className="text-xs text-white/40">{i > 0 && '· '}{r}</span>
        ))}
      </div>
    </div>
  )
}

function SectionHeader({ color, text }: { color?: string; text: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-0.5 h-4 rounded" style={{ background: color || '#64748B' }} />
      <span className="text-xs font-black uppercase tracking-widest text-slate">{text}</span>
    </div>
  )
}
