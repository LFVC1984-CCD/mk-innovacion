'use client'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Area } from '@/lib/presentacion/data'

interface CardDef {
  label: string; color: string; items: string[]; isPlan?: boolean; isPend?: boolean
}

const CARD_COLORS = (area: Area): CardDef[] => [
  { label: 'TAREAS', color: area.color, items: area.tareas },
  { label: 'HERRAMIENTAS ACTUALES', color: '#64748B', items: area.herramientas },
  { label: 'PLAN DE EFICIENCIA', color: '#16A34A', items: area.plan, isPlan: true },
  { label: 'DEFINICIONES PENDIENTES', color: '#DC2626', items: area.pendientes, isPend: true },
]

function hex2rgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.3 } }),
}

export default function SlideArea({ area }: { area: Area }) {
  const { week, tasks, toggleTask } = useAppStore()
  const cards = CARD_COLORS(area)
  return (
    <div className="flex flex-col h-full" style={{ background: '#F8FAFC' }}>
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ background: '#0B5ED7' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-7 rounded-sm bg-gold flex-shrink-0" />
          <h2 className="font-condensed font-extrabold text-white uppercase tracking-wider text-xl">{area.name}</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-white/10 rounded flex items-center justify-center">
            <span className="font-condensed font-black text-white text-xs">MK</span>
          </div>
          <span className="text-white/40 text-[10px] tracking-widest uppercase">{week}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 grid-rows-2 gap-2.5 p-2.5 flex-1 min-h-0">
        {cards.map((card, ci) => (
          <motion.div key={card.label} custom={ci} variants={cardVariants} initial="hidden" animate="show"
            className="bg-white rounded-sm border border-slate-200 overflow-hidden flex flex-col" style={{ boxShadow: '0 2px 8px rgba(0,0,0,.07)' }}>
            <div className="h-1.5 flex-shrink-0" style={{ background: card.color }} />
            <div className="px-3 py-2 font-condensed font-extrabold text-[19px] uppercase tracking-widest flex-shrink-0"
              style={{ color: card.color, background: `rgba(${hex2rgb(card.color)},.07)` }}>{card.label}</div>
            <div className="px-3 pb-2.5 flex-1 overflow-hidden flex flex-col justify-between">
              <ul className="mt-2 space-y-1.5">
                {card.items.map((item, ii) => {
                  const key = `${area.id}_${ii}`
                  const isDone = card.isPend && (tasks[key] ?? area.pendientesStatus[ii]) === 'listo'
                  if (card.isPend) {
                    return (
                      <li key={ii} className={`flex items-start gap-2 cursor-pointer group ${isDone ? 'opacity-40' : ''}`} onClick={() => toggleTask(key)}>
                        <div className="w-4 h-4 rounded-sm border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all"
                          style={{ borderColor: card.color, background: isDone ? card.color : 'transparent' }}>
                          {isDone && <span className="text-white text-[9px] font-black">✓</span>}
                        </div>
                        <span className={`text-[18px] text-ink leading-snug ${isDone ? 'line-through' : ''}`}>{item}</span>
                      </li>
                    )
                  }
                  return (
                    <li key={ii} className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: card.color }} />
                      <span className="text-[18px] text-ink leading-snug">{item}</span>
                    </li>
                  )
                })}
              </ul>
              {card.isPlan && area.planLink && (
                <a href={area.planLink.url} target="_blank" rel="noopener noreferrer" className="btn-gold mt-2 self-start">{area.planLink.text}</a>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
