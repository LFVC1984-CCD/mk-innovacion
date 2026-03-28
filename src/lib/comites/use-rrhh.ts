'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// ── Dotación ──

export interface Dotacion {
  id: string
  nombre: string
  rut: string | null
  cargo: string | null
  area: string | null
  obra_id: string | null
  tipo: 'constructta' | 'subcontrato'
  empresa_sc: string | null
  estado: 'activo' | 'inactivo' | 'vacaciones' | 'licencia' | 'desvinculado'
  fecha_ingreso: string | null
  fecha_termino: string | null
  costo_mensual: number
  fuente: string
  observacion: string | null
}

export type DotacionInput = Omit<Dotacion, 'id'>

// ── Documentación ──

export interface DocRRHH {
  id: string
  nombre: string
  tipo: 'procedimiento' | 'reglamento' | 'certificacion' | 'politica' | 'contrato_marco' | 'otro'
  estado: 'vigente' | 'por_vencer' | 'vencido' | 'en_revision' | 'borrador'
  responsable: string | null
  fecha_emision: string | null
  fecha_vencimiento: string | null
  url: string | null
  observacion: string | null
  fuente: string
}

export type DocRRHHInput = Omit<DocRRHH, 'id'>

// ── Capacitaciones ──

export interface Capacitacion {
  id: string
  nombre: string
  tipo: 'induccion' | 'tecnica' | 'seguridad' | 'liderazgo' | 'normativa' | 'otro'
  persona: string | null
  area: string | null
  obra_id: string | null
  horas: number
  fecha: string | null
  estado: 'programada' | 'completada' | 'cancelada'
  proveedor: string | null
  observacion: string | null
  fuente: string
}

export type CapacitacionInput = Omit<Capacitacion, 'id'>

// ── Hook ──

export function useRRHH() {
  const [dotacion, setDotacion] = useState<Dotacion[]>([])
  const [docs, setDocs] = useState<DocRRHH[]>([])
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [d, doc, c] = await Promise.all([
      supabase.from('dotacion').select('*').order('nombre'),
      supabase.from('documentacion_rrhh').select('*').order('nombre'),
      supabase.from('capacitaciones').select('*').order('fecha', { ascending: false }),
    ])
    if (d.data) setDotacion(d.data as Dotacion[])
    if (doc.data) setDocs(doc.data as DocRRHH[])
    if (c.data) setCapacitaciones(c.data as Capacitacion[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function saveDotacion(item: DotacionInput & { id?: string }) {
    if (item.id) {
      const { id, ...rest } = item
      const { error } = await supabase.from('dotacion').update(rest).eq('id', id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from('dotacion').insert(item)
      if (error) throw new Error(error.message)
    }
    await load()
  }

  async function removeDotacion(id: string) {
    const { error } = await supabase.from('dotacion').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await load()
  }

  async function saveDoc(item: DocRRHHInput & { id?: string }) {
    if (item.id) {
      const { id, ...rest } = item
      const { error } = await supabase.from('documentacion_rrhh').update(rest).eq('id', id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from('documentacion_rrhh').insert(item)
      if (error) throw new Error(error.message)
    }
    await load()
  }

  async function removeDoc(id: string) {
    const { error } = await supabase.from('documentacion_rrhh').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await load()
  }

  async function saveCapacitacion(item: CapacitacionInput & { id?: string }) {
    if (item.id) {
      const { id, ...rest } = item
      const { error } = await supabase.from('capacitaciones').update(rest).eq('id', id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from('capacitaciones').insert(item)
      if (error) throw new Error(error.message)
    }
    await load()
  }

  async function removeCapacitacion(id: string) {
    const { error } = await supabase.from('capacitaciones').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await load()
  }

  return {
    dotacion, docs, capacitaciones, loading, refresh: load,
    saveDotacion, removeDotacion,
    saveDoc, removeDoc,
    saveCapacitacion, removeCapacitacion,
  }
}
