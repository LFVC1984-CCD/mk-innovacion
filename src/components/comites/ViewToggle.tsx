'use client'

type ViewMode = 'cards' | 'tabla'

export default function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex gap-0.5 bg-[#F1F5F9] rounded-lg p-0.5 border border-[#E2E8F0]">
      {(['cards', 'tabla'] as const).map(v => (
        <button key={v} onClick={() => onChange(v)}
          className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
            view === v ? 'bg-white text-ink shadow-sm' : 'text-slate hover:text-ink'
          }`}>
          {v === 'cards' ? 'Cards' : 'Tabla'}
        </button>
      ))}
    </div>
  )
}
