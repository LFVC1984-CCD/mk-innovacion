'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProjects } from '@/lib/comites/use-projects'
import { useAuth } from '@/lib/comites/hooks'
import { fmtMM, fmtMoney } from '@/lib/comites/data'
import { isObra, isEstudio } from '@/lib/types'
import KpiCards from '@/components/comites/KpiCards'

// ── Types ──

interface FlujoProyecto {
  id: string
  proyecto_id: string
  mes: string
  tipo: 'ingreso' | 'egreso'
  categoria: string
  monto: number
  real: boolean
  observacion: string
}

interface LineaCentral {
  id: string
  mes: string
  tipo: 'ingreso' | 'egreso'
  categoria: string
  concepto: string
  monto: number
  real: boolean
}

// ── Config ──

const CAT_INGRESO = [
  { value: 'estado_pago', label: 'Estado de pago' },
  { value: 'ndc', label: 'Notas de cambio' },
  { value: 'anticipo', label: 'Anticipo' },
  { value: 'retencion', label: 'Retención liberada' },
]

const CAT_EGRESO = [
  { value: 'proveedores', label: 'Proveedores (OC/SC)' },
  { value: 'subcontrato', label: 'Subcontratos' },
  { value: 'mano_obra', label: 'Mano de obra' },
  { value: 'gastos_matriz', label: 'Gastos matriz' },
  { value: 'otro_obra', label: 'Otro gasto obra' },
]

const CAT_OFICINA = [
  { value: 'remuneraciones', label: 'Remuneraciones' },
  { value: 'arriendo_oficina', label: 'Arriendo oficina' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'seguros', label: 'Seguros' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'costos_financieros', label: 'Costos financieros' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'otro_oficina', label: 'Otro oficina' },
]

function catLabel(cat: string): string {
  const all = [...CAT_INGRESO, ...CAT_EGRESO, ...CAT_OFICINA]
  return all.find(c => c.value === cat)?.label || cat.replace(/_/g, ' ')
}

