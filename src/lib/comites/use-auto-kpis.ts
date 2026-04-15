'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProjects } from './use-projects'
import { isObra, isEstudio } from '@/lib/types'
import type { AreaId } from '@/lib/types'

// ══════════════════════════════════════
//  AutoKPI Interface
// ══════════════════════════════════════

export interface AutoKPI {
  key: string
  nombre: string
  valor: string
  valorNum?: number
  meta?: string
  status: 'ok' | 'warn' | 'bad'
  formato: 'numero' | 'dinero' | 'porcentaje' | 'indice' | 'zero'
  icono?: string
}

// ══════════════════════════════════════
//  HOOK
// ══════════════════════════════════════

const supabase = createClient()

export function useAutoKpis(areaId: AreaId | string) {
  const { projects, loading: projLoading } = useProjects()

  // Extra data for areas that need their own tables
  const [extraData, setExtraData] = useState<Record<string, unknown[]>>({})
  const [extraLoading, setExtraLoading] = useState(true)

  useEffect(() => {
    async function loadExtra() {
      setExtraLoading(true)
      const data: Record<string, unknown[]> = {}

      if (areaId === 'legal') {
        const [{ data: causas }, { data: docs }] = await Promise.all([
          supabase.from('causas_legal').select('*'),
          supabase.from('documentos_legal').select('id, causa_id'),
        ])
        data.causas = (causas || []).map((c: Record<string, unknown>) => ({ ...c, monto_reclamado: Number(c.monto_reclamado) || 0, monto_provision: Number(c.monto_provision) || 0 }))
        data.docs = docs || []
      }
      if (areaId === 'prevencion') {
        const [{ data: eventos }, { data: stats }, { data: metricas }] = await Promise.all([
          supabase.from('eventos_seguridad').select('*'),
          supabase.from('estadisticas_seguridad').select('*'),
          supabase.from('metricas_rrhh').select('*').order('mes', { ascending: false }).limit(1),
        ])
        data.eventos = (eventos || []).map((e: Record<string, unknown>) => ({ ...e, dias_perdidos: Number(e.dias_perdidos) || 0 }))
        data.stats = (stats || []).map((s: Record<string, unknown>) => ({
          ...s,
          hh_trabajadas: Number(s.hh_trabajadas) || 0,
          capacitaciones_horas: Number(s.capacitaciones_horas) || 0,
          n_accidentes: Number(s.n_accidentes) || 0,
          dias_perdidos_accidentes: Number(s.dias_perdidos_accidentes) || 0,
          dias_perdidos_enfermedad: Number(s.dias_perdidos_enfermedad) || 0,
          tasa_frecuencia: Number(s.tasa_frecuencia) || 0,
          tasa_gravedad: Number(s.tasa_gravedad) || 0,
        }))
        data.metricas_rrhh = (metricas || []).map((m: Record<string, unknown>) => ({
          ...m,
          dotacion_constructora: Number(m.dotacion_constructora) || 0,
          dotacion_subcontrato: Number(m.dotacion_subcontrato) || 0,
          trabajadores_vigentes: Number(m.trabajadores_vigentes) || 0,
          capacitaciones_horas: Number(m.capacitaciones_horas) || 0,
        }))
      }
      if (areaId === 'rrhh') {
        const [metricas, dotacion, docs, caps, eventos] = await Promise.all([
          supabase.from('metricas_rrhh').select('*').order('mes', { ascending: false }).limit(1),
          supabase.from('dotacion').select('*'),
          supabase.from('documentacion_rrhh').select('*'),
          supabase.from('capacitaciones').select('*'),
          supabase.from('eventos_seguridad').select('tipo, fecha, gravedad'),
        ])
        data.metricas = (metricas.data || []).map((m: Record<string, unknown>) => ({
          ...m,
          dotacion_constructora: Number(m.dotacion_constructora) || 0,
          dotacion_subcontrato: Number(m.dotacion_subcontrato) || 0,
          trabajadores_vigentes: Number(m.trabajadores_vigentes) || 0,
          desvinculaciones: Number(m.desvinculaciones) || 0,
          tasa_asistencia: Number(m.tasa_asistencia) || 0,
        }))
        data.dotacion = dotacion.data || []
        data.docs = docs.data || []
        data.capacitaciones = (caps.data || []).map((c: Record<string, unknown>) => ({
          ...c,
          horas: Number(c.horas) || 0,
        }))
        data.eventos_seg = eventos.data || []
      }
      if (areaId === 'eti') {
        const [{ data: herr }, { data: innov }] = await Promise.all([
          supabase.from('herramientas_eti').select('*'),
          supabase.from('proyectos_innovacion').select('*'),
        ])
        data.herramientas = (herr || []).map((h: Record<string, unknown>) => ({ ...h, costo_mensual_usd: Number(h.costo_mensual_usd) || 0, costo_anual_usd: Number(h.costo_anual_usd) || 0, usuarios: Number(h.usuarios) || 0 }))
        data.innovacion = (innov || []).map((p: Record<string, unknown>) => ({ ...p, presupuesto_usd: Number(p.presupuesto_usd) || 0 }))
      }
      if (areaId === 'finanzas') {
        const [{ data: flujo }, { data: lc }] = await Promise.all([
          supabase.from('flujo_financiero').select('*'),
          supabase.from('lineas_credito').select('*'),
        ])
        data.flujo = (flujo || []).map((l: Record<string, unknown>) => ({ ...l, monto: Number(l.monto) || 0 }))
        data.lineas_credito = (lc || []).map((l: Record<string, unknown>) => ({ ...l, monto: Number(l.monto) || 0 }))
      }

      setExtraData(data)
      setExtraLoading(false)
    }
    loadExtra()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId])

  const loading = projLoading || extraLoading

  const kpis = useMemo<AutoKPI[]>(() => {
    if (loading) return []

    switch (areaId) {
      case 'obras': return computeObras(projects)
      case 'estudios': return computeEstudios(projects)
      case 'legal': return computeLegal(extraData)
      case 'prevencion': return computePrevencion(extraData)
      case 'eti': return computeETI(extraData)
      case 'finanzas': return computeFinanzas(extraData, projects)
      case 'rrhh': return computeRRHH(extraData, projects)
      default: return []
    }
  }, [areaId, projects, extraData, loading])

  return { kpis, loading }
}

