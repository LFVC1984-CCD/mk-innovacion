'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/comites/hooks'
import { createClient } from '@/lib/supabase/client'
import TopBar from '@/components/ui/TopBar'
import ToastContainer from '@/components/ui/Toast'
import { AREAS_LIST } from '@/lib/types'

interface AreaSummary {
  kpiCount: number
  badCount: number
  warnCount: number
  urgentCount: number
  activeCount: number
  noDateCount: number
}

export default function ComitesHomePage() {
  const { perfil, loading, canEdit } = useAuth()
  const [summaries, setSummaries] = useState<Record<string, AreaSummary>>({})
  const supabase = createClient()

  useEffect(() => {
    async function loadSummaries() {
      const [kRes, tRes, dRes] = await Promise.all([
        supabase.from('kpis').select('area_id,status'),
        supabase.from('tareas').select('area_id,estado,fecha_compromiso'),
        supabase.from('decisiones').select('area_id,urgencia,resuelta'),
      ])

      const sums: Record<string, AreaSummary> = {}
      AREAS_LIST.forEach(a => {
        const kpis = (kRes.data || []).filter((k: { area_id: string }) => k.area_id === a.id)
        const tareas = (tRes.data || []).filter((t: { area_id: string }) => t.area_id === a.id)
        const decs = (dRes.data || []).filter((d: { area_id: string }) => d.area_id === a.id)
        sums[a.id] = {
          kpiCount: kpis.length,
          badCount: kpis.filter((k: { status: string }) => k.status === 'bad').length,
          warnCount: kpis.filter((k: { status: string }) => k.status === 'warn').length,
          urgentCount: decs.filter((d: { urgencia: string; resuelta: boolean }) => d.urgencia === 'urgente' && !d.resuelta).length,
          activeCount: tareas.filter((t: { estado: string }) => t.estado === 'en-proceso').length,
          noDateCount: tareas.filter((t: { estado: string; fecha_compromiso: string | null }) => t.estado !== 'completada' && !t.fecha_compromiso).length,
        }
      })
      setSummaries(sums)
    }
    if (!loading) loadSummaries()
  }, [loading])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando...</div>

  const today = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar perfil={perfil} />
      <ToastContainer />

      <div className="max-w-[1060px] mx-auto px-5 py-5">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h1 className="font-condensed font-black text-2xl text-ink">
              Comités <span className="text-cobalt">MK Ingeniería</span>
            </h1>
            <p className="text-xs text-slate-500">{today}</p>
          </div>
        </div>

        <div className="bg-cobalt rounded-lg p-4 flex items-center justify-between mb-5" style={{ borderLeft: '4px solid #E1BA10' }}>
          <div>
            <div className="text-white font-semibold text-sm">Comité Ampliado — Todas las áreas</div>
            <div className="text-white/50 text-xs mt-0.5">Vista ejecutiva · 3 momentos · 20 min</div>
          </div>
        </div>

        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Áreas</div>

        <div className="grid grid-cols-3 gap-3">
          {AREAS_LIST.map(area => {
            const s = summaries[area.id]
            return (
              <div key={area.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="h-1" style={{ background: area.color }} />
                <div className="p-3.5">
                  <div className="font-semibold text-ink text-sm mb-0.5">{area.name}</div>
                  <div className="text-xs text-slate-500 mb-2.5">{area.freq}</div>

                  <div className="flex gap-1 flex-wrap mb-2.5">
                    {s && (
                      <>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-cobalt-light text-cobalt">{s.kpiCount} KPIs</span>
                        {s.badCount > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-600">{s.badCount} crítico{s.badCount > 1 ? 's' : ''}</span>}
                        {s.warnCount > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber">{s.warnCount} alerta{s.warnCount > 1 ? 's' : ''}</span>}
                        {s.urgentCount > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-600">{s.urgentCount} urgente{s.urgentCount > 1 ? 's' : ''}</span>}
                        {s.activeCount > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-600">{s.activeCount} activa{s.activeCount > 1 ? 's' : ''}</span>}
                        {s.noDateCount > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber">{s.noDateCount} sin fecha</span>}
                      </>
                    )}
                  </div>

                  <div className="flex gap-1.5">
                    {canEdit(area.id) ? (
                      <Link href={`/comites/${area.id}`} className="px-3 py-1.5 rounded text-xs font-semibold bg-cobalt text-white hover:bg-cobalt-dark transition-colors">
                        Editar
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400 italic py-1.5">Solo lectura</span>
                    )}
                    <Link href={`/comites/${area.id}/proyectar`} className="px-3 py-1.5 rounded text-xs font-semibold border border-slate-200 text-slate-600 hover:border-cobalt hover:text-cobalt transition-all">
                      Proyectar →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
