'use client'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Obra } from '@/lib/presentacion/obras-data'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'

function fmt(n: number) { return `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('es-CL')} MM` }

function Badge({ text, level }: { text: string; level: 'ok' | 'warn' | 'danger' }) {
  const s = { ok: { bg: '#DCFCE7', c: '#16A34A' }, warn: { bg: '#FEF3C7', c: '#D97706' }, danger: { bg: '#FEE2E2', c: '#DC2626' } }[level]
  return <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide" style={{ background: s.bg, color: s.c }}>{text}</span>
}

function ProgBar({ label, pct, color, delay }: { label: string; pct: number; color: string; delay: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[9.5px] text-slate-500 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.75, ease: 'easeOut', delay }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums w-8 text-right" style={{ color }}>{pct}%</span>
    </div>
  )
}

function CostoBar({ label, value, total, color, delay }: { label: string; value: number; total: number; color: string; delay: number }) {
  const p = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[9.5px] text-slate-500 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${p}%` }} transition={{ duration: 0.75, ease: 'easeOut', delay }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums w-7 text-right" style={{ color }}>{p}%</span>
      <span className="text-[10px] text-slate-500 tabular-nums w-16 text-right">{fmt(value)}</span>
    </div>
  )
}

export default function SlideObra({ obra }: { obra: Obra }) {
  const { week } = useAppStore()
  const saldoFacturar = obra.presupuestoContrato - obra.ingresosFacturados
  const margen = obra.presupuestoContrato - obra.presupuestoObra
  const flujo = obra.ingresosFacturados - obra.costoGastado
  const costoOver = obra.costoComprometido > obra.presupuestoObra
  const avColor = obra.avanceFisico >= obra.avanceProgramado ? '#16A34A' : '#E1BA10'

  const chartData = [
    { name: 'Contrato', value: obra.presupuestoContrato, fill: '#E2E8F0', stroke: '#1E1E1E' },
    { name: 'Facturado', value: obra.ingresosFacturados, fill: '#0B5ED7', stroke: '#0847A8' },
    { name: 'P. Obra', value: obra.presupuestoObra, fill: '#CBD5E1', stroke: '#64748B' },
    { name: 'Comprometido', value: obra.costoComprometido, fill: costoOver ? '#FCA5A5' : '#FCD34D', stroke: costoOver ? '#DC2626' : '#D97706' },
    { name: 'Gastado', value: obra.costoGastado, fill: '#94A3B8', stroke: '#64748B' },
  ]

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 bg-cobalt">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-7 rounded-sm bg-gold flex-shrink-0" />
          <div>
            <h2 className="font-condensed font-extrabold text-white uppercase tracking-wider text-xl leading-tight">{obra.nombre}</h2>
            <div className="text-white/50 text-[10px]">{obra.mandante} · {obra.ubicacion}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge text={obra.estadoPago} level={obra.estadoPago === 'Al día' ? 'ok' : 'warn'} />
          <span className="text-white/40 text-[10px] tracking-widest uppercase">{week}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 p-3 flex-1 min-h-0">
        <div className="flex flex-col gap-2.5">
          <div className="bg-white rounded border border-slate-200 p-3" style={{ boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
            <div className="font-condensed font-extrabold text-cobalt text-sm uppercase tracking-wider mb-2.5">Avance Físico</div>
            <div className="space-y-2">
              <ProgBar label="Real" pct={obra.avanceFisico} color={avColor} delay={0.1} />
              <ProgBar label="Programado" pct={obra.avanceProgramado} color="#94A3B8" delay={0.2} />
            </div>
          </div>
          <div className="bg-white rounded border border-slate-200 p-3 flex-1" style={{ boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
            <div className="font-condensed font-extrabold text-cobalt text-sm uppercase tracking-wider mb-2">Ingresos</div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-700">Presupuesto Contrato</span>
              <span className="font-condensed font-black text-sm text-ink">{fmt(obra.presupuestoContrato)}</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-3 border-b border-slate-50">
              <span className="text-[9.5px] text-slate-500">Ingresos Facturados</span>
              <span className="font-condensed font-bold text-[12px] tabular-nums text-cobalt">{fmt(obra.ingresosFacturados)}</span>
            </div>
            <div className="flex justify-between items-center pt-1.5 mt-0.5">
              <span className="text-[10.5px] font-bold text-slate-700">Saldo por Facturar</span>
              <span className="font-condensed font-black text-base text-red-600">{fmt(saldoFacturar)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white rounded border p-3" style={{ borderColor: `${margen >= 0 ? '#16A34A' : '#DC2626'}50` }}>
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Margen (Cto − P.Obra)</div>
              <div className="font-condensed font-black text-2xl leading-none" style={{ color: margen >= 0 ? '#16A34A' : '#DC2626' }}>{fmt(margen)}</div>
            </div>
            <div className="bg-white rounded border p-3" style={{ borderColor: `${flujo >= 0 ? '#0B5ED7' : '#DC2626'}50` }}>
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Flujo (Fact − Gastado)</div>
              <div className="font-condensed font-black text-2xl leading-none" style={{ color: flujo >= 0 ? '#0B5ED7' : '#DC2626' }}>{fmt(flujo)}</div>
            </div>
          </div>
          <div className="bg-white rounded border border-slate-200 p-3" style={{ boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
            <div className="font-condensed font-extrabold text-cobalt text-sm uppercase tracking-wider mb-2">Costos</div>
            <div className="space-y-2">
              <CostoBar label="Comprometido" value={obra.costoComprometido} total={obra.presupuestoObra} color={costoOver ? '#DC2626' : '#D97706'} delay={0.2} />
              <CostoBar label="Gastado" value={obra.costoGastado} total={obra.presupuestoObra} color="#64748B" delay={0.3} />
            </div>
          </div>
          <div className="bg-white rounded border border-slate-200 p-3 flex-1" style={{ boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
            <div className="font-condensed font-extrabold text-cobalt text-sm uppercase tracking-wider mb-1">Resumen Financiero</div>
            <ResponsiveContainer width="100%" height="76%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={32}>
                <CartesianGrid vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 8.5, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: '#64748B' }} axisLine={false} tickLine={false} width={32} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(v) => [`${fmt(Number(v))}`]} contentStyle={{ fontSize: 10, borderRadius: 6, border: '1px solid #E2E8F0' }} cursor={{ fill: 'rgba(0,0,0,.04)' }} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry, index) => <Cell key={index} fill={entry.fill} stroke={entry.stroke} strokeWidth={1} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