// ══════════════════════════════════════
//  COMPUTE FUNCTIONS
// ══════════════════════════════════════

function fmtM(n: number): string {
  return `$${n.toLocaleString('es-CL')} MM`
}

function computeObras(projects: { contrato: number; facturado: number; ndc: number; presupuesto: number; gastado: number; mano_obra: number; comprometido: number; avance_real: number; avance_prog: number; estado: string }[]): AutoKPI[] {
  const obras = projects.filter(p => isObra(p as never) || p.estado === 'cerrado_saldo')
  const activas = obras.filter(p => p.estado !== 'cerrado_saldo' && p.estado !== 'cerrado')
  let tC = 0, tF = 0, tP = 0, tG = 0, tMO = 0
  let sumSPI = 0, sumCPI = 0, countSPICPI = 0
  obras.forEach(p => { tC += p.contrato; tF += p.facturado; tP += p.presupuesto; tG += p.gastado; tMO += p.mano_obra })
  activas.forEach(p => {
    if (p.avance_prog > 0) { sumSPI += p.avance_real / p.avance_prog; countSPICPI++ }
    const gastoR = p.gastado + p.mano_obra
    if (gastoR > 0 && p.facturado > 0) { sumCPI += p.facturado / gastoR }
  })
  const pctF = tC > 0 ? Math.round((tF / tC) * 100) : 0
  const margenPct = tC > 0 ? Math.round(((tC - tP) / tC) * 1000) / 10 : 0
  const flujo = tF - (tG + tMO)
  const spiProm = countSPICPI > 0 ? Math.round((sumSPI / countSPICPI) * 100) / 100 : 0
  const cpiProm = countSPICPI > 0 ? Math.round((sumCPI / countSPICPI) * 100) / 100 : 0

  return [
    { key: 'activas', nombre: 'Obras Activas', valor: `${activas.length}`, valorNum: activas.length, status: activas.length > 0 ? 'ok' : 'warn', formato: 'numero' },
    { key: 'contrato', nombre: 'Contrato Total', valor: fmtM(tC), valorNum: tC, status: 'ok', formato: 'dinero' },
    { key: 'flujo', nombre: 'Flujo Financiero', valor: fmtM(flujo), valorNum: flujo, status: flujo >= 0 ? 'ok' : 'bad', formato: 'dinero' },
    { key: 'margen', nombre: 'Margen', valor: `${margenPct}%`, valorNum: margenPct, meta: '≥10%', status: margenPct >= 10 ? 'ok' : margenPct >= 5 ? 'warn' : 'bad', formato: 'porcentaje' },
    { key: 'facturado', nombre: '% Facturado', valor: `${pctF}%`, valorNum: pctF, status: 'ok', formato: 'porcentaje' },
    { key: 'spi', nombre: 'SPI Promedio', valor: `${spiProm}`, valorNum: spiProm, meta: '≥1.0', status: spiProm >= 1 ? 'ok' : spiProm >= 0.9 ? 'warn' : 'bad', formato: 'indice' },
    { key: 'cpi', nombre: 'CPI Promedio', valor: `${cpiProm}`, valorNum: cpiProm, meta: '≥1.0', status: cpiProm >= 1 ? 'ok' : cpiProm >= 0.9 ? 'warn' : 'bad', formato: 'indice' },
  ]
}

