'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type ProcTipo = 'procedimiento' | 'instructivo' | 'protocolo' | 'diagrama_flujo' | 'manual' | 'formato' | 'otro'
export type ProcEstado = 'necesidad' | 'diseno' | 'revision' | 'validacion' | 'desarrollo' | 'aprobacion' | 'implementacion' | 'vigente' | 'obsoleto'

export const PROC_TIPOS: { value: ProcTipo; label: string }[] = [
  { value: 'procedimiento', label: 'Procedimiento' },
  { value: 'instructivo', label: 'Instructivo' },
  { value: 'protocolo', label: 'Protocolo' },
  { value: 'diagrama_flujo', label: 'Diagrama de flujo' },
  { value: 'manual', label: 'Manual' },
  { value: 'formato', label: 'Formato' },
  { value: 'otro', label: 'Otro' },
]

export const PROC_ETAPAS: { id: ProcEstado; label: string; color: string; short: string }[] = [
  { id: 'necesidad', label: 'Necesidad', color: '#94A3B8', short: 'NEC' },
  { id: 'diseno', label: 'Diseño', color: '#7C3AED', short: 'DIS' },
  { id: 'revision', label: 'Revisión', color: '#0B5ED7', short: 'REV' },
  { id: 'validacion', label: 'Validación', color: '#0891B2', short: 'VAL' },
  { id: 'desarrollo', label: 'Desarrollo', color: '#D97706', short: 'DES' },
  { id: 'aprobacion', label: 'Aprobación', color: '#EA580C', short: 'APR' },
  { id: 'implementacion', label: 'Implementación', color: '#16A34A', short: 'IMP' },
  { id: 'vigente', label: 'Vigente', color: '#16A34A', short: 'VIG' },
  { id: 'obsoleto', label: 'Obsoleto', color: '#DC2626', short: 'OBS' },
]

export interface Procedimiento {
  id: string
  area_id: string
  nombre: string
  codigo: string
  tipo: ProcTipo
  estado: ProcEstado
  responsable: string
  descripcion: string
  fecha_necesidad: string | null
  fecha_diseno: string | null
  fecha_revision: string | null
  fecha_validacion: string | null
  fecha_desarrollo: string | null
  fecha_aprobacion: string | null
  fecha_implementacion: string | null
  fecha_vigencia: string | null
  documento_url: string
  documento_nombre: string
  diagrama_url: string
  diagrama_nombre: string
  video_url: string
  video_titulo: string
  version: string
  observacion: string
  created_at: string
  updated_at: string
}

export type ProcInput = Omit<Procedimiento, 'id' | 'created_at' | 'updated_at'>

const supabase = createClient()

export function useProcedimientos(areaId: string) {
  const [procedimientos, setProcedimientos] = useState<Procedimiento[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('procedimientos').select('*').eq('area_id', areaId).order('codigo')
    setProcedimientos((data || []) as Procedimiento[])
    setLoading(false)
  }, [areaId])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (input: Partial<ProcInput>, id?: string) => {
    const row = { ...input, updated_at: new Date().toISOString() }
    if (id) await supabase.from('procedimientos').update(row).eq('id', id)
    else await supabase.from('procedimientos').insert({ ...row, area_id: areaId })
    await load()
  }, [areaId, load])

  const remove = useCallback(async (id: string) => {
    await supabase.from('procedimientos').delete().eq('id', id)
    await load()
  }, [load])

  const upload = useCallback(async (file: File, procId: string, tipo: 'documento' | 'diagrama'): Promise<{ url: string; nombre: string }> => {
    const ext = file.name.split('.').pop() || 'pdf'
    const path = `${areaId}/${procId}/${tipo}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('garantias-docs').upload(path, file, { upsert: true })
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from('garantias-docs').getPublicUrl(path)
    return { url: data.publicUrl, nombre: file.name }
  }, [areaId])

  return { procedimientos, loading, save, remove, upload, reload: load }
}
