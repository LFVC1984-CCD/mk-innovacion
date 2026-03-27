'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/comites/hooks'
import { createClient } from '@/lib/supabase/client'
import { AREAS_LIST } from '@/lib/types'
import type { AreaDef } from '@/lib/comites/data'
import AreaCard from '@/components/comites/AreaCard'

interface AreaSummary {
  kpiCount: number
  badCount: number
  warnCount: number
  activeCount: number
  noDateCount: number
}

export default function ComitesHomePage() {
  const { loading, canEdit } = useAuth()
  const [summaries, setSummaries] = useState<Record<string, AreaSummary>>({})
  const supabase = createClient()

  useEffect(() => {
    async function loadSummaries() {
      const [kRes, tRes] = await Promise.all([
        supabase.from('kpis').select('area_id,status'),
        supabase.from('tareas').select('area_id,area_destino,estado,fecha_compromiso'),
      ])

      const sums: Record<string, AreaSummary> = {}
      AREAS_LIST.forEach(a => {
        const kpis = (kRes.data || []).filter((k: { area_id: string }) => k.area_id === a.id)
        // Tareas propias + tareas de otras áreas con area_destino = esta área
        const allTareas = (tRes.data || []) as { area_id: string; area_destino: string | null; estado: string; fecha_compromiso: string | null }[]
        const tareas = allTareas.filter(t => t.area_id === a.id || t.area_destino === a.id)
        sums[a.id] = {
          kpiCount: kpis.length,
          badCount: kpis.filter((k: { status: string }) => k.status === 'bad').length,
          warnCount: kpis.filter((k: { status: string }) => k.status === 'warn').length,
          activeCount: tareas.filter(t => t.estado === 'en-proceso').length,
          noDateCount: tareas.filter(t => t.estado !== 'completada' && !t.fecha_compromiso).length,
        }
      })
      setSummaries(sums)
    }
    if (!loading) loadSummaries()
  }, [loading])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando...</div>

  const now = new Date()
  const today = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`
  const weekNum = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="font-condensed text-[28px] font-extrabold">
            Comités <span className="text-cobalt">MK Ingeniería</span>
          </h1>
          <p className="text-xs text-slate capitalize">{today} · Semana {weekNum}</p>
        </div>
      </div>

      {/* Comité Ampliado Hero */}
      <div className="bg-white rounded-[14px] p-5 flex items-center justify-between mb-5 border border-[#E2E8F0] hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#0F172A] flex items-center justify-center font-condensed font-black text-gold text-sm leading-none select-none shrink-0">
            MK
          </div>
          <div>
            <h2 className="font-condensed text-xl font-extrabold text-ink">Comité Ampliado</h2>
            <p className="text-[11px] text-slate mt-0.5">Sesión ejecutiva — revisa todas las áreas, genera acuerdos y exporta el acta</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold hover:bg-[#F1F5F9] transition-colors">
            Historial actas
          </button>
          <button className="bg-gold text-[#0F172A] px-5 py-2 rounded-lg text-xs font-bold whitespace-nowrap hover:bg-gold-dark transition-colors">
            Iniciar sesión →
          </button>
        </div>
      </div>

      {/* Areas */}
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate mb-2.5">Áreas</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {AREAS_LIST.map((area, i) => {
          const s = summaries[area.id]
          return (
            <AreaCard
              key={area.id}
              area={{
                id: area.id as AreaDef['id'],
                name: area.name,
                color: area.color,
                freq: area.freq,
                kpis: s?.kpiCount ?? 0,
                bad: s?.badCount ?? 0,
                warn: s?.warnCount ?? 0,
                activas: s?.activeCount ?? 0,
                sinFecha: s?.noDateCount ?? 0,
                spark: [],
                updated: '',
              }}
              index={i}
              editHref={canEdit(area.id) ? `/comites/${area.id}` : undefined}
              presentHref={`/comites/${area.id}/proyectar`}
            />
          )
        })}
      </div>
    </>
  )
}
