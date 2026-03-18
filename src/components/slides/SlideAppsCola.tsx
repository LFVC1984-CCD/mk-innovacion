'use client'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'

const APPS = [
  { name: 'Control de Mano de Obra', color: '#0B5ED7', icon: '👷', dev: 'Luis Macri + Rafael',
    stages: [{ label: 'Prototipo', pct: 100 },{ label: 'App operativa', pct: 100 },{ label: 'Rev. Terreno', pct: 30 },{ label: 'Desarrollo', pct: 0 },{ label: 'Lanzamiento', pct: 0 }],
    datos: ['Asistencia Constructora (HH Reales)','Asistencia Subcontratos (HH Reales)','Recursos usados por proceso','Recursos usados por recinto','Empresas y trabajadores'],
    kpis: ['CPI — Productividad Mano de Obra','HH planificadas vs HH reales','Costo MO por proceso / recinto','Rendimiento por cuadrilla / empresa'] },
  { name: 'Prevención de Riesgos', color: '#DC2626', icon: '⛑️', dev: 'Rafael Castillo',
    stages: [{ label: 'Prototipo', pct: 60 },{ label: 'App operativa', pct: 100 },{ label: 'Rev. Terreno', pct: 0 },{ label: 'Desarrollo', pct: 0 },{ label: 'Lanzamiento', pct: 0 }],
    datos: ['Informes de riesgo','Incidentes en obra','Accidentes registrados','Amonestaciones por trabajador','Charlas individuales y grupales'],
    kpis: ['Tasa de accidentabilidad','Índice de frecuencia / gravedad','Amonestaciones por empresa SC','Cumplimiento de charlas (% workers)'] },
  { name: 'Gestión Documental SC', color: '#D97706', icon: '📋', dev: 'Luis Macri',
    stages: [{ label: 'Prototipo', pct: 90 },{ label: 'App operativa', pct: 0 },{ label: 'Rev. Terreno', pct: 0 },{ label: 'Desarrollo', pct: 0 },{ label: 'Lanzamiento', pct: 0 }],
    datos: ['Trabajadores enrolados por SC','Documentos legales trabajadores','Documentos Estados de Pago SC','Documentos legales subcontratos','Vencimiento de docs y certificados'],
    kpis: ['% documentación completa por SC','Alertas de vencimiento próximo','Documentos pendientes por empresa','Habilitación legal para pago de EP'] },
]

function stageColor(pct: number, idx: number) {
  if (pct === 0) return { fill: '#F1F5F9', text: '#94A3B8' }
  if (pct === 100 && idx === 1) return { fill: '#0B5ED7', text: '#FFFFFF' }
  if (pct === 100) return { fill: '#16A34A', text: '#FFFFFF' }
  return { fill: '#E1BA10', text: '#1A1200' }
}

export default function SlideAppsCola() {
  const { week } = useAppStore()
  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 bg-cobalt">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-7 rounded-sm bg-gold flex-shrink-0" />
          <div>
            <h2 className="font-condensed font-extrabold text-white uppercase tracking-wider text-xl leading-tight">Aplicaciones CCD — En Cola de Desarrollo</h2>
            <div className="text-white/50 text-[10px] tracking-wide">3 apps · mismo eje transversal</div>
          </div>
        </div>
        <span className="text-white/40 text-[10px] tracking-widest uppercase">{week}</span>
      </div>
      <div className="grid grid-cols-3 gap-2.5 p-3 flex-1 min-h-0">
        {APPS.map((app, i) => (
          <motion.div key={app.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.35 }}
            className="bg-white rounded border border-slate-200 overflow-hidden flex flex-col" style={{ boxShadow: '0 2px 10px rgba(0,0,0,.07)' }}>
            <div className="h-1 flex-shrink-0" style={{ background: app.color }} />
            <div className="px-3 py-2.5 flex-shrink-0" style={{ background: `${app.color}0e` }}>
              <div className="flex items-start justify-between gap-1 mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{app.icon}</span>
                  <span className="font-condensed font-extrabold text-[14px] uppercase tracking-wide leading-tight" style={{ color: app.color }}>{app.name}</span>
                </div>
                <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0" style={{ background: '#FEF3C7', color: '#D97706' }}>EN COLA</span>
              </div>
              <div className="text-[8.5px] text-slate-400 italic">Dev: {app.dev}</div>
            </div>
            <div className="px-3 py-2 border-b border-slate-100 flex-shrink-0">
              <div className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Estado de desarrollo</div>
              <div className="space-y-1.5">
                {app.stages.map((stage, si) => {
                  const sc = stageColor(stage.pct, si)
                  return (
                    <div key={stage.label} className="flex items-center gap-2">
                      <span className="text-[8px] text-slate-500 w-[72px] flex-shrink-0">{stage.label}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{ background: sc.fill === '#F1F5F9' ? 'transparent' : sc.fill }}
                          initial={{ width: 0 }} animate={{ width: `${stage.pct}%` }} transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.1 + si * 0.06 }} />
                      </div>
                      <span className="text-[8px] font-bold tabular-nums w-7 text-right" style={{ color: stage.pct === 0 ? '#CBD5E1' : sc.fill }}>{stage.pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-col flex-1 px-3 py-2 gap-2">
              <div>
                <div className="text-[8.5px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Datos capturados</div>
                <div className="space-y-1">{app.datos.map((d, di) => (
                  <div key={di} className="flex items-start gap-1.5"><div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: app.color }} /><span className="text-[10px] text-slate-700 leading-snug">{d}</span></div>
                ))}</div>
              </div>
              <div className="border-t border-slate-100" />
              <div>
                <div className="text-[8.5px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">KPIs / Outputs</div>
                <div className="space-y-1">{app.kpis.map((k, ki) => (
                  <div key={ki} className="flex items-start gap-1.5"><span className="text-[9px] flex-shrink-0 mt-0.5" style={{ color: app.color }}>▶</span><span className="text-[10px] text-slate-600 leading-snug font-medium">{k}</span></div>
                ))}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
