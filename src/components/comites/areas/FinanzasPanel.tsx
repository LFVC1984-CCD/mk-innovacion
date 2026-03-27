'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProjects } from '@/lib/comites/use-projects'
import { useAuth } from '@/lib/comites/hooks'
import { fmtMM, fmtMoney } from '@/lib/comites/data'
import { isObra } from '@/lib/types'

// ── Types ──

interface LineaCentral {
  id: string
  mes: string
  tipo: 'ingreso' | 'egreso'
  categoria: string
  concepto: string
  monto: number
  real: boolean
  observacion: string | null
}

interface LineaCredito {
  id: string
  entidad: string
  instrumento: string
  monto: number
}

// ── Helpers ──

function fmtMes(mes: string): string {
  const [y, m] = mes.split('-')
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${meses[parseInt(m) - 1]} ${y.slice(2)}`
}

const CAT_OFICINA: { value: string; label: string }[] = [
  { value: 'remuneraciones', label: 'Remuneraciones oficina' },
  { value: 'arriendo_oficina', label: 'Arriendo oficina' },
  { value: 'servicios', label: 'Servicios (agua, luz, internet)' },
  { value: 'seguros', label: 'Seguros' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'costos_financieros', label: 'Costos financieros' },
  { value: 'tecnologia', label: 'Tecnología / licencias' },
  { value: 'marketing', label: 'Marketing / comercial' },
  { value: 'otro_oficina', label: 'Otro gasto oficina' },
]

// ══════════════════════════════════════
//  PANEL
// ══════════════════════════════════════

export default function FinanzasPanel() {
  const supabase = createClient()
  const { projects } = useProjects()
  const { canEdit } = useAuth()
  const ce = canEdit('finanzas')

  const [lineasCentral, setLineasCentral] = useState<LineaCentral[]>([])
  const [lineasCredito, setLineasCredito] = useState<LineaCredito[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'consolidado' | 'oficina'>('consolidado')
  const [modalLinea, setModalLinea] = useState<Partial<LineaCentral> | null>(null)

  const currentMonth = new Date().toISOString().slice(0, 7)

  async function load() {
    setLoading(true)
    const [fRes, lcRes] = await Promise.all([
      supabase.from('flujo_financiero').select('*').order('mes').order('tipo'),
      supabase.from('lineas_credito').select('*'),
    ])
    setLineasCentral((fRes.data || []).map((l: Record<string, unknown>) => ({ ...l, monto: Number(l.monto) || 0 })) as LineaCentral[])
    setLineasCredito((lcRes.data || []).map((l: Record<string, unknown>) => ({ ...l, monto: Number(l.monto) || 0 })) as LineaCredito[])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  // ── Obras activas ──
  const obras = useMemo(() => projects.filter(p => isObra(p) || p.estado === 'cerrado_saldo'), [projects])

  // ── INGRESOS consolidados ──
  const ingresos = useMemo(() => {
    const items: { concepto: string; fuente: string; monto: number; tipo: string }[] = []

    // 1. Facturación por obra (estados de pago)
    obras.forEach(p => {
      if (p.facturado > 0) items.push({ concepto: p.nombre, fuente: 'Estado de pago', monto: p.facturado, tipo: 'facturacion' })
    })

    // 2. NDC por obra
    obras.forEach(p => {
      if (p.ndc > 0) items.push({ concepto: p.nombre, fuente: 'NDC', monto: p.ndc, tipo: 'ndc' })
    })

    // 3. Líneas de crédito (capital trabajo, factoring)
    lineasCredito.forEach(lc => {
      if (lc.monto > 0) {
        const instrLabel = lc.instrumento === 'capital_trabajo' ? 'Capital de trabajo' :
                          lc.instrumento === 'factoring' ? 'Factoring' :
                          lc.instrumento.replace(/_/g, ' ')
        items.push({ concepto: `${lc.entidad} — ${instrLabel}`, fuente: 'Línea de crédito', monto: lc.monto, tipo: 'linea_credito' })
      }
    })

    return items
  }, [obras, lineasCredito])

  // ── EGRESOS consolidados ──
  const egresos = useMemo(() => {
    const items: { concepto: string; fuente: string; monto: number; tipo: string }[] = []

    // 1. OC + SC por obra (proveedores)
    obras.forEach(p => {
      const proveedores = (p.oc || 0) + (p.sc || 0) + (p.adicionales || 0)
      if (proveedores > 0) items.push({ concepto: p.nombre, fuente: 'Proveedores (OC+SC+Adic)', monto: proveedores, tipo: 'proveedores' })
    })

    // 2. Mano de obra
    obras.forEach(p => {
      if (p.mano_obra > 0) items.push({ concepto: p.nombre, fuente: 'Mano de obra', monto: p.mano_obra, tipo: 'mano_obra' })
    })

    // 3. Gastos matriz
    obras.forEach(p => {
      if (p.gastos_matriz > 0) items.push({ concepto: p.nombre, fuente: 'Gastos matriz', monto: p.gastos_matriz, tipo: 'gastos_matriz' })
    })

    // 4. Oficina central (del flujo_financiero)
    lineasCentral.filter(l => l.tipo === 'egreso').forEach(l => {
      items.push({ concepto: l.concepto, fuente: `Oficina — ${l.real ? 'Real' : 'Proyectado'}`, monto: l.monto, tipo: 'oficina' })
    })

    return items
  }, [obras, lineasCentral])

  // ── Totales ──
  const totalIngresos = ingresos.reduce((s, i) => s + i.monto, 0)
  const totalEgresos = egresos.reduce((s, e) => s + e.monto, 0)
  const saldoNeto = totalIngresos - totalEgresos

  // Subtotales por fuente
  const ingByTipo = useMemo(() => {
    const map: Record<string, number> = {}
    ingresos.forEach(i => { map[i.tipo] = (map[i.tipo] || 0) + i.monto })
    return map
  }, [ingresos])

  const egByTipo = useMemo(() => {
    const map: Record<string, number> = {}
    egresos.forEach(e => { map[e.tipo] = (map[e.tipo] || 0) + e.monto })
    return map
  }, [egresos])

  // Oficina: presupuesto mensual
  const oficinaEgTotal = lineasCentral.filter(l => l.tipo === 'egreso').reduce((s, l) => s + l.monto, 0)
  const oficinaProy = lineasCentral.filter(l => !l.real && l.tipo === 'egreso').reduce((s, l) => s + l.monto, 0)
  const oficinaReal = lineasCentral.filter(l => l.real && l.tipo === 'egreso').reduce((s, l) => s + l.monto, 0)

  // ── CRUD Oficina Central ──
  async function saveLinea() {
    if (!modalLinea || !modalLinea.concepto?.trim()) return
    if ((modalLinea as LineaCentral).id) {
      const { id, ...rest } = modalLinea as LineaCentral
      await supabase.from('flujo_financiero').update(rest).eq('id', id)
    } else {
      await supabase.from('flujo_financiero').insert(modalLinea)
    }
    setModalLinea(null)
    load()
  }

  async function deleteLinea(id: string) {
    if (!confirm('¿Eliminar esta línea?')) return
    await supabase.from('flujo_financiero').delete().eq('id', id)
    load()
  }

  if (loading) {
    return <div className="space-y-3"><div className="h-28 skeleton rounded-xl" /><div className="h-48 skeleton rounded-xl" /></div>
  }

  return (
    <div>
      {/* ── Consolidado general ── */}
      <div className="hero-gradient rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Ingresos Totales</p>
          <p className="font-condensed text-[28px] font-black text-green-400 leading-tight mt-1">{fmtMM(totalIngresos)}</p>
          <p className="text-[10px] text-white/30 mt-0.5">{obras.length} obras + líneas crédito</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Egresos Totales</p>
          <p className="font-condensed text-[28px] font-black text-red-400 leading-tight mt-1">{fmtMM(totalEgresos)}</p>
          <p className="text-[10px] text-white/30 mt-0.5">Obras + Oficina central</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Saldo Neto</p>
          <p className="font-condensed text-[28px] font-black leading-tight mt-1" style={{ color: saldoNeto >= 0 ? '#E1BA10' : '#DC2626' }}>
            {saldoNeto >= 0 ? '+' : ''}{fmtMM(saldoNeto)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Oficina Central</p>
          <p className="font-condensed text-lg font-black text-white/60 leading-tight mt-1">{fmtMM(oficinaEgTotal)}</p>
          <p className="text-[10px] text-white/30 mt-0.5">
            {fmtMoney(oficinaReal)} real · {fmtMoney(oficinaProy)} proy
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          <button onClick={() => setTab('consolidado')}
            className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${tab === 'consolidado' ? 'bg-cobalt text-white border-cobalt' : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'}`}>
            Consolidado
          </button>
          <button onClick={() => setTab('oficina')}
            className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${tab === 'oficina' ? 'bg-cobalt text-white border-cobalt' : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'}`}>
            Oficina Central ({lineasCentral.length})
          </button>
        </div>
        {ce && tab === 'oficina' && (
          <button onClick={() => setModalLinea({ mes: currentMonth, tipo: 'egreso', categoria: 'remuneraciones', concepto: '', monto: 0, real: false, observacion: null })}
            className="bg-cobalt text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-cobalt-dark transition-colors btn-scale">
            + Gasto oficina
          </button>
        )}
      </div>

      {/* ═══ TAB: CONSOLIDADO ═══ */}
      {tab === 'consolidado' && (
        <div className="grid grid-cols-2 gap-4">
          {/* Ingresos */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            <div className="px-4 py-2.5 bg-green-50 border-b border-green-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-green-700">Ingresos</span>
              <span className="font-condensed text-sm font-black text-green-700">{fmtMM(totalIngresos)}</span>
            </div>

            {/* Subtotals */}
            <div className="px-4 py-2 border-b border-[#F1F5F9] space-y-1">
              {ingByTipo.facturacion > 0 && <SubRow label="Estados de pago" monto={ingByTipo.facturacion} color="#16A34A" />}
              {ingByTipo.ndc > 0 && <SubRow label="NDC (notas de crédito)" monto={ingByTipo.ndc} color="#16A34A" />}
              {ingByTipo.linea_credito > 0 && <SubRow label="Líneas de crédito" monto={ingByTipo.linea_credito} color="#0B5ED7" />}
            </div>

            {/* Detail */}
            <div className="max-h-[300px] overflow-y-auto divide-y divide-[#F1F5F9]">
              {ingresos.map((item, i) => (
                <div key={i} className="px-4 py-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink truncate">{item.concepto}</p>
                    <p className="text-[10px] text-slate">{item.fuente}</p>
                  </div>
                  <span className="font-condensed text-sm font-bold text-green-700 shrink-0">{fmtMM(item.monto)}</span>
                </div>
              ))}
              {ingresos.length === 0 && <div className="px-4 py-6 text-center text-slate text-xs">Sin ingresos registrados en obras ni líneas</div>}
            </div>
          </div>

          {/* Egresos */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            <div className="px-4 py-2.5 bg-red-50 border-b border-red-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-red-700">Egresos</span>
              <span className="font-condensed text-sm font-black text-red-700">{fmtMM(totalEgresos)}</span>
            </div>

            {/* Subtotals */}
            <div className="px-4 py-2 border-b border-[#F1F5F9] space-y-1">
              {egByTipo.proveedores > 0 && <SubRow label="Proveedores (OC+SC+Adic)" monto={egByTipo.proveedores} color="#DC2626" />}
              {egByTipo.mano_obra > 0 && <SubRow label="Mano de obra" monto={egByTipo.mano_obra} color="#D97706" />}
              {egByTipo.gastos_matriz > 0 && <SubRow label="Gastos matriz" monto={egByTipo.gastos_matriz} color="#7C3AED" />}
              {egByTipo.oficina > 0 && <SubRow label="Oficina central" monto={egByTipo.oficina} color="#64748B" />}
            </div>

            {/* Detail */}
            <div className="max-h-[300px] overflow-y-auto divide-y divide-[#F1F5F9]">
              {egresos.map((item, i) => (
                <div key={i} className="px-4 py-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink truncate">{item.concepto}</p>
                    <p className="text-[10px] text-slate">{item.fuente}</p>
                  </div>
                  <span className="font-condensed text-sm font-bold text-red-600 shrink-0">{fmtMM(item.monto)}</span>
                </div>
              ))}
              {egresos.length === 0 && <div className="px-4 py-6 text-center text-slate text-xs">Sin egresos registrados</div>}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: OFICINA CENTRAL ═══ */}
      {tab === 'oficina' && (
        <>
          {lineasCentral.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate text-sm">
              Sin gastos de oficina central. Agrega presupuesto mensual proyectado y actualiza con datos reales.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <th className="text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate">Mes</th>
                    <th className="text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate">Categoría</th>
                    <th className="text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate">Concepto</th>
                    <th className="text-right px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate">Monto ($MM)</th>
                    <th className="text-center px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate">Estado</th>
                    {ce && <th className="w-20" />}
                  </tr>
                </thead>
                <tbody>
                  {lineasCentral.map(l => (
                    <tr key={l.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                      <td className="px-3.5 py-2.5 font-semibold">{fmtMes(l.mes)}</td>
                      <td className="px-3.5 py-2.5 text-slate">{CAT_OFICINA.find(c => c.value === l.categoria)?.label || l.categoria}</td>
                      <td className="px-3.5 py-2.5 text-ink">{l.concepto}</td>
                      <td className="px-3.5 py-2.5 text-right font-condensed font-bold text-red-600">{fmtMM(l.monto)}</td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${l.real ? 'bg-green-50 text-success' : 'bg-amber-50 text-amber'}`}>
                          {l.real ? 'Real' : 'Proyectado'}
                        </span>
                      </td>
                      {ce && (
                        <td className="px-2 py-2.5 text-right">
                          <button onClick={() => setModalLinea({ ...l })} className="text-slate hover:text-cobalt text-[10px] mr-1">editar</button>
                          <button onClick={() => deleteLinea(l.id)} className="text-[#CBD5E1] hover:text-danger text-sm">×</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ══ MODAL GASTO OFICINA ══ */}
      {modalLinea && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-md" onClick={() => setModalLinea(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[500px] max-h-[85vh] overflow-y-auto mx-4 ring-1 ring-black/5" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="font-condensed font-bold text-lg">{(modalLinea as LineaCentral).id ? 'Editar gasto' : 'Nuevo gasto oficina'}</h3>
              <button onClick={() => setModalLinea(null)} className="w-7 h-7 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-slate hover:bg-[#F1F5F9]">×</button>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              <div>
                <L>Mes</L>
                <input type="month" value={modalLinea.mes || ''} onChange={e => setModalLinea(p => ({ ...p!, mes: e.target.value }))} className="inp" />
              </div>
              <div>
                <L>Categoría</L>
                <select value={modalLinea.categoria || 'remuneraciones'} onChange={e => setModalLinea(p => ({ ...p!, categoria: e.target.value }))} className="inp">
                  {CAT_OFICINA.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <L>Concepto</L>
                <input value={modalLinea.concepto || ''} onChange={e => setModalLinea(p => ({ ...p!, concepto: e.target.value }))} className="inp" placeholder="Ej: Arriendo oficina marzo" />
              </div>
              <div>
                <L>Monto ($MM)</L>
                <input type="number" value={modalLinea.monto || ''} onChange={e => setModalLinea(p => ({ ...p!, monto: parseFloat(e.target.value) || 0 }))} className="inp" placeholder="0" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input type="checkbox" checked={modalLinea.real || false} onChange={e => setModalLinea(p => ({ ...p!, real: e.target.checked }))} className="w-4 h-4 rounded border-[#CBD5E1]" />
                  <span className="text-xs font-semibold text-ink">Dato real (ejecutado)</span>
                </label>
              </div>
              <div className="col-span-2">
                <L>Observación (opcional)</L>
                <input value={modalLinea.observacion || ''} onChange={e => setModalLinea(p => ({ ...p!, observacion: e.target.value }))} className="inp" placeholder="Nota opcional" />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-[#E2E8F0] flex justify-end gap-2">
              <button onClick={() => setModalLinea(null)} className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-semibold hover:bg-[#F1F5F9]">Cancelar</button>
              <button onClick={saveLinea} className="px-4 py-2 bg-cobalt text-white rounded-lg text-xs font-bold hover:bg-cobalt-dark btn-scale">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SubRow({ label, monto, color }: { label: string; monto: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-semibold" style={{ color }}>{label}</span>
      <span className="text-[11px] font-condensed font-bold" style={{ color }}>{fmtMM(monto)}</span>
    </div>
  )
}

function L({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] font-bold uppercase tracking-widest text-slate mb-1">{children}</label>
}