function computeEstudios(projects: { monto_licitacion: number; margen_estudio_pct: number; estado: string }[]): AutoKPI[] {
  const pipeline = projects.filter(p => isEstudio(p as never))
  let totalMonto = 0, totalMargen = 0
  pipeline.forEach(p => { totalMonto += p.monto_licitacion; totalMargen += p.monto_licitacion * (p.margen_estudio_pct / 100) })
  const avgMargen = totalMonto > 0 ? Math.round((totalMargen / totalMonto) * 100) : 0

  const adj = projects.filter(p => p.estado === 'adjudicado' || p.estado === 'activo').length
  const noAdj = projects.filter(p => p.estado === 'no_adjudicado' || p.estado === 'excusa').length
  const tasaAdj = (adj + noAdj) > 0 ? Math.round((adj / (adj + noAdj)) * 100) : 0

  return [
    { key: 'pipeline', nombre: 'En Pipeline', valor: `${pipeline.length}`, valorNum: pipeline.length, status: pipeline.length > 0 ? 'ok' : 'warn', formato: 'numero' },
    { key: 'monto', nombre: 'Pipeline Total', valor: fmtM(totalMonto), valorNum: totalMonto, status: 'ok', formato: 'dinero' },
    { key: 'tasa', nombre: 'Tasa Adjudicación', valor: `${tasaAdj}%`, valorNum: tasaAdj, meta: '≥30%', status: tasaAdj >= 30 ? 'ok' : tasaAdj >= 20 ? 'warn' : 'bad', formato: 'porcentaje' },
    { key: 'margen', nombre: 'Margen Estimado', valor: `${avgMargen}%`, valorNum: avgMargen, meta: '≥8%', status: avgMargen >= 8 ? 'ok' : avgMargen >= 5 ? 'warn' : 'bad', formato: 'porcentaje' },
  ]
}

function computeLegal(data: Record<string, unknown[]>): AutoKPI[] {
  const causas = (data.causas || []) as { estado: string; riesgo: string; monto_reclamado: number; monto_provision: number }[]
  const docs = (data.docs || []) as { id: string }[]
  const activas = causas.filter(c => ['activa', 'en_negociacion', 'en_arbitraje'].includes(c.estado))
  const altoRiesgo = activas.filter(c => c.riesgo === 'alto').length
  const totalReclamado = activas.reduce((s, c) => s + c.monto_reclamado, 0)
  const totalProvision = activas.reduce((s, c) => s + c.monto_provision, 0)

  return [
    { key: 'activas', nombre: 'Causas Activas', valor: `${activas.length}`, valorNum: activas.length, status: activas.length === 0 ? 'ok' : activas.length <= 3 ? 'warn' : 'bad', formato: 'numero' },
    { key: 'riesgo', nombre: 'Riesgo Alto', valor: `${altoRiesgo}`, valorNum: altoRiesgo, status: altoRiesgo === 0 ? 'ok' : 'bad', formato: 'zero' },
    { key: 'reclamado', nombre: 'Monto Reclamado', valor: fmtM(totalReclamado), valorNum: totalReclamado, status: totalReclamado === 0 ? 'ok' : 'warn', formato: 'dinero' },
    { key: 'provision', nombre: 'Provisión', valor: fmtM(totalProvision), valorNum: totalProvision, status: totalProvision === 0 ? 'ok' : 'bad', formato: 'dinero' },
    { key: 'docs', nombre: 'Documentos', valor: `${docs.length}`, valorNum: docs.length, status: 'ok', formato: 'numero' },
  ]
}

