'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ReunionObra {
  id: string
  proyecto_id: string
  fecha: string
  estado: 'programada' | 'en_curso' | 'cerrada'
  proximo_ep_monto: number
  proximo_ep_fecha: string
  comentario_financiero: string
  avance_reportado: number
  comentario_planificacion: string
  notas: string
  asistentes: string
  duracion_min: number
  created_at: string
  updated_at: string
}

export interface TareaReunion {
  id: string
  area_id: string
  texto: string
  responsable: string | null
  estado: string
  fecha_compromiso: string | null
  proyecto_id: string | null
}

export interface ReunionInput {
  proyecto_id: string
  fecha?: string
  proximo_ep_monto?: number
  proximo_ep_fecha?: string
  comentario_financiero?: string
  avance_reportado?: number
  comentario_planificacion?: string
  notas?: string
  asistentes?: string
  duracion_min?: number
  estado?: string
}

export function useReunionesObra() {
  const supabase = createClient()
  const [reuniones, setReuniones] = useState<ReunionObra[]>([])
  const [tareas, setTareas] = useState<TareaReunion[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [rRes, tRes] = await Promise.all([
      supabase.from('reuniones_obra').select('*').order('fecha', { ascending: false }),
      supabase.from('tareas').select('id, area_id, texto, responsable, estado, fecha_compromiso, proyecto_id').eq('tipo', 'reunion_obra').order('fecha_compromiso'),
    ])
    setReuniones((rRes.data || []).map((r: Record<string, unknown>) => ({
      ...r,
      proximo_ep_monto: Number(r.proximo_ep_monto) || 0,
      avance_reportado: Number(r.avance_reportado) || 0,
      duracion_min: Number(r.duracion_min) || 30,
    })) as ReunionObra[])
    setTareas((tRes.data || []) as TareaReunion[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function saveReunion(input: ReunionInput, editId?: string): Promise<void> {
    const row = {
      proyecto_id: input.proyecto_id,
      fecha: input.fecha || new Date().toISOString().slice(0, 10),
      estado: input.estado || 'programada',
      proximo_ep_monto: input.proximo_ep_monto || 0,
      proximo_ep_fecha: input.proximo_ep_fecha || '',
      comentario_financiero: input.comentario_financiero || '',
      avance_reportado: input.avance_reportado || 0,
      comentario_planificacion: input.comentario_planificacion || '',
      notas: input.notas || '',
      asistentes: input.asistentes || '',
      duracion_min: input.duracion_min || 30,
      updated_at: new Date().toISOString(),
    }
    if (editId) {
      await supabase.from('reuniones_obra').update(row).eq('id', editId)
    } else {
      await supabase.from('reuniones_obra').insert(row)
    }
    await load()
  }

  async function deleteReunion(id: string): Promise<void> {
    await supabase.from('reuniones_obra').delete().eq('id', id)
    await load()
  }

  async function saveTarea(input: { area_id: string; texto: string; responsable: string; fecha_compromiso: string; proyecto_id: string }, editId?: string): Promise<void> {
    const row = { ...input, tipo: 'reunion_obra', estado: 'pendiente' }
    if (editId) {
      await supabase.from('tareas').update({ texto: input.texto, responsable: input.responsable, fecha_compromiso: input.fecha_compromiso, area_id: input.area_id }).eq('id', editId)
    } else {
      await supabase.from('tareas').insert(row)
    }
    await load()
  }

  async function toggleTarea(id: string, estado: string): Promise<void> {
    const next = estado === 'completada' ? 'pendiente' : 'completada'
    await supabase.from('tareas').update({ estado: next }).eq('id', id)
    await load()
  }

  return { reuniones, tareas, loading, saveReunion, deleteReunion, saveTarea, toggleTarea, reload: load }
}
