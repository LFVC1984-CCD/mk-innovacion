'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface PlanInversion {
  id: string
  cliente: string
  tipo_cliente: 'actual' | 'potencial'
  proyecto: string | null
  segmento: string | null
  monto_estimado: number
  probabilidad: number
  margen_esperado_pct: number
  fecha_estimada: string | null
  estado: 'prospecto' | 'contactado' | 'propuesta' | 'negociacion' | 'adjudicado' | 'descartado'
  observacion: string | null
  created_at: string
  updated_at: string
}

export type PlanInversionInput = Omit<PlanInversion, 'id' | 'created_at' | 'updated_at'>

export const ESTADO_PLAN: Record<PlanInversion['estado'], { label: string; color: string }> = {
  prospecto: { label: 'Prospecto', color: '#94A3B8' },
  contactado: { label: 'Contactado', color: '#64748B' },
  propuesta: { label: 'Propuesta', color: '#0B5ED7' },
  negociacion: { label: 'Negociacion', color: '#D97706' },
  adjudicado: { label: 'Adjudicado', color: '#16A34A' },
  descartado: { label: 'Descartado', color: '#DC2626' },
}

export function usePlanInversion() {
  const [items, setItems] = useState<PlanInversion[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('plan_inversion')
      .select('*')
      .order('monto_estimado', { ascending: false })
    if (!error && data) setItems(data as PlanInversion[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function save(item: PlanInversionInput & { id?: string }) {
    if (item.id) {
      const { id, ...rest } = item
      const { error } = await supabase.from('plan_inversion').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from('plan_inversion').insert(item)
      if (error) throw new Error(error.message)
    }
    await load()
  }

  async function remove(id: string) {
    const { error } = await supabase.from('plan_inversion').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await load()
  }

  return { items, loading, save, remove, refresh: load }
}