function computePrevencion(data: Record<string, unknown[]>): AutoKPI[] {
  const eventos = (data.eventos || []) as { tipo: string; dias_perdidos: number; cerrado: boolean }[]
  const stats = (data.stats || []) as { hh_trabajadas: number; capacitaciones_horas: number }[]
  const metricasRRHH = (data.metricas_rrhh || []) as { dotacion_constructora: number; dotacion_subcontrato: number; capacitaciones_horas: number }[]

  const accidentes = eventos.filter(e => e.tipo === 'accidente_trabajo' || e.tipo === 'accidente_trayecto')
  const diasPerdidos = eventos.reduce((s, e) => s + e.dias_perdidos, 0)
  const sinCerrar = eventos.filter(e => !e.cerrado).length
  const totalHH = stats.reduce((s, st) => s + st.hh_trabajadas, 0)
  const tasaFrec = totalHH > 0 ? Math.round((accidentes.length * 1_000_000) / totalHH * 10) / 10 : 0
  const tasaGrav = totalHH > 0 ? Math.round((diasPerdidos * 1_000_000) / totalHH * 10) / 10 : 0
  const totalCap = stats.reduce((s, st) => s + st.capacitaciones_horas, 0)

  // Cross-module KPIs from metricas_rrhh
  const dotConst = metricasRRHH.length > 0 ? metricasRRHH[0].dotacion_constructora : 0
  const dotSC = metricasRRHH.length > 0 ? metricasRRHH[0].dotacion_subcontrato : 0
  const dotTotal = dotConst + dotSC

  const tasaConst = dotConst > 0 ? Math.round((accidentes.length / dotConst) * 1000) / 10 : 0
  const tasaSC = dotSC > 0 ? Math.round((accidentes.length / dotSC) * 1000) / 10 : 0
  const capPerCapita = dotTotal > 0 ? Math.round((totalCap / dotTotal) * 10) / 10 : 0

  const result: AutoKPI[] = [
    { key: 'accidentes', nombre: 'Accidentes', valor: `${accidentes.length}`, valorNum: accidentes.length, status: accidentes.length === 0 ? 'ok' : 'bad', formato: 'zero' },
    { key: 'tasa_frec', nombre: 'Tasa Frecuencia', valor: `${tasaFrec}`, valorNum: tasaFrec, meta: '<5', status: tasaFrec === 0 ? 'ok' : tasaFrec < 5 ? 'warn' : 'bad', formato: 'indice' },
    { key: 'tasa_grav', nombre: 'Tasa Gravedad', valor: `${tasaGrav}`, valorNum: tasaGrav, meta: '<100', status: tasaGrav === 0 ? 'ok' : tasaGrav < 100 ? 'warn' : 'bad', formato: 'indice' },
    { key: 'hh', nombre: 'HH Trabajadas', valor: `${Math.round(totalHH / 1000)}K`, valorNum: totalHH, status: 'ok', formato: 'numero' },
    { key: 'sin_cerrar', nombre: 'Eventos Sin Cerrar', valor: `${sinCerrar}`, valorNum: sinCerrar, status: sinCerrar === 0 ? 'ok' : 'bad', formato: 'zero' },
    { key: 'capacitacion', nombre: 'Horas Capacitación', valor: `${Math.round(totalCap)}`, valorNum: totalCap, status: totalCap > 0 ? 'ok' : 'warn', formato: 'numero' },
  ]

  // Only add cross-module KPIs if we have RRHH data
  if (dotTotal > 0) {
    result.push(
      { key: 'tasa_const', nombre: 'Tasa x Constructora', valor: `${tasaConst}%`, valorNum: tasaConst, meta: '0%', status: tasaConst === 0 ? 'ok' : tasaConst <= 5 ? 'warn' : 'bad', formato: 'porcentaje' },
      { key: 'tasa_sc', nombre: 'Tasa x Subcontrato', valor: `${tasaSC}%`, valorNum: tasaSC, meta: '0%', status: tasaSC === 0 ? 'ok' : tasaSC <= 5 ? 'warn' : 'bad', formato: 'porcentaje' },
      { key: 'cap_percapita', nombre: 'Hrs Cap. per Cápita', valor: `${capPerCapita}`, valorNum: capPerCapita, meta: '≥2', status: capPerCapita >= 2 ? 'ok' : capPerCapita >= 1 ? 'warn' : 'bad', formato: 'indice' },
    )
  }

  return result
}

