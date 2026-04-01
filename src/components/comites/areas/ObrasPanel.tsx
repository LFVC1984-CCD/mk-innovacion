'use client'
import { useState, useMemo, useRef } from 'react'
import { useProjects } from '@/lib/comites/use-projects'
import { useEquipo } from '@/lib/comites/use-equipo'
import ObraFinCard from '@/components/comites/ObraFinCard'
import type { Proyecto } from '@/lib/types'
import { isObra } from '@/lib/types'
import { fmtMM } from '@/lib/comites/data'
import KpiCards from '@/components/comites/KpiCards'
import ViewToggle from '@/components/comites/ViewToggle'
import HBar from '@/components/comites/HBar'

export default function ObrasPanel() {
  const { projects, loading, save } = useProjects()
  const { equipo, loading: eqLoading } = useEquipo()
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [view, setView] = useState<'cards' | 'tabla' | 'grafico'>('cards')

  const obras = useMemo(() => {
    return projects
      .filter(p => isObra(p) || p.estado === 'cerrado_saldo')
      .sort((a, b) => {
        if (a.estado === 'cerrado_saldo' && b.estado !== 'cerrado_saldo') return 1
        if (a.estado !== 'cerrado_saldo' && b.estado === 'cerrado_saldo') return -1
        return a.nombre.localeCompare(b.nombre)
      })
  }, [projects])

  const activas = obras.filter(p => ['adjudicado', 'activo'].includes(p.estado))
  const conSaldo = obras.filter(p => p.estado === 'cerrado_saldo')

  const consol = useMemo(() => {
    let tC = 0, tF = 0, tN = 0, tP = 0, tG = 0, tCo = 0, tMO = 0
    obras.forEach(p => {
      tC += p.contrato; tF += p.facturado; tN += p.ndc; tP += p.presupuesto
      tG += p.gastado; tCo += p.comprometido; tMO += p.mano_obra
    })
    const pctF = tC > 0 ? Math.round((tF / tC) * 100) : 0
    const margen = tC - tP
    const margenPct = tC > 0 ? Math.round((margen / tC) * 1000) / 10 : 0
    const saldoFact = (tC + tN) - tF
    const gastoReal = tG + tMO
    const flujoFin = tF - gastoReal
    const saldoProv = tCo - tG - tMO
    return { tC, tF, pctF, margen, margenPct, saldoFact, saldoProv, flujoFin, gastoReal, activas: activas.length, conSaldo: conSaldo.length }
  }, [obras, activas.length, conSaldo.length])

  const equipoPorProyecto = useMemo(() => {
    const m: Record<string, string[]> = {}
    equipo.forEach(e => {
      if (e.proyecto_id && e.estado === 'activo') {
        if (!m[e.proyecto_id]) m[e.proyecto_id] = []
        m[e.proyecto_id].push(e.nombre)
      }
    })
    return m
  }, [equipo])

  function handleUpdate(proyecto: Proyecto, fields: Partial<Proyecto>) {
    const updated = { ...proyecto, ...fields }
    updated.comprometido = updated.oc + updated.sc + updated.adicionales + updated.gastos_matriz + updated.mano_obra
    if (updated.avance_prog > 0) updated.spi = Math.round((updated.avance_real / updated.avance_prog) * 100) / 100
    else updated.spi = 0
    const gastoReal = updated.gastado + updated.mano_obra
    if (gastoReal > 0) updated.cpi = Math.round((updated.facturado / gastoReal) * 100) / 100
    else updated.cpi = 0

    if (debounceRef.current[proyecto.id]) clearTimeout(debounceRef.current[proyecto.id])
    debounceRef.current[proyecto.id] = setTimeout(() => {
      save(updated)
    }, 800)
  }

  if (loading || eqLoading) {
    return (
      <div className="space-y-3">
        <div className="h-20 skeleton rounded-xl" />
        <div className="h-48 skeleton rounded-xl" />
      </div>
    )
  }

  return (
    <div>
      {/* Consolidado */}
      {obras.length > 0 && (<>
        <KpiCards items={[
          { label: 'Contratos Totales', value: fmtMM(consol.tC), color: '#E1BA10', sub: `${consol.activas} activa${consol.activas !== 1 ? 's' : ''}${consol.conSaldo > 0 ? ` · ${consol.conSaldo} con saldo` : ''}` },
          { label: 'Flujo Financiero', value: `${consol.flujoFin >= 0 ? '+' : ''}${fmtMM(consol.flujoFin)}`, color: consol.flujoFin >= 0 ? '#E1BA10' : '#DC2626', sub: 'Facturado - Gasto Real' },
          { label: 'Por Facturar', value: fmtMM(consol.saldoFact), color: '#D97706', sub: `${consol.pctF}% facturado` },
          { label: 'Margen Consolidado', value: `${consol.margen >= 0 ? '+' : ''}${fmtMM(consol.margen)}`, color: consol.margen >= 0 ? '#E1BA10' : '#DC2626', sub: `${consol.margenPct}%` },
        ]} />

        {/* Insight narrativo obras */}
        {activas.length > 0 && (() => {
          const sobreCosto = activas.filter(p => p.cpi > 0 && p.cpi < 0.85)
          const atrasadas = activas.filter(p => p.spi > 0 && p.spi < 0.85)
          return (
            <div className="mt-0 mb-4 p-3 rounded-lg bg-cobalt-light border border-cobalt/10">
              <p className="text-[11px] text-cobalt-dark leading-relaxed">
                <span className="font-bold">Margen consolidado: {consol.margenPct}% ({consol.margen >= 0 ? '+' : ''}{fmtMM(consol.margen)})</span>
                {' — '}{consol.activas} obra{consol.activas !== 1 ? 's' : ''} activa{consol.activas !== 1 ? 's' : ''}, {fmtMM(consol.saldoFact)} por facturar.
                {consol.saldoProv > 0 && <> Saldo proveedores: <b>{fmtMM(consol.saldoProv)}</b> (comprometido - gastado - MO).</>}
                {sobreCosto.length > 0 && <><br /><span className="text-red-600 font-bold">{sobreCosto.length} obra{sobreCosto.length > 1 ? 's' : ''} con CPI &lt; 0.85 (sobrecosto):</span> {sobreCosto.map(p => `${p.nombre} (${p.cpi})`).join(', ')}.</>}
                {atrasadas.length > 0 && <><br /><span className="text-red-600 font-bold">{atrasadas.length} obra{atrasadas.length > 1 ? 's' : ''} con SPI &lt; 0.85 (atraso):</span> {atrasadas.map(p => `${p.nombre} (${p.spi})`).join(', ')}.</>}
              </p>
            </div>
          )
        })()}
      </>)}

      {/* View toggle */}
      {obras.length > 0 && (
        <div className="flex justify-end mb-3">
          <ViewToggle view={view} onChange={v => setView(v)} options={['cards', 'tabla', 'grafico']} />
        </div>
      )}

      {/* Obras list */}
      {obras.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate-500 text-sm">
          Sin obras con datos financieros. Agrega proyectos con estado Adjudicado o Activo desde el Maestro de Proyectos.
        </div>
      ) : (<>

        {/* ═══ CARDS ═══ */}
        {view === 'cards' && (
          <>
            {activas.length > 0 && (
              <>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                  Obras Activas ({activas.length})
                </p>
                {activas.map(p => (
                  <ObraFinCard
                    key={p.id}
                    proyecto={p}
                    equipoNames={equipoPorProyecto[p.id] || []}
                    onUpdate={fields => handleUpdate(p, fields)}
                  />
                ))}
              </>
            )}

            {conSaldo.length > 0 && (
              <>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2 mt-5">
                  Cerradas con Saldo ({conSaldo.length})
                </p>
                {conSaldo.map(p => (
                  <ObraFinCard
                    key={p.id}
                    proyecto={p}
                    equipoNames={equipoPorProyecto[p.id] || []}
                    onUpdate={fields => handleUpdate(p, fields)}
                  />
                ))}
              </>
            )}
          </>
        )}

        {/* ═══ TABLA ═══ */}
        {view === 'tabla' && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead>
                <tr className="bg-[#F1F5F9] text-[10px] font-extrabold uppercase tracking-wider text-slate">
                  <th className="text-left p-3">Obra</th>
                  <th className="text-left p-3">Estado</th>
                  <th className="text-right p-3">Contrato</th>
                  <th className="text-right p-3">Facturado</th>
                  <th className="text-right p-3">Por Facturar</th>
                  <th className="text-right p-3">Comprometido</th>
                  <th className="text-right p-3">Margen</th>
                  <th className="text-center p-3">SPI</th>
                  <th className="text-center p-3">CPI</th>
                </tr>
              </thead>
              <tbody>
                {obras.map(p => {
                  const porFacturar = (p.contrato + p.ndc) - p.facturado
                  const margen = p.contrato - p.presupuesto
                  const margenPct = p.contrato > 0 ? Math.round((margen / p.contrato) * 1000) / 10 : 0
                  return (
                    <tr key={p.id} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-3 font-bold text-ink">{p.nombre}</td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          p.estado === 'activo' ? 'bg-green-100 text-green-700' :
                          p.estado === 'adjudicado' ? 'bg-cobalt/10 text-cobalt' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {p.estado === 'cerrado_saldo' ? 'Con saldo' : p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                        </span>
                      </td>
                      <td className="p-3 text-right font-condensed font-bold">{fmtMM(p.contrato)}</td>
                      <td className="p-3 text-right font-condensed font-bold text-cobalt">{fmtMM(p.facturado)}</td>
                      <td className="p-3 text-right font-condensed font-bold" style={{ color: '#D97706' }}>{fmtMM(porFacturar)}</td>
                      <td className="p-3 text-right font-condensed font-bold text-slate-600">{fmtMM(p.comprometido)}</td>
                      <td className="p-3 text-right">
                        <span className="font-condensed font-bold" style={{ color: margen >= 0 ? '#16A34A' : '#DC2626' }}>
                          {fmtMM(margen)} <span className="text-slate-400 font-normal text-[10px]">({margenPct}%)</span>
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-condensed font-bold" style={{ color: p.spi >= 0.95 ? '#16A34A' : p.spi >= 0.85 ? '#D97706' : '#DC2626' }}>
                          {p.spi > 0 ? p.spi.toFixed(2) : '—'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-condensed font-bold" style={{ color: p.cpi >= 0.95 ? '#16A34A' : p.cpi >= 0.85 ? '#D97706' : '#DC2626' }}>
                          {p.cpi > 0 ? p.cpi.toFixed(2) : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#F1F5F9] border-t border-[#E2E8F0]">
                  <td className="p-3 font-bold" colSpan={2}>Total ({obras.length})</td>
                  <td className="p-3 text-right font-condensed font-bold text-cobalt">{fmtMM(consol.tC)}</td>
                  <td className="p-3 text-right font-condensed font-bold text-cobalt">{fmtMM(consol.tF)}</td>
                  <td className="p-3 text-right font-condensed font-bold" style={{ color: '#D97706' }}>{fmtMM(consol.saldoFact)}</td>
                  <td className="p-3" />
                  <td className="p-3 text-right font-condensed font-bold" style={{ color: consol.margen >= 0 ? '#16A34A' : '#DC2626' }}>{fmtMM(consol.margen)}</td>
                  <td className="p-3" colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ═══ GRÁFICO ═══ */}
        {view === 'grafico' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate mb-3">Contrato vs Facturado por obra</p>
              <div className="space-y-2.5">
                {obras.filter(p => p.contrato > 0).map((p) => {
                  const maxVal = Math.max(...obras.map(o => o.contrato))
                  return (
                    <div key={p.id}>
                      <div className="flex items-center gap-3 mb-0.5">
                        <span className="text-[11px] font-semibold w-36 truncate">{p.nombre}</span>
                        <div className="flex-1 h-4 bg-[#F1F5F9] rounded-full overflow-hidden relative">
                          <div className="absolute inset-0 h-full rounded-full" style={{
                            width: `${maxVal > 0 ? (p.contrato / maxVal) * 100 : 0}%`,
                            background: '#E2E8F0',
                          }} />
                          <div className="absolute inset-0 h-full rounded-full transition-all" style={{
                            width: `${maxVal > 0 ? (p.facturado / maxVal) * 100 : 0}%`,
                            background: 'linear-gradient(90deg, #0B5ED7, #3B82F6)',
                          }} />
                        </div>
                        <span className="text-[10px] font-bold min-w-[60px] text-right text-cobalt">
                          {p.contrato > 0 ? Math.round((p.facturado / p.contrato) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 pt-2 border-t border-[#E2E8F0] flex gap-4 text-[10px]">
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-[#E2E8F0]" /> Contrato</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-cobalt" /> Facturado</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate mb-3">Margen por obra</p>
              <div className="space-y-2.5">
                {obras.filter(p => p.contrato > 0).sort((a, b) => (b.contrato - b.presupuesto) - (a.contrato - a.presupuesto)).map((p, i) => {
                  const margen = p.contrato - p.presupuesto
                  const maxMargen = Math.max(...obras.map(o => Math.abs(o.contrato - o.presupuesto)), 1)
                  return (
                    <HBar key={p.id} label={p.nombre} value={margen} max={maxMargen}
                      color={margen >= 0 ? '#16A34A' : '#DC2626'} delay={i * 0.06} />
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </>)}
    </div>
  )
}
