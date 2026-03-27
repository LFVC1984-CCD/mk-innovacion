'use client'

export default function AmpliadoPage() {
  return (
    <div>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="font-condensed text-[26px] font-extrabold">
            Comité <span className="text-cobalt">Ampliado</span>
          </h1>
          <p className="text-xs text-slate">Sesión ejecutiva — revisa todas las áreas, genera acuerdos y exporta el acta</p>
        </div>
        <div className="flex gap-2">
          <button className="border border-slate-200 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors">
            Exportar PDF
          </button>
          <button className="bg-gold text-[#1A1200] px-4 py-2 rounded-lg text-xs font-bold hover:bg-gold-dark transition-colors">
            Cerrar sesión y guardar
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
        En construcción — migración desde portal HTML
      </div>
    </div>
  )
}
