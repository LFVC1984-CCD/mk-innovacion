'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface Mandante {
  id: string
  nombre: string
  rut: string | null
  contacto: string | null
  tipo: 'privado' | 'publico' | 'mixto'
  segmento: 'edificacion' | 'infraestructura' | 'industrial' | 'mineria' | 'energia' | 'otro'
  telefono: string | null
  email: string | null
  observacion: string | null
  created_at: string
  updated_at: string
}

export type MandanteInput = Omit<Mandante, 'id' | 'created_at' | 'updated_at'>

export function useMandantes() {
  const [mandantes, setMandantes] = useState<Mandante[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('mandantes')
      .select('*')
      .order('nombre')
    if (!error && data) setMandantes(data as Mandante[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function save(m: MandanteInput & { id?: string }) {
    if (m.id) {
      const { id, ...rest } = m
      const { error } = await supabase.from('mandantes').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from('mandantes').insert(m)
      if (error) throw new Error(error.message)
    }
    await load()
  }

  async function remove(id: string) {
    const { error } = await supabase.from('mandantes').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await load()
  }

  return { mandantes, loading, save, remove, refresh: load }
}
