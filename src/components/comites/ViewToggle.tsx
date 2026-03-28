'use client'

export type ViewMode = 'cards' | 'tabla' | 'grafico'

const LABELS: Record<ViewMode, string> = {
  cards: 'Cards',
  tabla: 'Tabla',
  grafico: 'Gráfico',
}

interface Props {
  view: ViewMode
  onChange: (v: ViewMode) => void
  options?: ViewMode[]
}

export default function ViewToggle({ view, onChange, options = ['cards', 'tabla'] }: Props) {
  return (
    <div className="flex gap-0.5 bg-[#F1F5F9] rounded-lg p-0.5 border border-[#E2E8F0]">
      {options.map(v => (
        <button key={v} onClick={() => onChange(v)}
          className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
            view === v ? 'bg-white text-ink shadow-sm' : 'text-slate hover:text-ink'
          }`}>
          {LABELS[v]}
        </button>
      ))}
    </div>
  )
}
