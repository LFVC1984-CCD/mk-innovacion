'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtFecha } from '@/lib/comites/data'
import { AREA_NAMES, AREA_COLORS } from '@/lib/types'

interface MinutaRow {
  id: string
  area_id: string
  fecha: string
  texto_completo: string | null
  enviada: boolean
  created_at: string
  lineas: unknown[] | null
}

export default function HistorialPage() {
  const supabase = createClient()
  const [minutas, setMinutas] = useState<MinutaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterArea, setFilterArea] = useState<string>('todas')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('minutas').select('id, area_id, fecha, texto_completo, enviada, created_at, lineas').order('created_at', { ascending: false })
      setMinutas((data || []) as MinutaRow[])
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = filterArea === 'todas' ? minutas : minutas.filter(m => m.area_id === filterArea)
  const areas = Array.from(new Set(minutas.map(m => m.area_id)))

  return (
    <>
      <div className="mb-5">
        <h1 className="font-condensed text-[28px] font-extrabold">
          Historial de <span className="text-cobalt">Minutas</span>
        </h1>
        <p className="text-xs text-slate">Registro de todas las sesiones de comité realizadas</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-1 flex-wrap mb-5">
        <button
          onClick={() => setFilterArea('todas')}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
            filterArea === 'todas' ? 'bg-cobalt border-cobalt text-white' : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
          }`}>
          Todas <span className="text-[9px] font-extrabold opacity-70">{minutas.length}</span>
        </button>
        {areas.map(a => (
          <button key={a} onClick={() => setFilterArea(a)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
              filterArea === a ? 'bg-cobalt border-cobalt text-white' : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
            }`}>
            {AREA_NAMES[a] || a} <span className="text-[9px] font-extrabold opacity-70">{minutas.filter(m => m.area_id === a).length}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-cobalt border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate text-sm">
          Sin minutas registradas{filterArea !== 'todas' ? ` para ${AREA_NAMES[filterArea] || filterArea}` : ''}.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(m => {
            const isExpanded = expanded === m.id
            const color = AREA_COLORS[m.area_id] || '#64748B'
            return (
              <div key={m.id} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <button
                  onClick={() => setExpanded(isExpanded ? null : m.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-[#F8FAFC] transition-colors text-left"
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{AREA_NAMES[m.area_id] || m.area_id}</span>
                      <span className="text-[10px] text-slate">{fmtFecha(m.fecha)}</span>
                      {m.enviada && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-50 text-green-700">Enviada</span>}
                    </div>
                    {m.texto_completo && (
                      <p className="text-[11px] text-slate truncate mt-0.5">{m.texto_completo.slice(0, 120)}</p>
                    )}
                  </div>
                  <span className="text-slate text-sm">{isExpanded ? '▲' : '▼'}</span>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-4 border-t border-[#F1F5F9]">
                    {m.texto_completo ? (
                      <pre className="text-xs text-ink whitespace-pre-wrap mt-3 leading-relaxed font-sans">{m.texto_completo}</pre>
                    ) : (
                      <p className="text-xs text-slate mt-3 italic">Sin contenido de texto.</p>
                    )}
                    {m.lineas && Array.isArray(m.lineas) && m.lineas.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate mb-1">Detalle ({m.lineas.length} líneas)</p>
                        <div className="bg-[#F8FAFC] rounded-lg p-3 text-[11px] space-y-1">
                          {m.lineas.map((l: unknown, i: number) => {
                            const line = l as Record<string, unknown>
                            const areaKey = String(line.area || '')
                            const comentario = String(line.comentario || '')
                            const acuerdos = Number(line.acuerdos_nuevos ?? -1)
                            return (
                              <div key={i} className="flex gap-2">
                                {areaKey && <span className="font-bold" style={{ color: AREA_COLORS[areaKey] || '#64748B' }}>{AREA_NAMES[areaKey] || areaKey}</span>}
                                {comentario && <span className="text-slate">{comentario}</span>}
                                {acuerdos >= 0 && <span className="text-gold font-bold">{acuerdos} acuerdos</span>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-slate mt-3">Creada: {new Date(m.created_at).toLocaleString('es-CL')}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
