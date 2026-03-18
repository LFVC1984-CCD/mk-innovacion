'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Perfil, KPI, Tarea, Decision, Parking, AreaId } from '@/lib/types'

export function useAuth() {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

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
  const [decisiones, setDecisiones] = useState<Decision[]>([])
  const [parking, setParking] = useState<Parking[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function refresh() {
    if (!areaId) return
    setLoading(true)
    const [kRes, tRes, dRes, pRes] = await Promise.all([
      supabase.from('kpis').select('*').eq('area_id', areaId).order('orden'),
      supabase.from('tareas').select('*').eq('area_id', areaId).order('created_at'),
      supabase.from('decisiones').select('*').eq('area_id', areaId).order('created_at'),
      supabase.from('parking').select('*').eq('area_id', areaId).order('created_at'),
    ])
    setKpis(kRes.data as KPI[] || [])
    setTareas(tRes.data as Tarea[] || [])
    setDecisiones(dRes.data as Decision[] || [])
    setParking(pRes.data as Parking[] || [])
    setLoading(false)
  }

  useEffect(() => { refresh() }, [areaId])

  return { kpis, tareas, decisiones, parking, loading, refresh, setKpis, setTareas, setDecisiones, setParking, supabase }
}
