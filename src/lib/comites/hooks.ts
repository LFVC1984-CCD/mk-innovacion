'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Perfil, KPI, Tarea, AreaId } from '@/lib/types'

const supabase = createClient()

export interface PermisoModulo {
  modulo: string
  nivel: 'lectura' | 'edicion'
}

export function useAuth() {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [permisos, setPermisos] = useState<PermisoModulo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [perfilRes, permisosRes] = await Promise.all([
        supabase.from('perfiles').select('*').eq('id', user.id).single(),
        supabase.from('permisos_usuario').select('modulo, nivel').eq('user_id', user.id),
      ])
      setPerfil(perfilRes.data as Perfil | null)
      setPermisos((permisosRes.data || []) as PermisoModulo[])
      setLoading(false)
    }
    load()
  }, [])

  /** Can edit a specific module? Admin always can, otherwise check permisos */
  const canEdit = (modulo: string) => {
    if (!perfil) return false
    if (perfil.area_id === 'admin') return true
    const p = permisos.find(p => p.modulo === modulo)
    return p?.nivel === 'edicion'
  }

  /** Can view a specific module? Admin always can, any permiso level allows view */
  const canView = (modulo: string) => {
    if (!perfil) return false
    if (perfil.area_id === 'admin') return true
    return permisos.some(p => p.modulo === modulo)
  }

  /** Get permission level for a module */
  const getNivel = (modulo: string): 'edicion' | 'lectura' | null => {
    if (!perfil) return null
    if (perfil.area_id === 'admin') return 'edicion'
    const p = permisos.find(p => p.modulo === modulo)
    return p?.nivel || null
  }

  /** List of modules this user has access to */
  const modulosAccesibles = perfil?.area_id === 'admin'
    ? ['finanzas', 'obras', 'estudios', 'legal', 'prevencion', 'rrhh', 'eti', 'reuniones', 'proyectos', 'equipos', 'historial', 'usuarios']
    : permisos.map(p => p.modulo)

  const isAdmin = perfil?.area_id === 'admin'

  return { perfil, permisos, loading, canEdit, canView, getNivel, modulosAccesibles, isAdmin, supabase }
}

export function useAreaData(areaId: AreaId | null) {
  const [kpis, setKpis] = useState<KPI[]>([])
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)

  const initialLoadDone = useRef(false)

  async function refresh() {
    if (!areaId) return
    if (!initialLoadDone.current) setLoading(true)
    const [kRes, tRes, tCrossRes] = await Promise.all([
      supabase.from('kpis').select('*').eq('area_id', areaId).order('orden'),
      supabase.from('tareas').select('*').eq('area_id', areaId).order('created_at'),
      supabase.from('tareas').select('*').eq('area_destino', areaId).neq('area_id', areaId).order('created_at'),
    ])
    setKpis(kRes.data as KPI[] || [])
    const propias = (tRes.data || []) as Tarea[]
    const cross = (tCrossRes.data || []) as Tarea[]
    const ids = new Set(propias.map(t => t.id))
    const merged = [...propias, ...cross.filter(t => !ids.has(t.id))]
    setTareas(merged)
    setLoading(false)
    initialLoadDone.current = true
  }

  useEffect(() => { initialLoadDone.current = false; refresh() }, [areaId])

  return { kpis, tareas, loading, refresh, setKpis, setTareas, supabase }
}
