'use client'
import { useMemo, useRef } from 'react'
import { useProjects } from '@/lib/comites/use-projects'
import { useEquipo } from '@/lib/comites/use-equipo'
import ObraFinCard from '@/components/comites/ObraFinCard'
import type { Proyecto } from '@/lib/types'
import { isObra } from '@/lib/types'
import { fmtMM } from '@/lib/comites/data'

export default function ObrasPanel() {
  const { projects, loading, save } = useProjects()
  const { equipo, loading: eqLoading } = useEquipo()
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

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
    return <div className="py-8 text-center text-slate-400 text-sm">Cargando datos financieros...</div>
  }

  return (
    <div>
      {/* Consolidado */}
      {obras.length > 0 && (
        <div className="bg-[#0F172A] rounded-xl p-5 grid grid-cols-5 gap-4 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Contratos Totales</p>
            <p className="font-condensed text-[28px] font-black text-gold leading-tight mt-1">{fmtMM(consol.tC)}</p>
            <p className="text-[10px] text-white/30 mt-0.5">
              {consol.activas} activa{consol.activas !== 1 ? 's' : ''}
              {consol.conSaldo > 0 && ` · ${consol.conSaldo} con saldo`}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Flujo Financiero</p>
            <p className="font-condensed text-[28px] font-black leading-tight mt-1" style={{ color: consol.flujoFin >= 0 ? '#E1BA10' : '#DC2626' }}>
              {consol.flujoFin >= 0 ? '+' : ''}{fmtMM(consol.flujoFin)}
            </p>
            <p className="text-[10px] text-white/30 mt-0.5">Facturado - Gasto Real</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Por Facturar</p>
            <p className="font-condensed text-[28px] font-black text-amber leading-tight mt-1">{fmtMM(consol.saldoFact)}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{consol.pctF}% facturado</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Saldo Proveedores</p>
            <p className="font-condensed text-[28px] font-black text-danger leading-tight mt-1">{fmtMM(consol.saldoProv)}</p>
            <p className="text-[10px] text-white/30 mt-0.5">Comp - Gastado - MO</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Margen Consolidado</p>
            <p className="font-condensed text-[28px] font-black leading-tight mt-1" style={{ color: consol.margen >= 0 ? '#E1BA10' : '#DC2626' }}>
              {consol.margen >= 0 ? '+' : ''}{fmtMM(consol.margen)}
            </p>
            <p className="text-[10px] text-white/30 mt-0.5">{consol.margenPct}%</p>
          </div>
        </div>
      )}

      {/* Obras list */}
      {obras.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate-400 text-sm">
          Sin obras con datos financieros. Agrega proyectos con estado Adjudicado o Activo desde el Maestro de Proyectos.
        </div>
      ) : (
        <>
          {activas.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 mt-5">
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
    </div>
  )
}
