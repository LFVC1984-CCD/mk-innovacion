'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/comites/hooks'
import { fmtMM } from '@/lib/comites/data'

// ── Types ──

type LineaTipo = 'ingreso' | 'egreso'
type LineaCategoria =
  | 'facturacion' | 'cobro_factura' | 'anticipo' | 'retencion_liberada' | 'otro_ingreso'
  | 'mano_obra' | 'subcontrato' | 'material' | 'arriendo' | 'gastos_generales' | 'impuesto' | 'financiero' | 'otro_egreso'

interface LineaFlujo {
  id: string
  mes: string // YYYY-MM
  tipo: LineaTipo
  categoria: LineaCategoria
  concepto: string
  monto: number
  real: boolean // true = ejecutado, false = proyección
  observacion: string | null
  created_at?: string
}

const EMPTY_LINEA: Omit<LineaFlujo, 'id'> = {
  mes: new Date().toISOString().slice(0, 7), tipo: 'ingreso', categoria: 'facturacion',
  concepto: '', monto: 0, real: false, observacion: null,
}

const CAT_INGRESOS: { key: LineaCategoria; label: string }[] = [
  { key: 'facturacion', label: 'Facturación' },
  { key: 'cobro_factura', label: 'Cobro de facturas' },
  { key: 'anticipo', label: 'Anticipo' },
  { key: 'retencion_liberada', label: 'Retención liberada' },
  { key: 'otro_ingreso', label: 'Otro ingreso' },
]

const CAT_EGRESOS: { key: LineaCategoria; label: string }[] = [
  { key: 'mano_obra', label: 'Mano de obra' },
  { key: 'subcontrato', label: 'Subcontratos' },
  { key: 'material', label: 'Materiales / OC' },
  { key: 'arriendo', label: 'Arriendos' },
  { key: 'gastos_generales', label: 'Gastos generales' },
  { key: 'impuesto', label: 'Impuestos' },
  { key: 'financiero', label: 'Costos financieros' },
  { key: 'otro_egreso', label: 'Otro egreso' },
]

const ALL_CATS = [...CAT_INGRESOS, ...CAT_EGRESOS]
function catLabel(key: LineaCategoria): string {
  return ALL_CATS.find(c => c.key === key)?.label || key
}

// Generar últimos N meses + próximos M
function generateMonths(back: number, forward: number): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = -back; i <= forward; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    months.push(d.toISOString().slice(0, 7))
  }
  return months
}

