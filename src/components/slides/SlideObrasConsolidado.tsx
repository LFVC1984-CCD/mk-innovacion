'use client'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { OBRAS } from '@/lib/presentacion/obras-data'

function fmt(n: number) { return `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('es-CL')} MM` }

export default function SlideObrasConsolidado() {
  const { week } = useAppStore()
  const tots = {
    contrato: OBRAS.reduce((s, o) => s + o.presupuestoContrato, 0),
    facturado: OBRAS.reduce((s, o) => s + o.ingresosFacturados, 0),
    saldo: OBRAS.reduce((s, o) => s + (o.presupuestoContrato - o.ingresosFacturados), 0),
    pptoObra: OBRAS.reduce((s, o) => s + o.presupuestoObra, 0),
    comprometido: OBRAS.reduce((s, o) => s + o.costoComprometido, 0),
    gastado: OBRAS.reduce((s, o) => s + o.costoGastado, 0),
    margen: OBRAS.reduce((s, o) => s + (o.presupuestoContrato - o.presupuestoObra), 0),
    flujo: OBRAS.reduce((s, o) => s + (o.ingresosFacturados - o.costoGastado), 0),
  }

  const kpis = [
    { label: 'Contrato Total', value: tots.contrato, color: '#1E1E1E' },
    { label: 'Total Facturado', value: tots.facturado, color: '#0B5ED7' },
    { label: 'Saldo por Facturar', value: tots.saldo, color: '#DC2626' },
    { label: 'Presupuesto de Obra', value: tots.pptoObra, color: '#64748B' },
    { label: 'Costo Comprometido', value: tots.comprometido, color: tots.comprometido > tots.pptoObra ? '#DC2626' : '#D97706' },
    { label: 'Margen Bruto Total', value: tots.margen, color: tots.margen >= 0 ? '#16A34A' : '#DC2626' },
    { label: 'Flujo Acumulado', value: tots.flujo, color: tots.flujo >= 0 ? '#0B5ED7' : '#DC2626' },
  ]

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 bg-cobalt">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-7 rounded-sm bg-gold flex-shrink-0" />
          <div>
            <h2 className="font-condensed font-extrabold text-white uppercase tracking-wider text-xl leading-tight">Obras — Consolidado</h2>
            <div className="text-white/50 text-[10px] tracking-wide">{OBRAS.length} obras activas</div>
          </div>
        </div>
        <span className="text-white/40 text-[10px] tracking-widest uppercase">{week}</span>
      </div>
      <div className="flex gap-3 p-3 flex-1 min-h-0">
        <div className="flex flex-col gap-2.5 w-[42%]">
          <div className="font-condensed font-extrabold text-cobalt text-sm uppercase tracking-wider">Resumen Financiero</div>
          <div className="grid grid-cols-1 gap-1.5">
            {kpis.map((k, i) => (
              <motion.div key={k.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-white rounded border border-slate-200 px-3 py-2 flex items-center justify-between" style={{ boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: k.color }} />
                  <span className="text-[10px] text-slate-600 font-medium">{k.label}</span>
                </div>
                <span className="font-condensed font-black text-[15px] tabular-nums" style={{ color: k.color }}>{fmt(k.value)}</span>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2.5 flex-1">
          <div className="grid grid-cols-2 gap-2.5">
            {OBRAS.map((obra, i) => {
              const margen = obra.presupuestoContrato - obra.presupuestoObra
              const flujo = obra.ingresosFacturados - obra.costoGastado
              const avColor = obra.avanceFisico >= obra.avanceProgramado ? '#16A34A' : '#E1BA10'
              return (
                <motion.div key={obra.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.1 }}
                  className="bg-white rounded border border-slate-200 p-3" style={{ boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                  <div className="font-condensed font-black text-cobalt text-[15px] leading-tight mb-2">{obra.nombre.split(' ').slice(0, 3).join(' ')}</div>
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Avance Físico</span>
                      <span className="text-[9px] font-bold" style={{ color: avColor }}>{obra.avanceFisico}% / {obra.avanceProgramado}%</span>
                    </div>
                    <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ background: avColor }} initial={{ width: 0 }} animate={{ width: `${obra.avanceFisico}%` }} transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 + i * 0.1 }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: 'Contrato', value: obra.presupuestoContrato, color: '#1E1E1E' },
                      { label: 'Facturado', value: obra.ingresosFacturados, color: '#0B5ED7' },
                      { label: 'Margen', value: margen, color: margen >= 0 ? '#16A34A' : '#DC2626' },
                      { label: 'Flujo', value: flujo, color: flujo >= 0 ? '#0B5ED7' : '#DC2626' },
                    ].map(item => (
                      <div key={item.label} className="bg-slate-50 rounded p-1.5 border border-slate-100">
                        <div className="text-[7.5px] text-slate-400 uppercase tracking-widest font-bold">{item.label}</div>
                        <div className="font-condensed font-black text-[13px] leading-tight mt-0.5" style={{ color: item.color }}>{fmt(item.value)}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
