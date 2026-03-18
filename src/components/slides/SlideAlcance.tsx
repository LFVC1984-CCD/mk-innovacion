'use client'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'

const ITEMS = [
  { label: 'Mapeo de Procesos y Cargos', desc: 'Levantamiento de funciones, tareas y flujos en todos los departamentos.', color: '#0B5ED7' },
  { label: 'Digitalización y Eficiencia', desc: 'Diagnóstico de herramientas actuales y desarrollo de plataformas de reemplazo.', color: '#E1BA10' },
  { label: 'Automatización e IA', desc: 'Diseño e implementación de agentes IA para optimizar procesos internos y de obra.', color: '#16A34A' },
  { label: 'Gerenciamiento de Proyectos', desc: 'Gestión de proyectos de innovación multidepartamento. Roadmap y prioridades.', color: '#64748B' },
  { label: 'Control de Gestión', desc: 'Control financiero, productividad, margen y flujo por departamento y obra activa.', color: '#DC2626' },
  { label: 'Comités y Coordinación', desc: 'Participación en comités internos con gerencias. Minutas y seguimiento.', color: '#0B5ED7' },
]

export default function SlideAlcance() {
  const { week } = useAppStore()
  return (
    <div className="flex flex-col h-full" style={{ background: '#F8FAFC' }}>
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 bg-cobalt">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-7 rounded-sm bg-gold" />
          <h2 className="font-condensed font-extrabold text-white uppercase tracking-wider text-xl">Alcance del Rol</h2>
        </div>
        <span className="text-white/40 text-[10px] tracking-widest uppercase">{week}</span>
      </div>
      <div className="grid grid-cols-3 grid-rows-2 gap-2.5 p-2.5 flex-1">
        {ITEMS.map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.3 }}
            className="bg-white rounded-sm border border-slate-200 p-3 relative overflow-hidden" style={{ boxShadow: '0 2px 6px rgba(0,0,0,.06)' }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: item.color }} />
            <div className="font-condensed font-extrabold text-[23px] uppercase tracking-wide mt-1" style={{ color: item.color }}>{item.label}</div>
            <p className="text-[18px] text-slate-500 mt-1.5 leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>
      <div className="pb-2 text-center text-[9px] text-slate-400 tracking-widest uppercase">6 Departamentos · Obras Activas · Equipo: Luis Macri + Rafael Castillo</div>
    </div>
  )
}
