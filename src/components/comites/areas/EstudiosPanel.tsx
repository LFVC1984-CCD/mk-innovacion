'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProjects } from '@/lib/comites/use-projects'
import type { ProyectoEstado } from '@/lib/types'
import { isEstudio, ESTADO_LABELS, ESTADO_COLORS } from '@/lib/types'
import { fmtMM, fmtFecha } from '@/lib/comites/data'
import KpiCards from '@/components/comites/KpiCards'
import ViewToggle from '@/components/comites/ViewToggle'
import HBar from '@/components/comites/HBar'
import PlanInversionPanel from './PlanInversionPanel'

const ESTUDIO_ESTADOS: ProyectoEstado[] = ['en_evaluacion', 'en_estudio', 'en_aclaracion', 'sin_informacion']
const RESULTADO_ESTADOS: ProyectoEstado[] = ['adjudicado', 'no_adjudicado', 'excusa']

type SubTab = 'pipeline' | 'inversion'

export default function EstudiosPanel() {
  const [subTab, setSubTab] = useState<SubTab>('pipeline')
  const [pipeView, setPipeView] = useState<'cards' | 'tabla' | 'grafico'>('tabla')
  const { projects, loading } = useProjects()

  // Pipeline: proyectos en etapa de estudio
  const pipeline = useMemo(() =>
    projects.filter(p => isEstudio(p)).sort((a, b) => {
      const order = ESTUDIO_ESTADOS
      return order.indexOf(a.estado) - order.indexOf(b.estado)
    }),
  [projects])

  // Resultados recientes: adjudicados, no adjudicados, excusa (últimos 6 meses aprox)
  const resultados = useMemo(() =>
    projects.filter(p => RESULTADO_ESTADOS.includes(p.estado)).slice(0, 8),
  [projects])

  // Consolidado pipeline
  const consol = useMemo(() => {
    let totalMonto = 0
    let totalMargen = 0
    const porEstado: Record<string, { count: number; monto: number }> = {}
    pipeline.forEach(p => {
      totalMonto += p.monto_licitacion
      totalMargen += p.monto_licitacion * (p.margen_estudio_pct / 100)
      const key = p.estado
      if (!porEstado[key]) porEstado[key] = { count: 0, monto: 0 }
      porEstado[key].count++
      porEstado[key].monto += p.monto_licitacion
    })
    return { totalMonto, totalMargen, porEstado, total: pipeline.length }
  }, [pipeline])

  // Tasa de adjudicación
  const tasaAdj = useMemo(() => {
    const adj = projects.filter(p => p.estado === 'adjudicado' || p.estado === 'activo').length
    const noAdj = projects.filter(p => p.estado === 'no_adjudicado' || p.estado === 'excusa').length
    const total = adj + noAdj
    return total > 0 ? Math.round((adj / total) * 100) : 0
  }, [projects])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-20 skeleton rounded-xl" />
        <div className="h-48 skeleton rounded-xl" />
      </div>
    )
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 mb-5 border-b border-[#E2E8F0] pb-0">
        {([
          { id: 'pipeline' as const, label: 'Pipeline', count: pipeline.length },
          { id: 'inversion' as const, label: 'Plan de Inversion' },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`relative px-4 py-2.5 text-xs font-bold transition-all ${
              subTab === t.id ? 'text-cobalt' : 'text-slate hover:text-ink'
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`ml-1.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                subTab === t.id ? 'bg-cobalt/10 text-cobalt' : 'bg-slate-100 text-slate'
              }`}>{t.count}</span>
            )}
            {subTab === t.id && (
              <motion.div
                layoutId="estudios-subtab"
                className="absolute bottom-0 left-2 right-2 h-0.5 bg-cobalt rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
      {subTab === 'inversion' && (
        <motion.div key="inversion" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
          <PlanInversionPanel />
        </motion.div>
      )}

      {subTab === 'pipeline' && (
        <motion.div key="pipeline" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
      {/* Consolidado */}
      <KpiCards items={[
        { label: 'Pipeline Total', value: fmtMM(consol.totalMonto), color: '#E1BA10', sub: `${consol.total} proyecto${consol.total !== 1 ? 's' : ''} en estudio` },
        { label: 'Margen Estimado', value: fmtMM(Math.round(consol.totalMargen)), color: consol.totalMargen >= 0 ? '#E1BA10' : '#DC2626', sub: `${consol.totalMonto > 0 ? Math.round((consol.totalMargen / consol.totalMonto) * 100) : 0}% promedio` },
        { label: 'Tasa Adjudicación', value: `${tasaAdj}%`, color: tasaAdj >= 30 ? '#16A34A' : tasaAdj >= 15 ? '#D97706' : '#DC2626', sub: 'Adjudicados / (Adj + No adj)' },
        { label: 'Por Estado', value: consol.total, color: '#0B5ED7', sub: ESTUDIO_ESTADOS.filter(est => consol.porEstado[est]).map(est => `${ESTADO_LABELS[est]}: ${consol.porEstado[est]!.count}`).join(' · ') },
      ]} />

      {/* Insight narrativo pipeline */}
      {pipeline.length > 0 && (() => {
        const sinInfo = pipeline.filter(p => p.estado === 'sin_informacion').length
        const adj = resultados.filter(p => p.estado === 'adjudicado').length
        const noAdj = resultados.filter(p => p.estado === 'no_adjudicado').length
        return (
          <div className="mt-0 mb-4 p-3 rounded-lg bg-cobalt-light border border-cobalt/10">
            <p className="text-[11px] text-cobalt-dark leading-relaxed">
              <span className="font-bold">Pipeline: {fmtMM(consol.totalMonto)} en {consol.total} proyecto{consol.total !== 1 ? 's' : ''}</span>
              {' — '}tasa de adjudicacion historica: <b>{tasaAdj}%</b>.
              {sinInfo > 0 && <><br /><span className="text-red-600 font-bold">{sinInfo} proyecto{sinInfo > 1 ? 's' : ''} sin informacion actualizada</span> — requiere{sinInfo === 1 ? '' : 'n'} seguimiento.</>}
              {(adj > 0 || noAdj > 0) && <><br />Resultados recientes: <span className="text-green-700 font-bold">{adj} adjudicado{adj !== 1 ? 's' : ''}</span> vs <span className="text-red-600 font-bold">{noAdj} no adjudicado{noAdj !== 1 ? 's' : ''}</span>.</>}
            </p>
          </div>
        )
      })()}

      {/* ViewToggle + Pipeline */}
      {pipeline.length > 0 && (
        <div className="flex justify-end mb-3">
          <ViewToggle view={pipeView} onChange={v => setPipeView(v)} options={['cards', 'tabla', 'grafico']} />
        </div>
      )}

      {pipeline.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate-500 text-sm">
          Sin proyectos en estudio. Agrega proyectos desde el Maestro de Proyectos.
        </div>
      ) : (<>

      {/* ═══ TABLA ═══ */}
      {pipeView === 'tabla' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                <th className="text-left px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Proyecto</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Mandante</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Estado</th>
                <th className="text-right px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Monto ($MM)</th>
                <th className="text-right px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Margen Est.</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Oferta</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Obs.</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.map(p => {
                const margenEst = p.monto_licitacion * (p.margen_estudio_pct / 100)
                return (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                    <td className="px-3.5 py-2.5 font-semibold text-ink">{p.nombre}</td>
                    <td className="px-3.5 py-2.5 text-slate-500">{p.mandante || '—'}</td>
                    <td className="px-3.5 py-2.5">
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: ESTADO_COLORS[p.estado] + '15', color: ESTADO_COLORS[p.estado] }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: ESTADO_COLORS[p.estado] }} />
                        {ESTADO_LABELS[p.estado]}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-condensed font-bold text-ink">
                      {p.monto_licitacion > 0 ? fmtMM(p.monto_licitacion) : '—'}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      {p.margen_estudio_pct > 0 ? (
                        <span className="font-condensed font-bold" style={{ color: p.margen_estudio_pct >= 15 ? '#16A34A' : '#D97706' }}>
                          {p.margen_estudio_pct}% <span className="text-slate-500 font-normal">({fmtMM(Math.round(margenEst))})</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-500">
                      {p.fecha_oferta ? fmtFecha(p.fecha_oferta) : <span className="text-red-400 font-semibold">sin fecha</span>}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-500 max-w-[180px] truncate" title={p.observacion || ''}>
                      {p.observacion || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-[#E2E8F0]">
                <td className="px-3.5 py-2.5 font-bold text-ink" colSpan={3}>
                  Total Pipeline ({pipeline.length})
                </td>
                <td className="px-3.5 py-2.5 text-right font-condensed font-bold text-cobalt">
                  {fmtMM(consol.totalMonto)}
                </td>
                <td className="px-3.5 py-2.5 text-right font-condensed font-bold text-green-600">
                  {fmtMM(Math.round(consol.totalMargen))}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ═══ CARDS ═══ */}
      {pipeView === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {pipeline.map(p => (
              <motion.div key={p.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                className="bg-white rounded-xl border border-[#E2E8F0] p-4 hover:shadow-md hover:border-[#CBD5E1] transition-all cursor-pointer"
                style={{ borderLeftWidth: 3, borderLeftColor: ESTADO_COLORS[p.estado] }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-ink truncate">{p.nombre}</h3>
                    {p.mandante && <p className="text-[11px] text-slate-500">{p.mandante}</p>}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: ESTADO_COLORS[p.estado] + '15', color: ESTADO_COLORS[p.estado] }}>
                    {ESTADO_LABELS[p.estado]}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <p className="text-slate-400">Monto</p>
                    <p className="font-condensed font-bold text-ink">{p.monto_licitacion > 0 ? fmtMM(p.monto_licitacion) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Margen</p>
                    <p className="font-condensed font-bold" style={{ color: p.margen_estudio_pct >= 15 ? '#16A34A' : '#D97706' }}>
                      {p.margen_estudio_pct > 0 ? `${p.margen_estudio_pct}%` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Oferta</p>
                    <p className="font-bold text-ink">
                      {p.fecha_oferta ? fmtFecha(p.fecha_oferta) : <span className="text-red-400">sin fecha</span>}
                    </p>
                  </div>
                </div>
                {p.observacion && <p className="text-[10px] text-slate-500 mt-2 truncate">{p.observacion}</p>}
              </motion.div>
          ))}
        </div>
      )}

      {/* ═══ GRÁFICO ═══ */}
      {pipeView === 'grafico' && (() => {
        const porMandante = new Map<string, { name: string; monto: number; count: number }>()
        pipeline.forEach(p => {
          const key = p.mandante || 'Sin mandante'
          const entry = porMandante.get(key) || { name: key, monto: 0, count: 0 }
          entry.monto += p.monto_licitacion
          entry.count++
          porMandante.set(key, entry)
        })
        const groups = Array.from(porMandante.values()).sort((a, b) => b.monto - a.monto)
        const maxMonto = groups[0]?.monto || 1

        const porEstado = ESTUDIO_ESTADOS.map(est => ({
          name: ESTADO_LABELS[est],
          monto: consol.porEstado[est]?.monto || 0,
          count: consol.porEstado[est]?.count || 0,
          color: ESTADO_COLORS[est],
        })).filter(e => e.count > 0)
        const maxEstMonto = porEstado[0]?.monto || 1

        return (
          <div className="space-y-4 mb-4">
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate mb-3">Pipeline por mandante</p>
              <div className="space-y-2.5">
                {groups.map((g, i) => (
                  <HBar key={g.name} label={`${g.name} (${g.count})`} value={g.monto} max={maxMonto}
                    color="#0B5ED7" delay={i * 0.06} />
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate mb-3">Monto por estado</p>
              <div className="space-y-2.5">
                {porEstado.map((e, i) => (
                  <HBar key={e.name} label={`${e.name} (${e.count})`} value={e.monto} max={maxEstMonto}
                    color={e.color} delay={i * 0.06} />
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      </>)}

      {/* Resultados recientes */}
      {resultados.length > 0 && (
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
            Resultados recientes
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {resultados.map(p => {
              const isAdj = p.estado === 'adjudicado'
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-lg border border-[#E2E8F0] p-3"
                  style={{ borderLeftWidth: 3, borderLeftColor: ESTADO_COLORS[p.estado] }}
                >
                  <p className="text-xs font-semibold text-ink truncate" title={p.nombre}>{p.nombre}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{p.mandante || '—'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: ESTADO_COLORS[p.estado] + '15', color: ESTADO_COLORS[p.estado] }}
                    >
                      {ESTADO_LABELS[p.estado]}
                    </span>
                    {isAdj && p.monto_adjudicado > 0 && (
                      <span className="font-condensed font-bold text-xs text-green-600">{fmtMM(p.monto_adjudicado)}</span>
                    )}
                    {!isAdj && p.monto_licitacion > 0 && (
                      <span className="font-condensed font-bold text-xs text-slate-500">{fmtMM(p.monto_licitacion)}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}
