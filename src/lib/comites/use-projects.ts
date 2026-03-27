'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Proyecto } from '@/lib/types'

export function useProjects() {
  const [projects, setProjects] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('proyectos')
      .select('*')
      .order('updated_at', { ascending: false })
    if (!error && data) setProjects(data as Proyecto[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function save(p: Omit<Proyecto, 'id'> & { id?: string }): Promise<boolean> {
    if (p.id) {
      const { id, ...rest } = p
      const { error } = await supabase.from('proyectos').update(rest).eq('id', id)
      if (error) { console.error('Error updating project:', error); return false }
    } else {
      const { error } = await supabase.from('proyectos').insert(p)
      if (error) { console.error('Error inserting project:', error); return false }
    }
    await load()
    return true
  }

  async function remove(id: string): Promise<boolean> {
    const { error } = await supabase.from('proyectos').delete().eq('id', id)
    if (error) { console.error('Error deleting project:', error); return false }
    await load()
    return true
  }

  return { projects, loading, save, remove, refresh: load }
}