function fmtMes(mes: string): string {
  const [y, m] = mes.split('-')
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${meses[parseInt(m) - 1]} ${y.slice(2)}`
}

export default function FinanzasPanel() {
  const supabase = createClient()
  const { canEdit } = useAuth()
  const ce = canEdit('finanzas')

  const [lineas, setLineas] = useState<LineaFlujo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalLinea, setModalLinea] = useState<Partial<LineaFlujo> | null>(null)
  const [view, setView] = useState<'resumen' | 'detalle'>('resumen')

  const months = useMemo(() => generateMonths(3, 6), [])
  const currentMonth = new Date().toISOString().slice(0, 7)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('flujo_financiero').select('*').order('mes').order('tipo')
    setLineas((data || []) as LineaFlujo[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Consolidado ──
  const consol = useMemo(() => {
    const mesActual = lineas.filter(l => l.mes === currentMonth)
    const ingMes = mesActual.filter(l => l.tipo === 'ingreso').reduce((s, l) => s + l.monto, 0)
    const egMes = mesActual.filter(l => l.tipo === 'egreso').reduce((s, l) => s + l.monto, 0)

    const totalIng = lineas.filter(l => l.tipo === 'ingreso').reduce((s, l) => s + l.monto, 0)
    const totalEg = lineas.filter(l => l.tipo === 'egreso').reduce((s, l) => s + l.monto, 0)

    const proyectado = lineas.filter(l => !l.real)
    const ingProy = proyectado.filter(l => l.tipo === 'ingreso').reduce((s, l) => s + l.monto, 0)
    const egProy = proyectado.filter(l => l.tipo === 'egreso').reduce((s, l) => s + l.monto, 0)

    return { ingMes, egMes, saldoMes: ingMes - egMes, totalIng, totalEg, saldoTotal: totalIng - totalEg, ingProy, egProy }
  }, [lineas, currentMonth])

  // ── Por mes ──
  const porMes = useMemo(() => {
    return months.map(mes => {
      const del = lineas.filter(l => l.mes === mes)
      const ing = del.filter(l => l.tipo === 'ingreso').reduce((s, l) => s + l.monto, 0)
      const eg = del.filter(l => l.tipo === 'egreso').reduce((s, l) => s + l.monto, 0)
      const esReal = del.some(l => l.real)
      return { mes, ing, eg, saldo: ing - eg, esReal, isPast: mes < currentMonth, isCurrent: mes === currentMonth }
    })
  }, [lineas, months, currentMonth])

  // Saldo acumulado
  const porMesAcum = useMemo(() => {
    let acum = 0
    return porMes.map(m => {
      acum += m.saldo
      return { ...m, acumulado: acum }
    })
  }, [porMes])

  // ── CRUD ──
  async function saveLinea() {
    if (!modalLinea || !modalLinea.concepto?.trim()) return
    if ((modalLinea as LineaFlujo).id) {
      const { id, ...rest } = modalLinea as LineaFlujo
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
    return <div className="py-8 text-center text-slate-400 text-sm">Cargando flujo financiero...</div>
  }

  // Max value for bar chart
  const maxVal = Math.max(...porMesAcum.map(m => Math.max(m.ing, m.eg)), 1)

  return (
    <div>
      {/* Consolidado */}
      <div className="bg-[#0F172A] rounded-xl p-5 grid grid-cols-5 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Ingreso mes actual</p>
          <p className="font-condensed text-[28px] font-black text-green-400 leading-tight mt-1">{fmtMM(consol.ingMes)}</p>
          <p className="text-[10px] text-white/30 mt-0.5">{fmtMes(currentMonth)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Egreso mes actual</p>
          <p className="font-condensed text-[28px] font-black text-red-400 leading-tight mt-1">{fmtMM(consol.egMes)}</p>
          <p className="text-[10px] text-white/30 mt-0.5">{fmtMes(currentMonth)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Saldo mes</p>
          <p className="font-condensed text-[28px] font-black leading-tight mt-1" style={{ color: consol.saldoMes >= 0 ? '#E1BA10' : '#DC2626' }}>
            {consol.saldoMes >= 0 ? '+' : ''}{fmtMM(consol.saldoMes)}
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">Ing - Eg</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Saldo Acumulado</p>
          <p className="font-condensed text-[28px] font-black leading-tight mt-1" style={{ color: consol.saldoTotal >= 0 ? '#16A34A' : '#DC2626' }}>
            {consol.saldoTotal >= 0 ? '+' : ''}{fmtMM(consol.saldoTotal)}
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">Todo el período</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Proyectado</p>
          <p className="font-condensed text-lg font-black text-white/60 leading-tight mt-1">
            +{fmtMM(consol.ingProy)}
          </p>
          <p className="font-condensed text-lg font-black text-white/40 leading-tight">
            -{fmtMM(consol.egProy)}
          </p>
        </div>
      </div>

      {/* Chart: barras por mes */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Flujo mensual ($MM)</p>
          <div className="flex gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500" /> Ingresos</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-400" /> Egresos</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-1 rounded bg-gold" /> Saldo acum.</span>
          </div>
        </div>
        <div className="flex gap-1 items-end" style={{ height: 120 }}>
          {porMesAcum.map(m => (
            <div key={m.mes} className="flex-1 flex flex-col items-center gap-0.5">
              {/* Bars */}
              <div className="w-full flex gap-0.5 items-end" style={{ height: 80 }}>
                <div className="flex-1 rounded-t transition-all" style={{
                  height: `${(m.ing / maxVal) * 100}%`,
                  background: m.isPast ? '#16A34A' : m.isCurrent ? '#16A34A' : '#16A34A40',
                  minHeight: m.ing > 0 ? 2 : 0,
                }} />
                <div className="flex-1 rounded-t transition-all" style={{
                  height: `${(m.eg / maxVal) * 100}%`,
                  background: m.isPast ? '#F87171' : m.isCurrent ? '#F87171' : '#F8717140',
                  minHeight: m.eg > 0 ? 2 : 0,
                }} />
              </div>
              {/* Saldo line indicator */}
              <div className={`text-[8px] font-bold ${m.saldo >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {m.saldo !== 0 ? (m.saldo > 0 ? '+' : '') + m.saldo : ''}
              </div>
              {/* Label */}
              <div className={`text-[9px] font-bold ${m.isCurrent ? 'text-cobalt' : 'text-slate-400'}`}>
                {fmtMes(m.mes)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detalle tabs */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          <button onClick={() => setView('resumen')}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${view === 'resumen' ? 'bg-cobalt text-white border-cobalt' : 'bg-white border-[#E2E8F0] text-slate-500'}`}>
            Resumen por mes
          </button>
          <button onClick={() => setView('detalle')}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${view === 'detalle' ? 'bg-cobalt text-white border-cobalt' : 'bg-white border-[#E2E8F0] text-slate-500'}`}>
            Detalle líneas ({lineas.length})
          </button>
        </div>
        {ce && (
          <button onClick={() => setModalLinea({ ...EMPTY_LINEA })} className="bg-cobalt text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold">
            + Nueva línea
          </button>
        )}
      </div>

      {/* ══ RESUMEN POR MES ══ */}
      {view === 'resumen' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                <th className="text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Mes</th>
                <th className="text-right px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-green-500">Ingresos</th>
                <th className="text-right px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-red-400">Egresos</th>
                <th className="text-right px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Saldo</th>
                <th className="text-right px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {porMesAcum.filter(m => m.ing > 0 || m.eg > 0).map(m => (
                <tr key={m.mes} className={`border-b border-slate-100 ${m.isCurrent ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-3.5 py-2.5 font-semibold text-ink">
                    {fmtMes(m.mes)}
                    {m.isCurrent && <span className="text-[9px] text-cobalt font-bold ml-1">actual</span>}
                    {!m.esReal && !m.isPast && <span className="text-[9px] text-slate-400 ml-1">(proy)</span>}
                  </td>
                  <td className="px-3.5 py-2.5 text-right font-condensed font-bold text-green-600">{m.ing > 0 ? fmtMM(m.ing) : '—'}</td>
                  <td className="px-3.5 py-2.5 text-right font-condensed font-bold text-red-500">{m.eg > 0 ? fmtMM(m.eg) : '—'}</td>
                  <td className="px-3.5 py-2.5 text-right font-condensed font-bold" style={{ color: m.saldo >= 0 ? '#16A34A' : '#DC2626' }}>
                    {m.saldo >= 0 ? '+' : ''}{fmtMM(m.saldo)}
                  </td>
                  <td className="px-3.5 py-2.5 text-right font-condensed font-bold" style={{ color: m.acumulado >= 0 ? '#0B5ED7' : '#DC2626' }}>
                    {m.acumulado >= 0 ? '+' : ''}{fmtMM(m.acumulado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {porMesAcum.every(m => m.ing === 0 && m.eg === 0) && (
            <div className="p-12 text-center text-slate-400 text-sm">
              Sin datos de flujo. Agrega líneas de ingreso y egreso por mes.
            </div>
          )}
        </div>
      )}

      {/* ══ DETALLE LÍNEAS ══ */}
      {view === 'detalle' && (
        lineas.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate-400 text-sm">
            Sin líneas de flujo. Agrega ingresos y egresos proyectados y reales.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                  <th className="text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Mes</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Tipo</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Categoría</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Concepto</th>
                  <th className="text-right px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Monto ($MM)</th>
                  <th className="text-center px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">R/P</th>
                  {ce && <th className="w-16" />}
                </tr>
              </thead>
              <tbody>
                {lineas.map(l => (
                  <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3.5 py-2.5 font-semibold text-ink">{fmtMes(l.mes)}</td>
                    <td className="px-3.5 py-2.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${l.tipo === 'ingreso' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                        {l.tipo === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-500">{catLabel(l.categoria)}</td>
                    <td className="px-3.5 py-2.5 text-ink">{l.concepto}</td>
                    <td className="px-3.5 py-2.5 text-right font-condensed font-bold" style={{ color: l.tipo === 'ingreso' ? '#16A34A' : '#DC2626' }}>
                      {fmtMM(l.monto)}
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <span className={`text-[9px] font-bold ${l.real ? 'text-green-600' : 'text-slate-400'}`}>
                        {l.real ? 'Real' : 'Proy'}
                      </span>
                    </td>
                    {ce && (
                      <td className="px-2 py-2.5 text-right">
                        <button onClick={() => setModalLinea({ ...l })} className="text-slate-400 hover:text-cobalt text-[10px] mr-1">editar</button>
                        <button onClick={() => deleteLinea(l.id)} className="text-slate-300 hover:text-red-500 text-sm">×</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ══ MODAL LÍNEA ══ */}
      {modalLinea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalLinea(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[500px] max-h-[85vh] overflow-y-auto mx-4" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="font-condensed font-bold text-lg text-ink">{(modalLinea as LineaFlujo).id ? 'Editar línea' : 'Nueva línea de flujo'}</h3>
              <button onClick={() => setModalLinea(null)} className="text-slate-400 hover:text-ink text-lg">×</button>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Mes</label>
                <input type="month" value={modalLinea.mes || ''} onChange={e => setModalLinea(p => ({ ...p!, mes: e.target.value }))} className="inp" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Tipo</label>
                <select value={modalLinea.tipo || 'ingreso'} onChange={e => setModalLinea(p => ({ ...p!, tipo: e.target.value as LineaTipo }))} className="inp">
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Categoría</label>
                <select value={modalLinea.categoria || 'facturacion'} onChange={e => setModalLinea(p => ({ ...p!, categoria: e.target.value as LineaCategoria }))} className="inp">
                  <optgroup label="Ingresos">
                    {CAT_INGRESOS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </optgroup>
                  <optgroup label="Egresos">
                    {CAT_EGRESOS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Monto ($MM)</label>
                <input type="number" value={modalLinea.monto || ''} onChange={e => setModalLinea(p => ({ ...p!, monto: parseFloat(e.target.value) || 0 }))} className="inp" placeholder="0" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Concepto</label>
                <input value={modalLinea.concepto || ''} onChange={e => setModalLinea(p => ({ ...p!, concepto: e.target.value }))} className="inp" placeholder="Ej: Factura EP3 Edificio Centro" />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={modalLinea.real || false} onChange={e => setModalLinea(p => ({ ...p!, real: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300" />
                  <span className="text-xs font-semibold text-ink">Dato real (ejecutado)</span>
                </label>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Observación</label>
                <input value={modalLinea.observacion || ''} onChange={e => setModalLinea(p => ({ ...p!, observacion: e.target.value }))} className="inp" placeholder="Nota opcional" />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-[#E2E8F0] flex justify-end gap-2">
              <button onClick={() => setModalLinea(null)} className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-semibold">Cancelar</button>
              <button onClick={saveLinea} className="px-4 py-2 bg-cobalt text-white rounded-lg text-xs font-bold">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
