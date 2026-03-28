'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// ── Métricas mensuales consolidadas ──

export interface MetricaRRHH {
  id: string
  mes: string
  dotacion_constructora: number
  dotacion_subcontrato: number
  trabajadores_vigentes: number
  asistencia_promedio: number
  tasa_asistencia: number
  licencias_medicas: number
  vacaciones: number
  desvinculaciones: number
  contrataciones: number
  observacion: string | null
  fuente: string
}

export type MetricaRRHHInput = Omit<MetricaRRHH, 'id'>

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

// ── Auditorías ──

export interface Auditoria {
  id: string
  nombre: string
  tipo: 'interna' | 'externa' | 'mutual' | 'ist' | 'achs' | 'otro'
  fecha: string | null
  resultado: 'aprobada' | 'aprobada_observaciones' | 'reprobada' | 'pendiente' | 'en_proceso'
  puntaje: number | null
  hallazgos: number
  hallazgos_cerrados: number
  auditor: string | null
  observacion: string | null
  url: string | null
  fuente: string
}

export type AuditoriaInput = Omit<Auditoria, 'id'>

// ── Hook ──

export function useRRHH() {
  const [metricas, setMetricas] = useState<MetricaRRHH[]>([])
  const [docs, setDocs] = useState<DocRRHH[]>([])
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([])
  const [auditorias, setAuditorias] = useState<Auditoria[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [m, d, c, a] = await Promise.all([
      supabase.from('metricas_rrhh').select('*').order('mes', { ascending: false }),
      supabase.from('documentacion_rrhh').select('*').order('nombre'),
      supabase.from('capacitaciones').select('*').order('fecha', { ascending: false }),
      supabase.from('auditorias_rrhh').select('*').order('fecha', { ascending: false }),
    ])
    if (m.data) setMetricas(m.data as MetricaRRHH[])
    if (d.data) setDocs(d.data as DocRRHH[])
    if (c.data) setCapacitaciones(c.data as Capacitacion[])
    if (a.data) setAuditorias(a.data as Auditoria[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Métricas
  async function saveMetrica(item: MetricaRRHHInput & { id?: string }) {
    if (item.id) {
      const { id, ...rest } = item
      const { error } = await supabase.from('metricas_rrhh').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from('metricas_rrhh').insert(item)
      if (error) throw new Error(error.message)
    }
    await load()
  }
  async function removeMetrica(id: string) {
    const { error } = await supabase.from('metricas_rrhh').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await load()
  }

  // Docs
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

  // Capacitaciones
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

  // Auditorías
  async function saveAuditoria(item: AuditoriaInput & { id?: string }) {
    if (item.id) {
      const { id, ...rest } = item
      const { error } = await supabase.from('auditorias_rrhh').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from('auditorias_rrhh').insert(item)
      if (error) throw new Error(error.message)
    }
    await load()
  }
  async function removeAuditoria(id: string) {
    const { error } = await supabase.from('auditorias_rrhh').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await load()
  }

  return {
    metricas, docs, capacitaciones, auditorias, loading, refresh: load,
    saveMetrica, removeMetrica,
    saveDoc, removeDoc,
    saveCapacitacion, removeCapacitacion,
    saveAuditoria, removeAuditoria,
  }
}
