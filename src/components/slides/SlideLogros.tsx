'use client'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'

const LOGROS = [
  { area: 'Diagnóstico y Levantamiento', color: '#0B5ED7', icon: '🔍', items: ['Entrevistas a departamentos de Contabilidad y Tesorería','Entrevista y levantamiento de procesos en Recursos Humanos','Entrevista y levantamiento área Legal','Inventario completo de herramientas actuales por área'] },
  { area: 'Comités y Coordinación', color: '#7C3AED', icon: '🤝', items: ['Reunión inicial Comité Ampliado (todas las gerencias)','Comité Legal — revisión de procesos y contratos tipo','Comité RRHH — diagnóstico Talana y flujos de firmas','Comité Prevención de Riesgos — evaluación digitalización'] },
  { area: 'Prototipos y Desarrollo', color: '#16A34A', icon: '⚡', items: ['Prototipo DocSC al 90% — gestión documental subcontratos','Prototipo App Enrolamiento de Trabajadores — listo y desplegado','Portal de Documentos en pruebas internas (SII + Defontana + iConstruye)'] },
  { area: 'Obras e Implementación', color: '#D97706', icon: '🏗️', items: ['Visitas a terreno PET CT Clínica Alemana y Corona MAM','Implementación app Planificación CCD en PET CT','Levantamiento de necesidades digitales en ambas obras','Control de gestión financiero activo en obras activas'] },
]

export default function SlideLogros() {
  const { week } = useAppStore()
  const totalHitos = LOGROS.reduce((s, g) => s + g.items.length, 0)
  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 bg-cobalt">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-7 rounded-sm bg-gold flex-shrink-0" />
          <div>
            <h2 className="font-condensed font-extrabold text-white uppercase tracking-wider text-xl leading-tight">Logros del Período</h2>
            <div className="text-white/50 text-[10px] tracking-widest uppercase">Febrero — Marzo 2026</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-gold/20 border border-gold/40 text-gold text-[11px] font-bold px-3 py-1 rounded tracking-wide">{totalHitos} hitos completados</div>
          <span className="text-white/40 text-[10px] tracking-widest uppercase">{week}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 grid-rows-2 gap-2.5 p-2.5 flex-1">
        {LOGROS.map((grupo, gi) => (
          <motion.div key={grupo.area} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.08, duration: 0.35 }}
            className="bg-white rounded border border-slate-200 overflow-hidden flex flex-col" style={{ boxShadow: '0 2px 8px rgba(0,0,0,.07)' }}>
            <div className="h-1 flex-shrink-0" style={{ background: grupo.color }} />
            <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ background: `${grupo.color}10` }}>
              <span className="text-base">{grupo.icon}</span>
              <div className="font-condensed font-extrabold text-[21px] uppercase tracking-widest" style={{ color: grupo.color }}>{grupo.area}</div>
              <div className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white" style={{ background: grupo.color }}>{grupo.items.length}</div>
            </div>
            <div className="px-3 pb-2 pt-1.5 flex-1 flex flex-col gap-1.5">
              {grupo.items.map((item, ii) => (
                <motion.div key={ii} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: gi * 0.08 + ii * 0.04 + 0.15 }} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ background: `${grupo.color}20`, border: `1.5px solid ${grupo.color}` }}>
                    <span className="text-[10px] font-black" style={{ color: grupo.color }}>✓</span>
                  </div>
                  <span className="text-[18px] text-ink leading-snug">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