function computeETI(data: Record<string, unknown[]>): AutoKPI[] {
  const herramientas = (data.herramientas || []) as { estado: string; costo_mensual_usd: number; costo_anual_usd: number; usuarios: number }[]
  const innovacion = (data.innovacion || []) as { estado: string; presupuesto_usd: number }[]

  const activas = herramientas.filter(h => h.estado === 'activa')
  const costoMensual = activas.reduce((s, h) => s + h.costo_mensual_usd, 0)
  const totalCosto = costoMensual * 12 + activas.reduce((s, h) => s + h.costo_anual_usd, 0)
  const totalUsuarios = activas.reduce((s, h) => s + h.usuarios, 0)
  const proyActivos = innovacion.filter(p => ['idea', 'en_desarrollo', 'piloto'].includes(p.estado)).length

  return [
    { key: 'herr_activas', nombre: 'Herramientas Activas', valor: `${activas.length}`, valorNum: activas.length, status: 'ok', formato: 'numero' },
    { key: 'costo_mes', nombre: 'Costo Mensual', valor: `USD ${costoMensual.toLocaleString('es-CL')}`, valorNum: costoMensual, status: 'ok', formato: 'dinero' },
    { key: 'costo_anual', nombre: 'Gasto Anual Est.', valor: `USD ${totalCosto.toLocaleString('es-CL')}`, valorNum: totalCosto, status: 'ok', formato: 'dinero' },
    { key: 'usuarios', nombre: 'Usuarios Totales', valor: `${totalUsuarios}`, valorNum: totalUsuarios, status: 'ok', formato: 'numero' },
    { key: 'innovacion', nombre: 'Proyectos Innovación', valor: `${proyActivos}`, valorNum: proyActivos, status: proyActivos > 0 ? 'ok' : 'warn', formato: 'numero' },
  ]
}

function computeFinanzas(data: Record<string, unknown[]>, projects: { facturado: number; ndc: number; oc: number; sc: number; adicionales: number; mano_obra: number; gastos_matriz: number; contrato: number; estado: string }[]): AutoKPI[] {
  const obras = projects.filter(p => isObra(p as never) || p.estado === 'cerrado_saldo')
  const lineasCred = (data.lineas_credito || []) as { monto: number }[]
  const oficina = (data.flujo || []) as { tipo: string; monto: number }[]

  // Ingresos: facturación + NDC + líneas de crédito
  const ingFacturacion = obras.reduce((s, p) => s + p.facturado, 0)
  const ingNDC = obras.reduce((s, p) => s + p.ndc, 0)
  const ingLineas = lineasCred.reduce((s, l) => s + l.monto, 0)
  const totalIng = ingFacturacion + ingNDC + ingLineas

  // Egresos: proveedores + MO + gastos matriz + oficina
  const egProveedores = obras.reduce((s, p) => s + (p.oc || 0) + (p.sc || 0) + (p.adicionales || 0), 0)
  const egMO = obras.reduce((s, p) => s + p.mano_obra, 0)
  const egMatriz = obras.reduce((s, p) => s + (p.gastos_matriz || 0), 0)
  const egOficina = oficina.filter(l => l.tipo === 'egreso').reduce((s, l) => s + l.monto, 0)
  const totalEg = egProveedores + egMO + egMatriz + egOficina

  const saldoNeto = totalIng - totalEg

  return [
    { key: 'ingresos', nombre: 'Ingresos Totales', valor: fmtM(totalIng), valorNum: totalIng, status: 'ok', formato: 'dinero' },
    { key: 'egresos', nombre: 'Egresos Totales', valor: fmtM(totalEg), valorNum: totalEg, status: 'ok', formato: 'dinero' },
    { key: 'saldo', nombre: 'Saldo Neto', valor: fmtM(saldoNeto), valorNum: saldoNeto, status: saldoNeto >= 0 ? 'ok' : 'bad', formato: 'dinero' },
    { key: 'oficina', nombre: 'Oficina Central', valor: fmtM(egOficina), valorNum: egOficina, status: 'ok', formato: 'dinero' },
    { key: 'facturacion', nombre: 'Facturación Obras', valor: fmtM(ingFacturacion), valorNum: ingFacturacion, status: 'ok', formato: 'dinero' },
  ]
}

