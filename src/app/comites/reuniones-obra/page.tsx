import ReunionesObraPanel from '@/components/comites/areas/ReunionesObraPanel'

export default function ReunionesObraPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="font-condensed font-bold text-2xl text-ink">Reuniones Obra–Gerencia</h1>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cobalt-light text-cobalt">Ejecutivo</span>
      </div>
      <ReunionesObraPanel />
    </div>
  )
}
