'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth, useAreaData } from '@/lib/comites/hooks'
import ToastContainer, { toast } from '@/components/ui/Toast'
import { fmtFecha, fmtFechaDate } from '@/lib/comites/data'
import { AREAS_LIST } from '@/lib/types'
import type { AreaId } from '@/lib/types'

const MT = [5 * 60, 10 * 60, 5 * 60]
const ML = ['Momento 1 — Scoreboard', 'Momento 2 — Problemas y Alertas', 'Momento 3 — Compromisos y Cierre']

export default function ProyectarPage({ params }: { params: { area: string } }) {
  const areaId = params.area
  const { loading: authLoading, canEdit } = useAuth()
  const { kpis, tareas, loading, refresh, supabase } = useAreaData(areaId as AreaId)
  const areaInfo = AREAS_LIST.find(a => a.id === areaId)

  const [slide, setSlide] = useState(0)
  const [timerSec, setTimerSec] = useState(MT[0])
  const [timerMax, setTimerMax] = useState(MT[0])
  const [timerRunning, setTimerRunning] = useState(false)
  const [minutaLines, setMinutaLines] = useState<{ tag: string; text: string; origin: string }[]>([])

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

  // Keyboard navigation
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); if (slide < 2) changeSlide(slide + 1) }
    if (e.key === 'ArrowLeft' && slide > 0) changeSlide(slide - 1)
    if (e.key === 'Escape') window.history.back()
  }, [slide])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // Build minuta
  useEffect(() => {
    const lines: typeof minutaLines = []
    kpis.filter(k => k.comentario).forEach(k => {
      if (!lines.find(l => l.text === `${k.nombre}: ${k.comentario}`))
        lines.push({ tag: 'KPI', text: `${k.nombre}: ${k.comentario}`, origin: 'comentario KPI' })
    })
    tareas.filter(t => t.from_decision).forEach(t => {
      const txt = `${t.texto} · ${t.responsable || 'por asignar'}`
      if (!lines.find(l => l.text === txt))
        lines.push({ tag: 'Tarea', text: txt, origin: 'compromiso' })
    })
    setMinutaLines(lines)
  }, [kpis, tareas])

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
    navigator.clipboard?.writeText(txt).then(() => toast('Minuta copiada al portapapeles'))
  }

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando...</div>

  const timerMin = Math.floor(timerSec / 60)
  const timerS = timerSec % 60
  const timerPct = timerMax > 0 ? (timerSec / timerMax) * 100 : 0
  const ce = canEdit(areaId)

  const tagColors: Record<string, { bg: string; text: string }> = {
    'KPI': { bg: '#EFF6FF', text: '#0B5ED7' },
    'Tarea': { bg: '#DCFCE7', text: '#16A34A' },
  }

  // Clasificar tareas por estado para Slide 1
  const tareasBloquedas = tareas.filter(t => t.estado === 'bloqueada')
  const tareasEnProceso = tareas.filter(t => t.estado === 'en-proceso')
  const tareasPendientes = tareas.filter(t => t.estado === 'pendiente')
  const tareasCompletadas = tareas.filter(t => t.estado === 'completada')

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-cobalt px-7 py-3.5 flex items-center justify-between">
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
            <span className="text-white/50 text-xs">{slide + 1}/3</span>
            <div className="flex gap-1.5 mt-1">
              {[0, 1, 2].map(i => (
                <button key={i} onClick={() => changeSlide(i)} className={`rounded-full border-none transition-all ${i === slide ? 'bg-gold w-2.5 h-2.5 scale-110' : 'bg-white/25 w-2 h-2 hover:bg-white/40'}`} />
              ))}
            </div>
          </div>
          <button onClick={() => slide < 2 && changeSlide(slide + 1)} className="px-3 py-1.5 rounded text-xs font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20">→</button>
          <Link href={`/comites/${areaId}`} className="px-3 py-1.5 rounded text-xs font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20 ml-2">Editar</Link>
          <Link href="/comites" className="px-3 py-1.5 rounded text-xs font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20">Salir</Link>
        </div>
      </div>

      {/* Timer bar */}
      <div className="flex items-center justify-between px-7 py-2 bg-cobalt/[.04] border-b border-slate-200">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{ML[slide]}</span>
        <span className={`font-condensed font-black text-xl ${timerSec < 60 ? 'text-red-500' : 'text-cobalt'}`}>
          {timerMin}:{String(timerS).padStart(2, '0')}
        </span>
        <div className="flex gap-1.5">
          <button onClick={() => setTimerRunning(!timerRunning)} className="px-3 py-1 border border-slate-200 rounded text-xs font-semibold">
            {timerRunning ? 'Pausar' : 'Iniciar'}
          </button>
          <button onClick={() => { setTimerSec(MT[slide]); setTimerRunning(false) }} className="px-3 py-1 border border-slate-200 rounded text-xs font-semibold">Reset</button>
        </div>
      </div>
      <div className="h-1 bg-slate-100">
        <div className="h-full transition-all duration-1000" style={{ width: `${timerPct}%`, background: timerSec < 60 ? '#DC2626' : timerSec < timerMax * 0.3 ? '#D97706' : '#E1BA10' }} />
      </div>

      {/* Slides */}
      <div className="px-7 py-5">
        {/* Slide 0: KPIs */}
        {slide === 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-0.5 h-4 rounded" style={{ background: areaInfo?.color }} />
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Momento 1 · Scoreboard — KPIs de la semana</span>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              {kpis.map(k => {
                const color = k.status === 'ok' ? '#16A34A' : k.status === 'warn' ? '#D97706' : '#DC2626'
                return (
                  <div key={k.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2.5">{k.nombre}</div>
                    {k.tipo === 'zero' ? (
                      <div className={`rounded-lg p-3 flex items-center gap-3 ${parseFloat(String(k.valor).replace(/[^0-9.-]/g, '')) === 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                        <span className="text-2xl">{parseFloat(String(k.valor).replace(/[^0-9.-]/g, '')) === 0 ? '✓' : '⚠'}</span>
                        <div>
                          <div className={`text-base font-bold ${parseFloat(String(k.valor).replace(/[^0-9.-]/g, '')) === 0 ? 'text-green-800' : 'text-red-800'}`}>
                            {parseFloat(String(k.valor).replace(/[^0-9.-]/g, '')) === 0 ? `Sin ${k.nombre.toLowerCase()} registrados` : `${k.valor} registrado${parseFloat(String(k.valor).replace(/[^0-9.-]/g, '')) !== 1 ? 's' : ''}`}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-2.5 mb-1.5">
                          <span className="font-condensed font-black text-4xl" style={{ color }}>{k.valor}</span>
                          <span className="text-xs text-slate-400">meta: {k.meta}</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-1">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, k.meta ? (parseFloat(String(k.valor).replace(/[^0-9.-]/g, '')) / parseFloat(String(k.meta).replace(/[^0-9.-]/g, '')) || 1) * 100 : 60)}%`, background: color }} />
                        </div>
                      </>
                    )}
                    {ce && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-200">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Comentario para minuta</div>
                        <input type="text" placeholder="Agrega contexto para el comité..." defaultValue={k.comentario}
                          onBlur={async (e) => {
                            await supabase.from('kpis').update({ comentario: e.target.value }).eq('id', k.id)
                            refresh()
                          }}
                          className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-cobalt" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {kpis.length === 0 && <p className="text-sm text-slate-400 text-center py-8">Sin indicadores definidos.</p>}

            {/* Compromisos anteriores */}
            <div className="bg-cobalt-light border border-blue-200 rounded-lg p-4 mt-4">
              <div className="text-xs font-bold text-cobalt uppercase tracking-wider mb-2">Compromisos de reunión anterior</div>
              {tareas.filter(t => t.estado !== 'completada').length === 0 && <p className="text-xs text-slate-400">Sin compromisos pendientes.</p>}
              {tareas.filter(t => t.estado !== 'completada').map(t => (
                <div key={t.id} className="flex items-center gap-2.5 py-1.5 border-b border-blue-200 last:border-0">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.estado === 'en-proceso' ? '#0B5ED7' : t.estado === 'bloqueada' ? '#DC2626' : '#94A3B8' }} />
                  <span className="flex-1 text-xs text-ink">{t.texto}</span>
                  <span className="text-xs text-slate-400">{t.responsable}</span>
                  {t.fecha_compromiso ? (
                    <span className="text-xs text-cobalt font-semibold">{fmtFecha(t.fecha_compromiso)}</span>
                  ) : (
                    <span className="text-[10px] text-red-500 font-bold">sin fecha</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Slide 1: Problemas y Alertas */}
        {slide === 1 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-0.5 h-4 rounded bg-amber" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Momento 2 · Problemas, Alertas y Estado de Tareas</span>
            </div>

            {/* Bloqueadas primero (alertas) */}
            {tareasBloquedas.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Bloqueadas — requieren atención</div>
                {tareasBloquedas.map(t => (
                  <div key={t.id} className="flex items-start gap-2.5 py-2.5 border-b border-red-100 last:border-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 bg-red-500" />
                    <div className="flex-1">
                      <p className="text-sm text-ink font-medium">{t.texto}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t.responsable || 'Sin asignar'}
                        {t.fecha_compromiso && ` · ${fmtFecha(t.fecha_compromiso)}`}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-600 flex-shrink-0">Bloqueada</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tareas en proceso y pendientes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-cobalt px-3.5 py-2.5 flex items-center justify-between">
                  <span className="text-white text-xs font-bold">En proceso</span>
                  <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full">{tareasEnProceso.length}</span>
                </div>
                <div className="p-3.5">
                  {tareasEnProceso.map(t => (
                    <div key={t.id} className="flex items-start gap-2.5 py-2.5 border-b border-slate-200 last:border-0">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 bg-cobalt" />
                      <div className="flex-1">
                        <p className="text-sm text-ink font-medium">{t.texto}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{t.responsable || 'Sin asignar'}</p>
                        {t.fecha_compromiso ? (
                          <p className="text-xs text-cobalt font-semibold">{fmtFecha(t.fecha_compromiso)}</p>
                        ) : (
                          <p className="text-xs text-red-500 font-semibold">Sin fecha</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {tareasEnProceso.length === 0 && <p className="text-xs text-slate-400 py-2">Sin tareas en proceso.</p>}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-amber px-3.5 py-2.5 flex items-center justify-between">
                  <span className="text-white text-xs font-bold">Pendientes</span>
                  <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full">{tareasPendientes.length}</span>
                </div>
                <div className="p-3.5">
                  {tareasPendientes.map(t => (
                    <div key={t.id} className="flex items-start gap-2.5 py-2.5 border-b border-slate-200 last:border-0">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 bg-slate-400" />
                      <div className="flex-1">
                        <p className="text-sm text-ink font-medium">{t.texto}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{t.responsable || 'Sin asignar'}</p>
                        {t.fecha_compromiso ? (
                          <p className="text-xs text-cobalt font-semibold">{fmtFecha(t.fecha_compromiso)}</p>
                        ) : (
                          <p className="text-xs text-red-500 font-semibold">Sin fecha</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {tareasPendientes.length === 0 && <p className="text-xs text-slate-400 py-2">Sin tareas pendientes.</p>}
                </div>
              </div>
            </div>

            {/* Completadas */}
            {tareasCompletadas.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">Completadas esta semana</div>
                {tareasCompletadas.map(t => (
                  <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-green-100 last:border-0">
                    <span className="text-green-500 text-sm">✓</span>
                    <span className="flex-1 text-xs text-ink line-through opacity-60">{t.texto}</span>
                    <span className="text-xs text-slate-400">{t.responsable}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Slide 2: Compromisos + Minuta */}
        {slide === 2 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-0.5 h-4 rounded bg-green-500" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Momento 3 · Compromisos y cierre</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Compromisos */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Compromisos de hoy — confirmar responsable y fecha</div>
                {tareas.map(t => (
                  <div key={t.id} className="flex items-start gap-2.5 py-2 border-b border-slate-100 last:border-0">
                    <div className={`w-4.5 h-4.5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${t.estado === 'completada' ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                      {t.estado === 'completada' && <span className="text-white text-[9px] font-black">✓</span>}
                    </div>
                    <div>
                      <p className="text-sm text-ink font-medium">{t.texto}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t.responsable || 'Sin asignar'} · {t.fecha_compromiso
                          ? fmtFecha(t.fecha_compromiso)
                          : <span className="text-red-500 font-semibold">sin fecha — agregar antes de cerrar</span>
                        }
                      </p>
                    </div>
                  </div>
                ))}
                {tareas.length === 0 && <p className="text-xs text-slate-400">Sin compromisos activos.</p>}

                <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-xs font-bold text-red-600">Regla: sin fecha = no es compromiso</div>
                  <div className="text-xs text-red-800 mt-0.5">Toda tarea debe tener responsable + fecha antes de cerrar la reunión.</div>
                </div>
              </div>

              {/* Minuta */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-ink px-3.5 py-2.5 flex items-center justify-between">
                  <span className="text-white text-xs font-bold uppercase tracking-wider">Minuta emergente</span>
                  <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full font-bold">{minutaLines.length} línea{minutaLines.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="p-3.5">
                  {minutaLines.length === 0 && (
                    <p className="text-xs text-slate-400 italic py-2">La minuta se construye automáticamente. Los comentarios a KPIs y tareas nuevas aparecerán aquí.</p>
                  )}
                  {minutaLines.map((l, i) => {
                    const tc = tagColors[l.tag] || { bg: '#F8FAFC', text: '#64748B' }
                    return (
                      <div key={i} className="flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0" style={{ background: tc.bg, color: tc.text }}>{l.tag}</span>
                        <span className="text-xs text-ink flex-1">{l.text}</span>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">{l.origin}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="px-3.5 py-2.5 border-t border-slate-200 flex gap-1.5">
                  <button onClick={saveMinuta} className="px-3 py-1.5 bg-cobalt text-white text-xs rounded font-semibold">Guardar y cerrar reunión</button>
                  <button onClick={copyMinuta} className="px-3 py-1.5 border border-slate-200 text-xs rounded font-semibold">Copiar texto</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom rules */}
      <div className="bg-ink px-5 py-2.5 flex items-center gap-4 flex-wrap">
        {['Enviar notas a Felipe la noche anterior', 'Sin fecha = no es compromiso', 'Verde = en meta · Amarillo = alerta · Rojo = crítico'].map((r, i) => (
          <span key={i} className="text-xs text-white/40">{i > 0 && '· '}{r}</span>
        ))}
      </div>
      <ToastContainer />
    </div>
  )
}
