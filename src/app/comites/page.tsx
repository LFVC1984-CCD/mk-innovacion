'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
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

// ── Skeleton card ──
function SkeletonCard() {
  return (
    <div className="bg-white rounded-[14px] border border-[#E2E8F0] overflow-hidden">
      <div className="h-1.5 skeleton" />
      <div className="p-4 space-y-2.5">
        <div className="h-5 w-3/4 skeleton" />
        <div className="h-3 w-1/3 skeleton" />
        <div className="flex gap-1.5 mt-2">
          <div className="h-5 w-16 skeleton rounded-md" />
          <div className="h-5 w-14 skeleton rounded-md" />
        </div>
        <div className="flex gap-1.5 mt-2">
          <div className="h-7 w-16 skeleton rounded-lg" />
          <div className="h-7 w-24 skeleton rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export default function ComitesHomePage() {
  const { loading, canEdit } = useAuth()
  const [summaries, setSummaries] = useState<Record<string, AreaSummary>>({})
  const [dataLoading, setDataLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function loadSummaries() {
      const [kRes, tRes] = await Promise.all([
        supabase.from('kpis').select('area_id,status'),
        supabase.from('tareas').select('area_id,area_destino,estado,fecha_compromiso'),
      ])

      const sums: Record<string, AreaSummary> = {}
      AREAS_LIST.forEach(a => {
        const kpis = (kRes.data || []).filter((k: { area_id: string }) => k.area_id === a.id)
        const allTareas = (tRes.data || []) as { area_id: string; area_destino: string | null; estado: string; fecha_compromiso: string | null }[]
        const tareas = allTareas.filter(t => t.area_id === a.id || t.area_destino === a.id)
        sums[a.id] = {
          kpiCount: kpis.length,
          badCount: kpis.filter((k: { status: string }) => k.status === 'rojo').length,
          warnCount: kpis.filter((k: { status: string }) => k.status === 'amarillo').length,
          activeCount: tareas.filter(t => t.estado === 'en-proceso').length,
          noDateCount: tareas.filter(t => t.estado !== 'completada' && !t.fecha_compromiso).length,
        }
      })
      setSummaries(sums)
      setDataLoading(false)
    }
    if (!loading) loadSummaries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-cobalt border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate font-semibold">Cargando portal...</p>
        </div>
      </div>
    )
  }

  const now = new Date()
  const today = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`
  const weekNum = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))

  // Count totals for hero
  const totalKPIs = Object.values(summaries).reduce((s, v) => s + v.kpiCount, 0)
  const totalBad = Object.values(summaries).reduce((s, v) => s + v.badCount, 0)
  const totalActive = Object.values(summaries).reduce((s, v) => s + v.activeCount, 0)

  return (
    <>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-end justify-between mb-4"
      >
        <div>
          <h1 className="font-condensed text-[28px] font-extrabold">
            Comités <span className="text-cobalt">MK Ingeniería</span>
          </h1>
          <p className="text-xs text-slate capitalize">{today} · Semana {weekNum}</p>
        </div>
      </motion.div>

      {/* Comité Ampliado Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="hero-gradient rounded-2xl p-5 flex items-center justify-between mb-5 border border-white/10 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden group"
        onClick={() => router.push('/comites/ampliado')}
      >
        {/* Decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-cobalt/20 via-transparent to-gold/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="flex items-center gap-4 relative">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E8000D] to-[#B8000A] flex items-center justify-center font-condensed font-black text-white text-sm leading-none select-none shadow-lg shadow-red-900/30 group-hover:scale-105 transition-transform">
            MK
          </div>
          <div>
            <h2 className="font-condensed text-xl font-extrabold text-white">Comité Ampliado</h2>
            <p className="text-[11px] text-white/50 mt-0.5">
              {totalKPIs} indicadores · {totalBad > 0 ? `${totalBad} críticos · ` : ''}{totalActive} tareas en proceso
            </p>
          </div>
        </div>
        <div className="flex gap-2 relative">
          <button onClick={(e) => { e.stopPropagation(); router.push('/comites/historial') }}
            className="px-4 py-2 rounded-lg border border-white/20 text-white/70 text-xs font-semibold hover:bg-white/10 hover:text-white transition-all btn-scale">
            Historial
          </button>
          <button className="bg-gold text-[#0F172A] px-5 py-2 rounded-lg text-xs font-bold whitespace-nowrap hover:bg-gold-dark transition-all btn-scale shadow-lg shadow-gold/20">
            Iniciar sesión →
          </button>
        </div>
      </motion.div>

      {/* Areas */}
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate mb-2.5">Áreas del Comité</p>

      {dataLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
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
      )}
    </>
  )
}
