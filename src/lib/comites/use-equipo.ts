'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Miembro } from '@/lib/types'

const supabase = createClient()

export function useEquipo() {
  const [equipo, setEquipo] = useState<Miembro[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('equipo')
      .select('*, proyectos(nombre)')
      .order('nombre')
    if (!error && data) {
      setEquipo(data.map((m: Record<string, unknown>) => ({
        ...m,
        proyecto_nombre: (m.proyectos as { nombre: string } | null)?.nombre ?? null,
      })) as Miembro[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function save(m: Omit<Miembro, 'id' | 'proyecto_nombre'> & { id?: string }): Promise<boolean> {
    const adjusted = { ...m }
    if (!adjusted.proyecto_id && adjusted.estado === 'activo') adjusted.estado = 'disponible'
    if (adjusted.proyecto_id && adjusted.estado === 'disponible') adjusted.estado = 'activo'

    const row = {
      nombre: adjusted.nombre, cargo: adjusted.cargo,
      proyecto_id: adjusted.proyecto_id || null, estado: adjusted.estado,
      contacto: adjusted.contacto || '',
    }

    if (m.id) {
      const { error } = await supabase.from('equipo').update(row).eq('id', m.id)
      if (error) { console.error('Error updating miembro:', error); return false }
    } else {
      const { error } = await supabase.from('equipo').insert(row)
      if (error) { console.error('Error inserting miembro:', error); return false }
    }
    await load()
    return true
  }

  async function remove(id: string): Promise<boolean> {
    const { error } = await supabase.from('equipo').delete().eq('id', id)
    if (error) { console.error('Error deleting miembro:', error); return false }
    await load()
    return true
  }

  return { equipo, loading, save, remove, refresh: load }
}