function computeRRHH(data: Record<string, unknown[]>, projects: { mano_obra: number; estado: string }[]): AutoKPI[] {
  const metricas = (data.metricas || []) as { dotacion_constructora: number; dotacion_subcontrato: number; trabajadores_vigentes: number; desvinculaciones: number; tasa_asistencia: number }[]
  const dotacion = (data.dotacion || []) as { estado: string }[]
  const docs = (data.docs || []) as { fecha_vencimiento: string }[]
  const capacitaciones = (data.capacitaciones || []) as { estado: string; horas: number }[]
  const eventosSeg = (data.eventos_seg || []) as { tipo: string; fecha: string; gravedad: string }[]

  // Dotación Total
  let dotTotal: number
  if (metricas.length > 0) {
    dotTotal = metricas[0].dotacion_constructora + metricas[0].dotacion_subcontrato
  } else {
    dotTotal = dotacion.filter(d => d.estado === 'activo').length
  }

  // Tasa Rotación
  let tasaRot = 0
  if (metricas.length > 0 && metricas[0].trabajadores_vigentes > 0) {
    tasaRot = Math.round((metricas[0].desvinculaciones / metricas[0].trabajadores_vigentes) * 1000) / 10
  }

  // Tasa Asistencia
  let tasaAsis = 0
  if (metricas.length > 0) {
    tasaAsis = metricas[0].tasa_asistencia
  }

  // Docs por vencer (within 30 days)
  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const docsPorVencer = docs.filter(d => {
    if (!d.fecha_vencimiento) return false
    const fv = new Date(d.fecha_vencimiento)
    return fv >= now && fv <= in30
  }).length

  // Horas Capacitación (completadas)
  const horasCap = capacitaciones
    .filter(c => c.estado === 'completada')
    .reduce((s, c) => s + c.horas, 0)

  // Accidentes del mes actual (cross-módulo)
  const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const accidentesMes = eventosSeg.filter(e =>
    (e.tipo === 'accidente_trabajo' || e.tipo === 'accidente_trayecto') &&
    e.fecha && e.fecha.startsWith(mesActual)
  ).length

  // Costo MO Total (cross-módulo) — active obras
  const obrasActivas = projects.filter(p => p.estado !== 'cerrado_saldo' && p.estado !== 'cerrado')
  const costoMO = obrasActivas.reduce((s, p) => s + (p.mano_obra || 0), 0)

  return [
    { key: 'dotacion', nombre: 'Dotación Total', valor: `${dotTotal}`, valorNum: dotTotal, status: dotTotal > 0 ? 'ok' : 'warn', formato: 'numero' },
    { key: 'rotacion', nombre: 'Tasa Rotación', valor: `${tasaRot}%`, valorNum: tasaRot, meta: '<5%', status: tasaRot <= 5 ? 'ok' : tasaRot <= 10 ? 'warn' : 'bad', formato: 'porcentaje' },
    { key: 'asistencia', nombre: 'Tasa Asistencia', valor: `${tasaAsis}%`, valorNum: tasaAsis, meta: '≥95%', status: tasaAsis >= 95 ? 'ok' : tasaAsis >= 90 ? 'warn' : 'bad', formato: 'porcentaje' },
    { key: 'docs_vencer', nombre: 'Docs por Vencer', valor: `${docsPorVencer}`, valorNum: docsPorVencer, status: docsPorVencer === 0 ? 'ok' : docsPorVencer <= 3 ? 'warn' : 'bad', formato: 'zero', icono: '📄' },
    { key: 'horas_cap', nombre: 'Horas Capacitación', valor: `${Math.round(horasCap)}`, valorNum: horasCap, status: horasCap > 0 ? 'ok' : 'warn', formato: 'numero' },
    { key: 'accidentes_mes', nombre: 'Accidentes (mes)', valor: `${accidentesMes}`, valorNum: accidentesMes, status: accidentesMes === 0 ? 'ok' : 'bad', formato: 'zero' },
    { key: 'costo_mo', nombre: 'Costo MO Total', valor: fmtM(costoMO), valorNum: costoMO, status: 'ok', formato: 'dinero' },
  ]
}
