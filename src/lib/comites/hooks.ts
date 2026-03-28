'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Perfil, KPI, Tarea, AreaId } from '@/lib/types'

const supabase = createClient()

export function useAuth() {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase.from('perfiles').select('*').eq('id', user.id).single()
      setPerfil(data as Perfil | null)
      setLoading(false)
    }
    load()
  }, [])

  const canEdit = (areaId: string) => {
    if (!perfil) return false
    if (perfil.area_id === 'admin') return true
    return perfil.area_id === areaId
  }

  const isAdmin = perfil?.area_id === 'admin'

  return { perfil, loading, canEdit, isAdmin, supabase }
}

export function useAreaData(areaId: AreaId | null) {
  const [kpis, setKpis] = useState<KPI[]>([])
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)

  async function refresh() {
    if (!areaId) return
    setLoading(true)
    const [kRes, tRes, tCrossRes] = await Promise.all([
      supabase.from('kpis').select('*').eq('area_id', areaId).order('orden'),
      supabase.from('tareas').select('*').eq('area_id', areaId).order('created_at'),
      // Cross-area: tareas de otras áreas (ej: ETI) que tienen area_destino = esta área
      supabase.from('tareas').select('*').eq('area_destino', areaId).neq('area_id', areaId).order('created_at'),
    ])
    setKpis(kRes.data as KPI[] || [])
    // Merge propias + cross-area (sin duplicados)
    const propias = (tRes.data || []) as Tarea[]
    const cross = (tCrossRes.data || []) as Tarea[]
    const ids = new Set(propias.map(t => t.id))
    const merged = [...propias, ...cross.filter(t => !ids.has(t.id))]
    setTareas(merged)
    setLoading(false)
  }

  useEffect(() => { refresh() }, [areaId])

  return { kpis, tareas, loading, refresh, setKpis, setTareas, supabase }
}
