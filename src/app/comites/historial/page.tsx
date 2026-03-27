'use client'
import { useState, useEffect, useRef } from 'react'
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

async function downloadMinutaPDF(el: HTMLDivElement, areaName: string, fecha: string) {
  const html2canvas = (await import('html2canvas')).default
  const { jsPDF } = await import('jspdf')

  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()

  // Header
  pdf.setFillColor(15, 23, 42)
  pdf.rect(0, 0, pageW, 14, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(10)
  pdf.text(`MK Ingeniería — Minuta ${areaName}`, 8, 10)
  pdf.setTextColor(225, 186, 16)
  pdf.setFontSize(8)
  pdf.text(fecha, pageW - 8, 10, { align: 'right' })

  // Content
  const imgW = pageW - 16
  const imgH = (canvas.height / canvas.width) * imgW
  const maxH = pageH - 22
  const finalH = Math.min(imgH, maxH)
  const finalW = imgH > maxH ? (maxH / imgH) * imgW : imgW
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 8, 16, finalW, finalH)

  // Footer
  pdf.setFontSize(6)
  pdf.setTextColor(148, 163, 184)
  pdf.text('Generado por Portal de Comités — Construye con Datos', 8, pageH - 3)

  pdf.save(`minuta-${areaName.toLowerCase().replace(/\s/g, '-')}-${fecha}.pdf`)
}

export default function HistorialPage() {
  const supabase = createClient()
  const [minutas, setMinutas] = useState<MinutaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterArea, setFilterArea] = useState<string>('todas')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)
  const minutaRefs = useRef<Record<string, HTMLDivElement | null>>({})

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

  async function handleDownload(m: MinutaRow) {
    // Expand first so content renders
    setExpanded(m.id)
    setExporting(m.id)
    await new Promise(r => setTimeout(r, 200))
    const el = minutaRefs.current[m.id]
    if (el) {
      const areaName = AREA_NAMES[m.area_id] || m.area_id
      await downloadMinutaPDF(el, areaName, fmtFecha(m.fecha))
    }
    setExporting(null)
  }

  return (
    <>
      <div className="mb-5">
        <h1 className="font-condensed text-[28px] font-extrabold">
          Historial de <span className="text-cobalt">Minutas</span>
        </h1>
        <p className="text-xs text-slate">Registro de todas las sesiones de comité — ver y descargar como PDF</p>
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
            const areaName = AREA_NAMES[m.area_id] || m.area_id
            const lineCount = m.texto_completo ? m.texto_completo.split('\n').filter(l => l.trim()).length : 0
            return (
              <div key={m.id} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden hover:shadow-md transition-shadow">
                {/* Header row */}
                <div className="flex items-center gap-3 p-4">
                  <button onClick={() => setExpanded(isExpanded ? null : m.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{areaName}</span>
                        <span className="text-[10px] text-slate">{fmtFecha(m.fecha)}</span>
                        {lineCount > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-slate">{lineCount} líneas</span>}
                        {m.enviada && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-50 text-success">Enviada</span>}
                      </div>
                      {m.texto_completo && <p className="text-[11px] text-slate truncate mt-0.5">{m.texto_completo.slice(0, 120)}</p>}
                    </div>
                    <span className="text-slate text-sm shrink-0">{isExpanded ? '▲' : '▼'}</span>
                  </button>
                  {/* Download button — always visible */}
                  <button
                    onClick={() => handleDownload(m)}
                    disabled={exporting === m.id}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-[#E2E8F0] hover:border-cobalt hover:text-cobalt transition-all shrink-0 disabled:opacity-50"
                  >
                    {exporting === m.id ? 'Generando...' : 'PDF ↓'}
                  </button>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div ref={el => { minutaRefs.current[m.id] = el }} className="px-5 pb-5 border-t border-[#F1F5F9]">
                    {/* Minuta header for PDF capture */}
                    <div className="flex items-center gap-2 mt-3 mb-3">
                      <div className="w-1 h-5 rounded" style={{ background: color }} />
                      <div>
                        <p className="font-condensed text-lg font-bold">Minuta — {areaName}</p>
                        <p className="text-[10px] text-slate">{fmtFecha(m.fecha)} · MK Ingeniería</p>
                      </div>
                    </div>

                    {m.texto_completo ? (
                      <div className="bg-[#F8FAFC] rounded-lg p-4 mb-3">
                        {m.texto_completo.split('\n').filter(l => l.trim()).map((line, i) => {
                          const isKPI = line.startsWith('[KPI]')
                          const isTarea = line.startsWith('[Tarea]')
                          const clean = line.replace(/^\[(KPI|Tarea)\]\s*/, '')
                          return (
                            <div key={i} className="flex items-start gap-2 py-1 border-b border-white last:border-0">
                              {(isKPI || isTarea) && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${isKPI ? 'bg-cobalt-light text-cobalt' : 'bg-green-50 text-success'}`}>
                                  {isKPI ? 'KPI' : 'Tarea'}
                                </span>
                              )}
                              <span className="text-xs text-ink leading-relaxed">{clean || line}</span>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate italic mb-3">Sin contenido de texto.</p>
                    )}

                    {m.lineas && Array.isArray(m.lineas) && m.lineas.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate mb-1.5">Detalle de sesión ({m.lineas.length} áreas)</p>
                        <div className="bg-white rounded-lg border border-[#E2E8F0] divide-y divide-[#F1F5F9]">
                          {m.lineas.map((l: unknown, i: number) => {
                            const line = l as Record<string, unknown>
                            const areaKey = String(line.area || '')
                            const comentario = String(line.comentario || '')
                            const acuerdos = Number(line.acuerdos_nuevos ?? -1)
                            const tag = String(line.tag || '')
                            const text = String(line.text || '')
                            return (
                              <div key={i} className="flex items-center gap-2 px-3 py-2">
                                {tag && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${tag === 'KPI' ? 'bg-cobalt-light text-cobalt' : 'bg-green-50 text-success'}`}>{tag}</span>}
                                {areaKey && <span className="text-[10px] font-bold" style={{ color: AREA_COLORS[areaKey] || '#64748B' }}>{AREA_NAMES[areaKey] || areaKey}</span>}
                                <span className="text-xs text-ink flex-1">{text || comentario}</span>
                                {acuerdos >= 0 && <span className="text-[10px] font-bold text-gold">{acuerdos} acuerdos</span>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-slate">Creada: {new Date(m.created_at).toLocaleString('es-CL')}</p>
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
