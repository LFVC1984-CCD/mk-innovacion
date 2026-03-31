'use client'
import { useState, useEffect, useRef } from 'react'
import type { Proyecto } from '@/lib/types'
import { ESTADO_COLORS } from '@/lib/types'
import { fmtMM, fmtFecha } from '@/lib/comites/data'
import AnimatedBar from './AnimatedBar'
import MiniGauge from './MiniGauge'

interface Props {
  proyecto: Proyecto
  equipoNames: string[]
  onUpdate: (fields: Partial<Proyecto>) => void
}

function NumField({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate mb-1">{label}</label>
      <input
        type="number"
        value={value || ''}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-2.5 py-2 border border-[#E2E8F0] rounded-lg text-xs text-right outline-none focus:border-cobalt transition-colors"
        placeholder="0"
      />
    </div>
  )
}

function ReadOnly({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate mb-1">{label}</label>
      <div className="font-condensed text-lg font-extrabold leading-tight" style={{ color: color || '#0B5ED7' }}>{value}</div>
      {sub && <div className="text-[10px] text-slate mt-0.5">{sub}</div>}
    </div>
  )
}

export default function ObraFinCard({ proyecto: p, equipoNames, onUpdate }: Props) {
  const [open, setOpen] = useState(true)
  const [local, setLocal] = useState(p)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const color = ESTADO_COLORS[local.estado]

  // Sync from parent when proyecto changes (e.g. after Supabase reload)
  useEffect(() => { setLocal(p) }, [p])

  function updLocal(field: keyof Proyecto, val: number | string) {
    setLocal(prev => {
      const next = { ...prev, [field]: val }
      // Recalc comprometido
      next.comprometido = next.oc + next.sc + next.adicionales + next.gastos_matriz + next.mano_obra
      // Recalc SPI
      next.spi = next.avance_prog > 0 ? Math.round((next.avance_real / next.avance_prog) * 100) / 100 : 0
      // Recalc CPI
      const gr = next.gastado + next.mano_obra
      next.cpi = gr > 0 ? Math.round((next.facturado / gr) * 100) / 100 : 0
      return next
    })
    // Debounce save to parent/Supabase
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLocal(cur => {
        onUpdate({ [field]: val, comprometido: cur.comprometido, spi: cur.spi, cpi: cur.cpi })
        return cur
      })
    }, 800)
  }

  // Use local state for all reads
  const lp = local

  // ── Auto-calculations ──
  const comprometido = lp.oc + lp.sc + lp.adicionales + lp.gastos_matriz + lp.mano_obra
  const gastoReal = lp.gastado + lp.mano_obra
  const flujoFinanciero = lp.facturado - gastoReal
  const saldoProveedores = comprometido - lp.gastado - lp.mano_obra
  const saldoFacturar = (lp.contrato + lp.ndc) - lp.facturado
  const pctFacturado = (lp.contrato + lp.ndc) > 0 ? Math.round((lp.facturado / (lp.contrato + lp.ndc)) * 100) : 0
  const margen = lp.contrato - lp.presupuesto
  const margenPct = lp.contrato > 0 ? Math.round((margen / lp.contrato) * 1000) / 10 : 0
  const spi = lp.avance_prog > 0 ? Math.round((lp.avance_real / lp.avance_prog) * 100) / 100 : 0
  const cpi = gastoReal > 0 ? Math.round((lp.facturado / gastoReal) * 100) / 100 : 0

  const spiColor = spi >= 1 ? '#16A34A' : spi >= 0.85 ? '#D97706' : '#DC2626'
  const cpiColor = cpi >= 1 ? '#16A34A' : cpi >= 0.85 ? '#D97706' : '#DC2626'
  const spiLabel = spi >= 1 ? 'En línea' : spi >= 0.85 ? 'Alerta' : 'Retraso'
  const cpiLabel = cpi >= 1 ? 'Productivo' : cpi > 0 ? 'Sobre costo' : '—'

  function upd(field: keyof Proyecto, val: number) {
    updLocal(field, val)
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm mb-3">
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o) } }}
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
          <h3 className="text-[14px] font-bold text-ink">{lp.nombre}</h3>
          {lp.estado === 'cerrado_saldo' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber font-bold">Cerrado con saldo</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cobalt-light text-cobalt font-bold">{fmtMM(lp.contrato)}</span>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold" style={{ background: spiColor + '15', color: spiColor }}>SPI {spi}</span>
          <span className="text-slate-400 text-sm">{open ? '▾' : '▸'}</span>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 border-t border-[#E2E8F0]">
          {/* Meta info */}
          <div className="flex gap-4 text-[10px] text-slate-500 py-2 flex-wrap">
            {lp.mandante && <span>Mandante: <strong className="text-ink">{lp.mandante}</strong></span>}
            {lp.administrador && <span>Admin: <strong className="text-ink">{lp.administrador}</strong></span>}
            {lp.fecha_termino && <span>Contractual: <strong className="text-ink">{fmtFecha(lp.fecha_termino)}</strong></span>}
            {lp.fecha_fin_asbuilt && (
              <span style={{ color: new Date(lp.fecha_fin_asbuilt) > new Date(lp.fecha_termino || '') ? '#DC2626' : '#16A34A' }}>
                Asbuilt: <strong>{fmtFecha(lp.fecha_fin_asbuilt)}</strong>
              </span>
            )}
            {equipoNames.length > 0 && <span>Equipo: <strong className="text-ink">{equipoNames.join(', ')}</strong></span>}
          </div>

          {/* ── VENTA ── */}
          <p className="text-[10px] font-extrabold uppercase tracking-widerr text-cobalt mt-2 mb-2">Venta</p>
          <div className="grid grid-cols-5 gap-2.5">
            <NumField label="Contrato ($MM)" value={lp.contrato} onChange={v => upd('contrato', v)} />
            <NumField label="NDC Aprobadas ($MM)" value={lp.ndc} onChange={v => upd('ndc', v)} />
            <NumField label="NDC en Revisión ($MM)" value={lp.ndc_revision} onChange={v => upd('ndc_revision', v)} />
            <NumField label="Facturado ($MM)" value={lp.facturado} onChange={v => upd('facturado', v)} />
            <NumField label="Presupuesto ($MM)" value={lp.presupuesto} onChange={v => upd('presupuesto', v)} />
          </div>

          {/* ── COMPROMETIDO (desglose) ── */}
          <p className="text-[10px] font-extrabold uppercase tracking-widerr text-amber mt-4 mb-2">Comprometido (desglose)</p>
          <div className="grid grid-cols-6 gap-2.5">
            <NumField label="OC ($MM)" value={lp.oc} onChange={v => upd('oc', v)} />
            <NumField label="SC ($MM)" value={lp.sc} onChange={v => upd('sc', v)} />
            <NumField label="Adicionales ($MM)" value={lp.adicionales} onChange={v => upd('adicionales', v)} />
            <NumField label="Gastos Matriz ($MM)" value={lp.gastos_matriz} onChange={v => upd('gastos_matriz', v)} />
            <NumField label="Mano de Obra ($MM)" value={lp.mano_obra} onChange={v => upd('mano_obra', v)} />
            <ReadOnly label="Total Comprometido" value={`$${comprometido} MM`} color="#D97706" />
          </div>

          {/* ── GASTO ── */}
          <p className="text-[10px] font-extrabold uppercase tracking-widerr text-danger mt-4 mb-2">Gasto</p>
          <div className="grid grid-cols-4 gap-2.5">
            <NumField label="Gastado / Facturas ($MM)" value={lp.gastado} onChange={v => upd('gastado', v)} />
            <ReadOnly label="Mano de Obra" value={`$${lp.mano_obra} MM`} color="#64748B" sub="(ingresado arriba)" />
            <ReadOnly label="Gasto Real" value={`$${gastoReal} MM`} color="#DC2626" sub="Facturas + MO" />
            <ReadOnly label="Saldo Proveedores" value={`$${saldoProveedores} MM`} color={saldoProveedores > 0 ? '#DC2626' : '#16A34A'} sub="Comprometido − Gastado − MO" />
          </div>

          {/* ── AVANCE ── */}
          <p className="text-[10px] font-extrabold uppercase tracking-widerr text-success mt-4 mb-2">Avance</p>
          <div className="grid grid-cols-4 gap-2.5 items-end">
            <NumField label="Avance Real (%)" value={lp.avance_real} onChange={v => upd('avance_real', v)} />
            <NumField label="Avance Prog. (%)" value={lp.avance_prog} onChange={v => upd('avance_prog', v)} />
            <div className="flex justify-center gap-4">
              <MiniGauge value={spi} max={1.5} label="SPI" sublabel={spiLabel} color={spiColor} />
              <MiniGauge value={cpi} max={1.5} label="CPI" sublabel={cpiLabel} color={cpiColor} />
            </div>
          </div>

          {/* Animated avance bar */}
          <div className="mt-2">
            <AnimatedBar
              value={lp.avance_real}
              secondValue={lp.avance_prog}
              secondColor="#0B5ED730"
              color={lp.avance_real >= lp.avance_prog ? '#16A34A' : '#DC2626'}
              showLabel
            />
          </div>

          {/* ── KPIs RESUMEN ── */}
          <div className="grid grid-cols-6 gap-2.5 mt-4 bg-white border border-[#E2E8F0] rounded-xl p-3.5">
            <ReadOnly label="Flujo Financiero" value={`$${flujoFinanciero} MM`} color={flujoFinanciero >= 0 ? '#E1BA10' : '#DC2626'} sub="Facturado − Gasto Real" />
            <ReadOnly label="Saldo x Facturar" value={`$${saldoFacturar} MM`} color="#D97706" sub={`${pctFacturado}% facturado`} />
            <ReadOnly label="Saldo Proveedores" value={`$${saldoProveedores} MM`} color={saldoProveedores > 0 ? '#DC2626' : '#16A34A'} />
            <ReadOnly label="Margen $" value={`${margen >= 0 ? '+' : ''}$${margen} MM`} color={margen >= 0 ? '#16A34A' : '#DC2626'} />
            <ReadOnly label="Margen %" value={`${margenPct}%`} color={margenPct >= 15 ? '#16A34A' : '#D97706'} />
            <ReadOnly label="NDC en Revisión" value={`$${lp.ndc_revision} MM`} color="#0B5ED7" sub="Pendiente aprobación" />
          </div>

          {/* Comentario */}
          <div className="mt-3">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate mb-1">Comentario</label>
            <input
              value={lp.comentario_financiero || ''}
              onChange={e => updLocal('comentario_financiero', e.target.value)}
              className="w-full px-2.5 py-2 border border-[#E2E8F0] rounded-lg text-[11px] outline-none focus:border-cobalt"
              placeholder="Notas financieras de la obra..."
            />
          </div>
        </div>
      )}
    </div>
  )
}
