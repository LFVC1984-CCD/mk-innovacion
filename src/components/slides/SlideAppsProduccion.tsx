'use client'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'

const APPS = [
  { name: 'Presupuestos', color: '#0B5ED7', icon: '📊', status: 'PRODUCCIÓN', desc: 'Control financiero de obra', datos: ['Presupuesto Contrato','Notas de Cambio (NDC)','Presupuesto de Obra','Ajustes de presupuesto','Costos Comprometidos'], kpis: ['Margen a Término','Variación vs Presupuesto','Costo comprometido / P.Obra','Proyección de resultado final'] },
  { name: 'Planificación', color: '#7C3AED', icon: '📅', status: 'PRODUCCIÓN', desc: 'Seguimiento de avance y plazos', datos: ['Tareas por proceso y recinto','Avance Planeado por tarea','Avance Real registrado','Fechas inicio / término'], kpis: ['SPI (Schedule Performance Index)','Atrasos por proceso / empresa','Curva S — Planificado vs Real','Tareas críticas en riesgo'] },
  { name: 'Calidad', color: '#16A34A', icon: '✅', status: 'PRODUCCIÓN', desc: 'Gestión de no conformidades', datos: ['Observaciones por recinto','Observaciones por proceso','Observaciones por empresa SC','Inspecciones por elemento'], kpis: ['Tasa de cierre (RDI)','Observaciones abiertas / cerradas','Ranking de incumplimiento por SC','Protocolos aprobados vs pendientes'] },
]

const CORE = [
  { label: 'Proyecto', icon: '🏗️', desc: 'Todo está asociado a un proyecto activo' },
  { label: 'Procesos', icon: '⚙️', desc: 'Categoría → Subcategoría → Proceso (ADN de la obra)' },
  { label: 'Empresas', icon: '🏢', desc: 'Constructora, subcontratos y proveedores' },
  { label: 'Recintos', icon: '📍', desc: 'Sectores y recintos de la obra' },
]

export default function SlideAppsProduccion() {
  const { week } = useAppStore()
  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 bg-cobalt">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-7 rounded-sm bg-gold flex-shrink-0" />
          <div>
            <h2 className="font-condensed font-extrabold text-white uppercase tracking-wider text-xl leading-tight">Aplicaciones CCD — En Producción</h2>
            <div className="text-white/50 text-[10px] tracking-wide">3 apps activas · Ejes transversales compartidos</div>
          </div>
        </div>
        <span className="text-white/40 text-[10px] tracking-widest uppercase">{week}</span>
      </div>
      <div className="flex gap-3 p-3 flex-1 min-h-0">
        <div className="flex flex-col gap-2.5 w-[68%]">
          <div className="grid grid-cols-3 gap-2.5 flex-1">
            {APPS.map((app, i) => (
              <motion.div key={app.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.35 }}
                className="bg-white rounded border border-slate-200 overflow-hidden flex flex-col" style={{ boxShadow: '0 2px 10px rgba(0,0,0,.07)' }}>
                <div className="h-1 flex-shrink-0" style={{ background: app.color }} />
                <div className="px-3 py-2 flex-shrink-0" style={{ background: `${app.color}0e` }}>
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{app.icon}</span>
                      <span className="font-condensed font-extrabold text-[15px] uppercase tracking-wide" style={{ color: app.color }}>{app.name}</span>
                    </div>
                    <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide" style={{ background: '#DCFCE7', color: '#16A34A' }}>{app.status}</span>
                  </div>
                  <div className="text-[9px] text-slate-500">{app.desc}</div>
                </div>
                <div className="flex flex-col flex-1 px-3 py-2 gap-2.5">
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
        <div className="flex flex-col gap-2.5 flex-1">
          <div className="font-condensed font-extrabold text-cobalt text-sm uppercase tracking-wider">Ejes Transversales</div>
          <div className="flex flex-col gap-2 flex-1">
            {CORE.map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08 }}
                className="bg-white rounded border border-cobalt/20 p-3 flex items-start gap-3 flex-1" style={{ boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
                <span className="text-xl flex-shrink-0">{c.icon}</span>
                <div>
                  <div className="font-condensed font-extrabold text-cobalt text-[14px] uppercase tracking-wide">{c.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">{c.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