function fmtMes(mes: string): string {
  const [y, m] = mes.split('-')
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${meses[parseInt(m) - 1]} ${y.slice(2)}`
}

function generateMonths(back: number, forward: number): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = -back; i <= forward; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    months.push(d.toISOString().slice(0, 7))
  }
  return months
}

// ══════════════════════════════════════
//  PANEL
// ══════════════════════════════════════

export default function FinanzasPanel() {
  const supabase = createClient()
  const { projects } = useProjects()
  const { canEdit } = useAuth()
  const ce = canEdit('finanzas')

  const [flujoProyectos, setFlujoProyectos] = useState<FlujoProyecto[]>([])
  const [lineasCentral, setLineasCentral] = useState<LineaCentral[]>([])
  const [loading, setLoading] = useState(true)
  const [nivel, setNivel] = useState<1 | 2 | 3>(1)
  const [expandedProy, setExpandedProy] = useState<string | null>(null)
  const [expandedMes, setExpandedMes] = useState<string | null>(null)

  // Modal
  const [modal, setModal] = useState<{
    proyectoId: string; tipo: 'ingreso' | 'egreso'; categoria: string;
    mes: string; monto: string; repetir: string; real: boolean; obs: string;
    editId?: string; isOficina?: boolean
  } | null>(null)

  const currentMonth = new Date().toISOString().slice(0, 7)
  const months = useMemo(() => generateMonths(3, 9), [])

  async function load() {
    setLoading(true)
    const [fpRes, fcRes] = await Promise.all([
      supabase.from('flujo_proyectos').select('*').order('mes'),
      supabase.from('flujo_financiero').select('*').order('mes'),
    ])
    setFlujoProyectos((fpRes.data || []).map((r: Record<string, unknown>) => ({ ...r, monto: Number(r.monto) || 0 })) as FlujoProyecto[])
    setLineasCentral((fcRes.data || []).map((r: Record<string, unknown>) => ({ ...r, monto: Number(r.monto) || 0 })) as LineaCentral[])
    setLoading(false)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  // ── Obras y estudios ──
  const obras = useMemo(() => projects.filter(p => isObra(p) || p.estado === 'cerrado_saldo'), [projects])
  const estudios = useMemo(() => projects.filter(p => isEstudio(p)), [projects])

  // ── Saldo por facturar por proyecto ──
  const saldoFacturar = useMemo(() => {
    const map: Record<string, number> = {}
    obras.forEach(p => {
      const proyectadoFuturo = flujoProyectos
        .filter(f => f.proyecto_id === p.id && f.tipo === 'ingreso' && f.categoria === 'estado_pago' && !f.real)
        .reduce((s, f) => s + f.monto, 0)
      map[p.id] = (p.contrato + p.ndc) - p.facturado - proyectadoFuturo
    })
    return map
  }, [obras, flujoProyectos])

  // ── Datos por mes para Nivel 1 ──
  const porMes = useMemo(() => {
    return months.map(mes => {
      // Ingresos: flujo_proyectos + leads
      const ingProy = flujoProyectos.filter(f => f.mes === mes && f.tipo === 'ingreso')
      const ingReal = ingProy.filter(f => f.real).reduce((s, f) => s + f.monto, 0)
      const ingProyectado = ingProy.filter(f => !f.real).reduce((s, f) => s + f.monto, 0)

      // Egresos: flujo_proyectos + oficina central
      const egProy = flujoProyectos.filter(f => f.mes === mes && f.tipo === 'egreso')
      const egOficina = lineasCentral.filter(l => l.mes === mes && l.tipo === 'egreso')
      const egReal = egProy.filter(f => f.real).reduce((s, f) => s + f.monto, 0) + egOficina.filter(l => l.real).reduce((s, l) => s + l.monto, 0)
      const egProyectado = egProy.filter(f => !f.real).reduce((s, f) => s + f.monto, 0) + egOficina.filter(l => !l.real).reduce((s, l) => s + l.monto, 0)

      const totalIng = ingReal + ingProyectado
      const totalEg = egReal + egProyectado

      return { mes, ingReal, ingProyectado, totalIng, egReal, egProyectado, totalEg, saldo: totalIng - totalEg, isPast: mes < currentMonth, isCurrent: mes === currentMonth }
    })
  }, [months, flujoProyectos, lineasCentral, currentMonth])

  // Acumulado
  const porMesAcum = useMemo(() => {
    let acum = 0
    return porMes.map(m => { acum += m.saldo; return { ...m, acumulado: acum } })
  }, [porMes])

  // Totales
  const totalIng = porMes.reduce((s, m) => s + m.totalIng, 0)
  const totalEg = porMes.reduce((s, m) => s + m.totalEg, 0)
  const leadsPipeline = estudios.reduce((s, p) => s + p.monto_licitacion * (p.margen_estudio_pct / 100), 0)

  // ── Por proyecto para Nivel 2 ──
  const porProyecto = useMemo(() => {
    const items: { id: string; nombre: string; tipo: 'obra' | 'lead' | 'oficina'; ing: number; eg: number; saldoFact: number; flujos: FlujoProyecto[] }[] = []

    obras.forEach(p => {
      const flujos = flujoProyectos.filter(f => f.proyecto_id === p.id)
      const ing = flujos.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.monto, 0)
      const eg = flujos.filter(f => f.tipo === 'egreso').reduce((s, f) => s + f.monto, 0)
      items.push({ id: p.id, nombre: p.nombre, tipo: 'obra', ing, eg, saldoFact: saldoFacturar[p.id] || 0, flujos })
    })

    // Leads
    estudios.forEach(p => {
      const ponderado = p.monto_licitacion * (p.margen_estudio_pct / 100)
      if (ponderado > 0) items.push({ id: p.id, nombre: `${p.nombre} (Lead)`, tipo: 'lead', ing: ponderado, eg: 0, saldoFact: 0, flujos: [] })
    })

    // Oficina
    const egOficina = lineasCentral.filter(l => l.tipo === 'egreso').reduce((s, l) => s + l.monto, 0)
    if (egOficina > 0 || lineasCentral.length > 0) {
      items.push({ id: 'oficina', nombre: 'Oficina Central', tipo: 'oficina', ing: 0, eg: egOficina, saldoFact: 0, flujos: [] })
    }

    return items
  }, [obras, estudios, flujoProyectos, lineasCentral, saldoFacturar])

  // ── Por naturaleza para Nivel 3 ──
  const porNaturaleza = useMemo(() => {
    const map: Record<string, { label: string; tipo: 'ingreso' | 'egreso'; monto: number; items: { proyecto: string; monto: number }[] }> = {}

    flujoProyectos.forEach(f => {
      const proy = projects.find(p => p.id === f.proyecto_id)
      const key = f.categoria
      if (!map[key]) map[key] = { label: catLabel(key), tipo: f.tipo, monto: 0, items: [] }
      map[key].monto += f.monto
      map[key].items.push({ proyecto: proy?.nombre || '?', monto: f.monto })
    })

    lineasCentral.forEach(l => {
      const key = 'oficina_' + l.categoria
      if (!map[key]) map[key] = { label: `Oficina: ${catLabel(l.categoria)}`, tipo: l.tipo as 'ingreso' | 'egreso', monto: 0, items: [] }
      map[key].monto += l.monto
      map[key].items.push({ proyecto: l.concepto, monto: l.monto })
    })

    return Object.values(map).sort((a, b) => b.monto - a.monto)
  }, [flujoProyectos, lineasCentral, projects])

  // ── CRUD ──
  async function saveModal() {
    if (!modal) return
    const monto = parseFloat(modal.monto) || 0
    if (monto <= 0) return

    if (modal.isOficina) {
      // Oficina central → flujo_financiero
      const row = { mes: modal.mes, tipo: modal.tipo, categoria: modal.categoria, concepto: modal.obs || catLabel(modal.categoria), monto, real: modal.real, observacion: '' }
      if (modal.editId) {
        await supabase.from('flujo_financiero').update(row).eq('id', modal.editId)
      } else {
        const reps = parseInt(modal.repetir) || 1
        const rows = []
        for (let i = 0; i < reps; i++) {
          const d = new Date(modal.mes + '-01')
          d.setMonth(d.getMonth() + i)
          rows.push({ ...row, mes: d.toISOString().slice(0, 7) })
        }
        await supabase.from('flujo_financiero').insert(rows)
      }
    } else {
      // Por proyecto → flujo_proyectos
      const row = { proyecto_id: modal.proyectoId, mes: modal.mes, tipo: modal.tipo, categoria: modal.categoria, monto, real: modal.real, observacion: modal.obs || '' }
      if (modal.editId) {
        await supabase.from('flujo_proyectos').update(row).eq('id', modal.editId)
      } else {
        const reps = parseInt(modal.repetir) || 1
        const rows = []
        for (let i = 0; i < reps; i++) {
          const d = new Date(modal.mes + '-01')
          d.setMonth(d.getMonth() + i)
          rows.push({ ...row, mes: d.toISOString().slice(0, 7) })
        }
        await supabase.from('flujo_proyectos').insert(rows)
      }
    }
    setModal(null)
    load()
  }

  async function deleteFlujo(id: string, isOficina: boolean) {
    if (!confirm('¿Eliminar esta línea?')) return
    if (isOficina) await supabase.from('flujo_financiero').delete().eq('id', id)
    else await supabase.from('flujo_proyectos').delete().eq('id', id)
    load()
  }

  function openNewModal(tipo: 'ingreso' | 'egreso', isOficina = false) {
    setModal({
      proyectoId: obras[0]?.id || '', tipo, categoria: tipo === 'ingreso' ? 'estado_pago' : isOficina ? 'remuneraciones' : 'proveedores',
      mes: currentMonth, monto: '', repetir: '1', real: false, obs: '', isOficina,
    })
  }

  if (loading) return <div className="space-y-3"><div className="h-28 skeleton rounded-xl" /><div className="h-48 skeleton rounded-xl" /></div>

  const maxBar = Math.max(...porMes.map(m => Math.max(m.totalIng, m.totalEg)), 1)

  return (
    <div>
      {/* ── KPIs ── */}
      <KpiCards items={[
        { label: 'Ingresos Prog.', value: fmtMM(totalIng), color: '#16A34A' },
        { label: 'Egresos Prog.', value: fmtMM(totalEg), color: '#DC2626' },
        { label: 'Saldo Neto', value: `${totalIng - totalEg >= 0 ? '+' : ''}${fmtMM(totalIng - totalEg)}`, color: totalIng - totalEg >= 0 ? '#E1BA10' : '#DC2626' },
        { label: 'Leads Pipeline', value: fmtMM(leadsPipeline), color: '#0B5ED7', sub: `${estudios.length} en estudio` },
      ]} />

      {/* ── Tabs Nivel + Acciones ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {([1, 2, 3] as const).map(n => (
            <button key={n} onClick={() => setNivel(n)}
              className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${nivel === n ? 'bg-cobalt text-white border-cobalt' : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'}`}>
              {n === 1 ? 'Flujo Mensual' : n === 2 ? 'Por Proyecto' : 'Por Naturaleza'}
            </button>
          ))}
        </div>
        {ce && (
          <div className="flex gap-1.5">
            <button onClick={() => openNewModal('ingreso')} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-green-700 btn-scale">+ Ingreso</button>
            <button onClick={() => openNewModal('egreso')} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-red-600 btn-scale">+ Egreso obra</button>
            <button onClick={() => openNewModal('egreso', true)} className="bg-slate-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-slate-700 btn-scale">+ Oficina</button>
          </div>
        )}
      </div>

      {/* ═══ NIVEL 1: Flujo Mensual ═══ */}
      {nivel === 1 && (
        <>
          {/* Chart */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate">Flujo de caja mensual ($MM)</p>
              <div className="flex gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500" /> Ing real</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500/30" /> Ing proy</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-400" /> Eg real</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-400/30" /> Eg proy</span>
              </div>
            </div>
            <div className="flex gap-1 items-end" style={{ height: 140 }}>
              {porMesAcum.map(m => (
                <div key={m.mes} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full flex gap-0.5 items-end" style={{ height: 100 }}>
                    {/* Ingreso stacked bar */}
                    <div className="flex-1 flex flex-col justify-end">
                      {m.ingProyectado > 0 && <div className="rounded-t" style={{ height: `${(m.ingProyectado / maxBar) * 100}%`, background: '#16A34A40', minHeight: 2 }} />}
                      {m.ingReal > 0 && <div className="rounded-t" style={{ height: `${(m.ingReal / maxBar) * 100}%`, background: '#16A34A', minHeight: 2 }} />}
                    </div>
                    {/* Egreso stacked bar */}
                    <div className="flex-1 flex flex-col justify-end">
                      {m.egProyectado > 0 && <div className="rounded-t" style={{ height: `${(m.egProyectado / maxBar) * 100}%`, background: '#F8717140', minHeight: 2 }} />}
                      {m.egReal > 0 && <div className="rounded-t" style={{ height: `${(m.egReal / maxBar) * 100}%`, background: '#F87171', minHeight: 2 }} />}
                    </div>
                  </div>
                  <div className={`text-[8px] font-bold ${m.saldo >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {m.totalIng > 0 || m.totalEg > 0 ? (m.saldo >= 0 ? '+' : '') + fmtMoney(m.saldo) : ''}
                  </div>
                  <div className={`text-[10px] font-bold ${m.isCurrent ? 'text-cobalt' : 'text-slate'}`}>{fmtMes(m.mes)}</div>
                </div>
              ))}
            </div>
            {/* Acumulado line */}
            <div className="flex gap-1 mt-1">
              {porMesAcum.map(m => (
                <div key={m.mes} className="flex-1 text-center">
                  <span className={`text-[8px] font-condensed font-bold ${m.acumulado >= 0 ? 'text-cobalt' : 'text-danger'}`}>
                    {m.totalIng > 0 || m.totalEg > 0 ? fmtMoney(m.acumulado) : ''}
                  </span>
                </div>
              ))}
            </div>
            {/* Insight narrativo */}
            {porMes.some(m => m.totalIng > 0 || m.totalEg > 0) && (() => {
              const acumFinal = porMesAcum[porMesAcum.length - 1]?.acumulado || 0
              const mesesNeg = porMesAcum.filter(m => m.acumulado < 0 && (m.totalIng > 0 || m.totalEg > 0))
              const mesMax = porMes.reduce((max, m) => m.totalEg > max.totalEg ? m : max, porMes[0])
              return (
                <div className="mt-3 p-3 rounded-lg bg-cobalt-light border border-cobalt/10">
                  <p className="text-[11px] text-cobalt-dark leading-relaxed">
                    <span className="font-bold">Saldo proyectado al cierre: {acumFinal >= 0 ? '+' : ''}{fmtMM(acumFinal)}</span>
                    {acumFinal < 0 && <span className="text-red-600"> — requiere financiamiento o adelantar cobros.</span>}
                    {mesesNeg.length > 0 && <><br /><span className="text-amber-700 font-semibold">{mesesNeg.length} mes{mesesNeg.length > 1 ? 'es' : ''} con saldo negativo</span> — revisar calce de pagos vs cobros.</>}
                    {mesMax.totalEg > 0 && <><br />Mayor egreso en <b>{fmtMes(mesMax.mes)}</b> ({fmtMM(mesMax.totalEg)}).</>}
                  </p>
                </div>
              )
            })()}
          </div>

          {/* Tabla resumen */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <th className="text-left px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate">Mes</th>
                  <th className="text-right px-2 py-2 text-[10px] font-bold uppercase text-green-600">Ingresos</th>
                  <th className="text-right px-2 py-2 text-[10px] font-bold uppercase text-red-500">Egresos</th>
                  <th className="text-right px-2 py-2 text-[10px] font-bold uppercase text-slate">Saldo</th>
                  <th className="text-right px-3.5 py-2 text-[10px] font-bold uppercase text-cobalt">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {porMesAcum.filter(m => m.totalIng > 0 || m.totalEg > 0).map(m => {
                  const isExp = expandedMes === m.mes
                  const mesFlujoProy = flujoProyectos.filter(f => f.mes === m.mes)
                  const mesCentral = lineasCentral.filter(l => l.mes === m.mes)
                  const detailLines = [
                    ...mesFlujoProy.map(f => ({ ...f, isOficina: false, label: `${projects.find(p => p.id === f.proyecto_id)?.nombre || '?'} — ${catLabel(f.categoria)}`, obs: f.observacion })),
                    ...mesCentral.map(l => ({ id: l.id, tipo: l.tipo, categoria: l.categoria, monto: l.monto, real: l.real, isOficina: true, label: `Oficina: ${l.concepto || catLabel(l.categoria)}`, obs: '', proyecto_id: '', mes: l.mes, observacion: '' })),
                  ]
                  return (
                    <React.Fragment key={m.mes}>
                      <tr
                        className={`border-b border-[#F1F5F9] cursor-pointer transition-colors hover:bg-[#F8FAFC] ${m.isCurrent ? 'bg-blue-50/50' : ''} ${isExp ? 'bg-[#F8FAFC]' : ''}`}
                        style={{ borderLeft: isExp ? '3px solid #0B5ED7' : '3px solid transparent' }}
                        onClick={() => setExpandedMes(isExp ? null : m.mes)}
                      >
                        <td className="px-3.5 py-2 font-semibold">
                          <span className={`inline-block transition-transform mr-1 text-[10px] text-slate ${isExp ? 'rotate-90' : ''}`}>&#9654;</span>
                          {fmtMes(m.mes)}
                          {m.isCurrent && <span className="text-[10px] text-cobalt font-bold ml-1">actual</span>}
                          <span className="text-[10px] text-slate ml-1.5">{detailLines.length} líneas</span>
                        </td>
                        <td className="px-2 py-2 text-right font-condensed font-bold text-green-600">{m.totalIng > 0 ? fmtMM(m.totalIng) : '—'}</td>
                        <td className="px-2 py-2 text-right font-condensed font-bold text-red-500">{m.totalEg > 0 ? fmtMM(m.totalEg) : '—'}</td>
                        <td className="px-2 py-2 text-right font-condensed font-bold" style={{ color: m.saldo >= 0 ? '#16A34A' : '#DC2626' }}>{fmtMM(m.saldo)}</td>
                        <td className="px-3.5 py-2 text-right font-condensed font-bold" style={{ color: m.acumulado >= 0 ? '#0B5ED7' : '#DC2626' }}>{fmtMM(m.acumulado)}</td>
                      </tr>
                      {isExp && detailLines.map(line => (
                        <tr
                          key={line.id}
                          className="group border-b border-[#F1F5F9] bg-[#FAFBFC] transition-colors hover:bg-[#F1F5F9] cursor-pointer"
                          style={{ borderLeft: `3px solid ${line.tipo === 'ingreso' ? '#16A34A' : '#DC2626'}` }}
                          onClick={() => {
                            if (!ce) return
                            if (line.isOficina) {
                              const lc = mesCentral.find(l => l.id === line.id)!
                              setModal({ proyectoId: '', tipo: lc.tipo, categoria: lc.categoria, mes: lc.mes, monto: String(lc.monto), repetir: '1', real: lc.real, obs: lc.concepto || '', editId: lc.id, isOficina: true })
                            } else {
                              const fp = mesFlujoProy.find(f => f.id === line.id)!
                              setModal({ proyectoId: fp.proyecto_id, tipo: fp.tipo, categoria: fp.categoria, mes: fp.mes, monto: String(fp.monto), repetir: '1', real: fp.real, obs: fp.observacion || '', editId: fp.id, isOficina: false })
                            }
                          }}
                        >
                          <td className="pl-8 pr-3.5 py-1.5 text-[11px] text-ink" colSpan={2}>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${line.real ? 'bg-green-500' : 'bg-slate-300'}`} />
                              <span>{line.label}</span>
                              {line.real && <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1 rounded">Real</span>}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-right text-[11px] font-condensed font-semibold" style={{ color: line.tipo === 'ingreso' ? '#16A34A' : '#DC2626' }} colSpan={2}>
                            {line.tipo === 'ingreso' ? '+' : '-'}{fmtMM(line.monto)}
                          </td>
                          <td className="px-3.5 py-1.5 text-right">
                            {ce && (
                              <button
                                className="text-[10px] text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600 font-semibold"
                                onClick={e => { e.stopPropagation(); deleteFlujo(line.id, line.isOficina) }}
                              >
                                Eliminar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {isExp && detailLines.length === 0 && (
                        <tr className="bg-[#FAFBFC]">
                          <td colSpan={5} className="pl-8 py-3 text-[11px] text-slate italic">Sin líneas de detalle para este mes.</td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
            {porMes.every(m => m.totalIng === 0 && m.totalEg === 0) && (
              <div className="p-12 text-center text-slate text-sm">Sin proyecciones. Usa los botones + Ingreso / + Egreso para programar el flujo.</div>
            )}
          </div>
        </>
      )}

      {/* ═══ NIVEL 2: Por Proyecto ═══ */}
      {nivel === 2 && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="text-left px-3.5 py-2.5 text-[10px] font-bold uppercase text-slate">Proyecto</th>
                <th className="text-right px-2 py-2.5 text-[10px] font-bold uppercase text-green-600">Ing. Prog.</th>
                <th className="text-right px-2 py-2.5 text-[10px] font-bold uppercase text-red-500">Eg. Est.</th>
                <th className="text-right px-2 py-2.5 text-[10px] font-bold uppercase text-slate">Saldo</th>
                <th className="text-right px-3.5 py-2.5 text-[10px] font-bold uppercase text-cobalt">Saldo x Fact.</th>
              </tr>
            </thead>
            <tbody>
              {porProyecto.map(p => {
                const saldo = p.ing - p.eg
                const isExp = expandedProy === p.id
                // Detail lines: for projects use flujo_proyectos, for oficina use lineasCentral
                const detailLines = p.tipo === 'oficina'
                  ? lineasCentral.map(l => ({ id: l.id, tipo: l.tipo, categoria: l.categoria, monto: l.monto, real: l.real, mes: l.mes, isOficina: true, label: `${fmtMes(l.mes)} — ${l.concepto || catLabel(l.categoria)}`, obs: l.concepto || '' }))
                  : p.flujos.map(f => ({ id: f.id, tipo: f.tipo, categoria: f.categoria, monto: f.monto, real: f.real, mes: f.mes, isOficina: false, label: `${fmtMes(f.mes)} — ${catLabel(f.categoria)}`, obs: f.observacion || '' }))
                return (
                  <React.Fragment key={p.id}>
                    <tr
                      className={`border-b border-[#F1F5F9] hover:bg-[#F8FAFC] cursor-pointer transition-colors ${isExp ? 'bg-[#F8FAFC]' : ''}`}
                      style={{ borderLeft: isExp ? '3px solid #0B5ED7' : '3px solid transparent' }}
                      onClick={() => setExpandedProy(isExp ? null : p.id)}
                    >
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block transition-transform mr-0.5 text-[10px] text-slate ${isExp ? 'rotate-90' : ''}`}>&#9654;</span>
                          <span className="font-semibold text-ink">{p.nombre}</span>
                          {p.tipo === 'lead' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cobalt-light text-cobalt">Lead</span>}
                          {p.tipo === 'oficina' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate">Oficina</span>}
                          {detailLines.length > 0 && <span className="text-[10px] text-slate">{detailLines.length} líneas</span>}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-right font-condensed font-bold text-green-600">{p.ing > 0 ? fmtMM(p.ing) : '—'}</td>
                      <td className="px-2 py-2.5 text-right font-condensed font-bold text-red-500">{p.eg > 0 ? fmtMM(p.eg) : '—'}</td>
                      <td className="px-2 py-2.5 text-right font-condensed font-bold" style={{ color: saldo >= 0 ? '#16A34A' : '#DC2626' }}>{fmtMM(saldo)}</td>
                      <td className="px-3.5 py-2.5 text-right font-condensed font-bold text-cobalt">{p.saldoFact > 0 ? fmtMM(p.saldoFact) : '—'}</td>
                    </tr>
                    {isExp && detailLines.map(line => (
                      <tr
                        key={line.id}
                        className="group border-b border-[#F1F5F9] bg-[#FAFBFC] transition-colors hover:bg-[#F1F5F9] cursor-pointer"
                        style={{ borderLeft: `3px solid ${line.tipo === 'ingreso' ? '#16A34A' : '#DC2626'}` }}
                        onClick={() => {
                          if (!ce) return
                          if (line.isOficina) {
                            const lc = lineasCentral.find(l => l.id === line.id)!
                            setModal({ proyectoId: '', tipo: lc.tipo, categoria: lc.categoria, mes: lc.mes, monto: String(lc.monto), repetir: '1', real: lc.real, obs: lc.concepto || '', editId: lc.id, isOficina: true })
                          } else {
                            const fp = p.flujos.find(f => f.id === line.id)!
                            setModal({ proyectoId: fp.proyecto_id, tipo: fp.tipo, categoria: fp.categoria, mes: fp.mes, monto: String(fp.monto), repetir: '1', real: fp.real, obs: fp.observacion || '', editId: fp.id, isOficina: false })
                          }
                        }}
                      >
                        <td className="pl-8 pr-3.5 py-1.5 text-[11px] text-ink" colSpan={2}>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${line.real ? 'bg-green-500' : 'bg-slate-300'}`} />
                            <span>{line.label}</span>
                            {line.real && <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1 rounded">Real</span>}
                            {line.obs && <span className="text-[10px] text-slate truncate max-w-[140px]">{line.obs}</span>}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-right text-[11px] font-condensed font-semibold" style={{ color: line.tipo === 'ingreso' ? '#16A34A' : '#DC2626' }} colSpan={2}>
                          {line.tipo === 'ingreso' ? '+' : '-'}{fmtMM(line.monto)}
                        </td>
                        <td className="px-3.5 py-1.5 text-right">
                          {ce && (
                            <button
                              className="text-[10px] text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600 font-semibold"
                              onClick={e => { e.stopPropagation(); deleteFlujo(line.id, line.isOficina) }}
                            >
                              Eliminar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {isExp && detailLines.length === 0 && (
                      <tr className="bg-[#FAFBFC]">
                        <td colSpan={5} className="pl-8 py-3 text-[11px] text-slate italic">Sin líneas de detalle para este proyecto.</td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
              {/* Totals row */}
              <tr className="bg-[#F8FAFC] font-bold">
                <td className="px-3.5 py-2.5 text-[10px] uppercase text-slate">Total</td>
                <td className="px-2 py-2.5 text-right font-condensed text-green-700">{fmtMM(porProyecto.reduce((s, p) => s + p.ing, 0))}</td>
                <td className="px-2 py-2.5 text-right font-condensed text-red-600">{fmtMM(porProyecto.reduce((s, p) => s + p.eg, 0))}</td>
                <td className="px-2 py-2.5 text-right font-condensed" style={{ color: totalIng - totalEg >= 0 ? '#16A34A' : '#DC2626' }}>{fmtMM(totalIng - totalEg)}</td>
                <td className="px-3.5 py-2.5 text-right font-condensed text-cobalt">{fmtMM(Object.values(saldoFacturar).reduce((s, v) => s + Math.max(0, v), 0))}</td>
              </tr>
            </tbody>
          </table>
          {porProyecto.length === 0 && <div className="p-12 text-center text-slate text-sm">Sin proyecciones por proyecto.</div>}
        </div>
      )}

      {/* ═══ NIVEL 3: Por Naturaleza ═══ */}
      {nivel === 3 && (
        <div className="space-y-2.5">
          {porNaturaleza.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate text-sm">Sin datos para agrupar por naturaleza.</div>
          ) : porNaturaleza.map((nat, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
              <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#E2E8F0]" style={{ borderLeftWidth: 3, borderLeftColor: nat.tipo === 'ingreso' ? '#16A34A' : '#DC2626' }}>
                <span className="text-xs font-bold">{nat.label}</span>
                <span className="font-condensed text-sm font-bold" style={{ color: nat.tipo === 'ingreso' ? '#16A34A' : '#DC2626' }}>{fmtMM(nat.monto)}</span>
              </div>
              <div className="divide-y divide-[#F1F5F9]">
                {nat.items.map((item, j) => (
                  <div key={j} className="px-4 py-2 flex items-center justify-between">
                    <span className="text-xs text-ink">{item.proyecto}</span>
                    <span className="text-xs font-condensed font-bold" style={{ color: nat.tipo === 'ingreso' ? '#16A34A' : '#DC2626' }}>{fmtMM(item.monto)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ MODAL PROYECCIÓN ══ */}
      {modal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-md" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px] max-h-[85vh] overflow-y-auto mx-4 ring-1 ring-black/5" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="font-condensed font-bold text-lg">
                {modal.editId ? 'Editar' : 'Nueva'} {modal.tipo === 'ingreso' ? 'proyección de ingreso' : modal.isOficina ? 'gasto oficina' : 'proyección de egreso'}
              </h3>
              <button onClick={() => setModal(null)} className="w-7 h-7 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-slate hover:bg-[#F1F5F9]">×</button>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              {!modal.isOficina && (
                <div className="col-span-2">
                  <L>Proyecto</L>
                  <select value={modal.proyectoId} onChange={e => setModal(p => p ? { ...p, proyectoId: e.target.value } : null)} className="inp">
                    <option value="">— Seleccionar —</option>
                    <optgroup label="Obras activas">
                      {obras.map(p => <option key={p.id} value={p.id}>{p.nombre}{saldoFacturar[p.id] > 0 ? ` (saldo: ${fmtMoney(saldoFacturar[p.id])}MM)` : ''}</option>)}
                    </optgroup>
                  </select>
                </div>
              )}
              <div>
                <L>Categoría</L>
                <select value={modal.categoria} onChange={e => setModal(p => p ? { ...p, categoria: e.target.value } : null)} className="inp">
                  {modal.isOficina ? CAT_OFICINA.map(c => <option key={c.value} value={c.value}>{c.label}</option>) :
                   modal.tipo === 'ingreso' ? CAT_INGRESO.map(c => <option key={c.value} value={c.value}>{c.label}</option>) :
                   CAT_EGRESO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <L>Mes inicio</L>
                <input type="month" value={modal.mes} onChange={e => setModal(p => p ? { ...p, mes: e.target.value } : null)} className="inp" />
              </div>
              <div>
                <L>Monto ($MM)</L>
                <input type="number" value={modal.monto} onChange={e => setModal(p => p ? { ...p, monto: e.target.value } : null)} className="inp" placeholder="0" />
                {modal.tipo === 'ingreso' && modal.categoria === 'estado_pago' && modal.proyectoId && (
                  <p className="text-[10px] text-cobalt mt-0.5">Saldo disponible: {fmtMM(saldoFacturar[modal.proyectoId] || 0)}</p>
                )}
              </div>
              <div>
                <L>Repetir por</L>
                <div className="flex items-center gap-1.5">
                  <input type="number" min="1" max="12" value={modal.repetir} onChange={e => setModal(p => p ? { ...p, repetir: e.target.value } : null)} className="inp w-16 text-center" />
                  <span className="text-xs text-slate">meses</span>
                </div>
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={modal.real} onChange={e => setModal(p => p ? { ...p, real: e.target.checked } : null)} className="w-4 h-4 rounded border-[#CBD5E1]" />
                  <span className="text-xs font-semibold text-ink">Dato real (ejecutado)</span>
                </label>
              </div>
              <div className="col-span-2">
                <L>Observación (opcional)</L>
                <input value={modal.obs} onChange={e => setModal(p => p ? { ...p, obs: e.target.value } : null)} className="inp" placeholder="Nota" />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-[#E2E8F0] flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-semibold hover:bg-[#F1F5F9]">Cancelar</button>
              <button onClick={saveModal} className="px-4 py-2 bg-cobalt text-white rounded-lg text-xs font-bold hover:bg-cobalt-dark btn-scale">
                {parseInt(modal.repetir) > 1 ? `Guardar (${modal.repetir} meses)` : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function L({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-1">{children}</label>
}
