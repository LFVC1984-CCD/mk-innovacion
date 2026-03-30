'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { GarantiaEstado, Divisa } from '@/lib/comites/data'

// ── DB row types ──

export interface GarantiaRow {
  id: string
  proyecto_id: string | null
  tipo: string
  instrumento: string
  entidad: string
  monto: number
  fecha_solicitud: string | null
  fecha_inicio: string | null
  fecha_vencimiento: string | null
  estado: GarantiaEstado
  observacion: string
  documento_url: string
  documento_nombre: string
  comprobante_url: string
  comprobante_nombre: string
  created_at: string
  updated_at: string
  // joined
  proyecto_nombre?: string
}

export interface EntidadRow {
  id: string
  nombre: string
  tipo: string
  contacto: string
  observacion: string
  tasa_interes: number
  created_at: string
}

export interface LineaCreditoRow {
  id: string
  entidad: string
  tipo: string
  monto: number
  instrumento: string
  tipo_entidad: string
  created_at: string
}

// ── Computed types (for UI) ──

export interface EntidadComputed {
  id: string
  nombre: string
  tipo: string
  contacto: string
  observacion: string
  tasa_interes: number
  instrumentos: string[]
  linea: number
  consumo: number
  activas: number
}

export interface InstrumentoComputed {
  nombre: string
  activas: number
  monto: number
  entidades: string[]
  tipos: string[]
  aprobado: number
  comprometido: number
}

export interface ProyectoOption {
  id: string
  nombre: string
}

// ── Input types for CRUD ──

export interface GarantiaInput {
  proyecto_id: string | null
  tipo: string
  instrumento: string
  entidad: string
  monto: number
  divisa?: Divisa
  fecha_solicitud: string | null
  fecha_inicio: string | null
  fecha_vencimiento: string | null
  estado: string
  observacion: string
  documento_url?: string
  documento_nombre?: string
  comprobante_url?: string
  comprobante_nombre?: string
}

export interface EntidadInput {
  nombre: string
  tipo: string
  contacto: string
  observacion: string
  tasa_interes: number
}

// ── Helper: compute days until vencimiento ──
function diasHasta(fecha: string | null): number | null {
  if (!fecha) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const target = new Date(fecha + 'T12:00:00')
  return Math.round((target.getTime() - hoy.getTime()) / 86400000)
}

// ── Normalize instrumento labels ──
const INSTR_LABELS: Record<string, string> = {
  boleta_garantia: 'Boleta de garantía',
  poliza_garantia: 'Póliza',
  credito_comercial: 'Crédito comercial',
  factoring: 'Factoring',
  capital_trabajo: 'Capital de trabajo',
}
function instrLabel(raw: string): string {
  return INSTR_LABELS[raw] || raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Normalize tipo labels ──
const TIPO_LABELS: Record<string, string> = {
  fiel_cumplimiento: 'Fiel cumplimiento',
  anticipo: 'Anticipo',
  seriedad_oferta: 'Seriedad de la oferta',
  correcta_ejecucion: 'Correcta ejecución',
}
function tipoLabel(raw: string): string {
  return TIPO_LABELS[raw] || raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ══════════════════════════════════════
//  HOOK
// ══════════════════════════════════════

const supabase = createClient()

export function useGarantias() {
  const [garantias, setGarantias] = useState<GarantiaRow[]>([])
  const [entidades, setEntidades] = useState<EntidadRow[]>([])
  const [lineas, setLineas] = useState<LineaCreditoRow[]>([])
  const [proyectos, setProyectos] = useState<ProyectoOption[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [gRes, eRes, lRes, pRes] = await Promise.all([
      supabase.from('garantias').select('*, proyectos!left(nombre)').order('updated_at', { ascending: false }),
      supabase.from('entidades').select('*').order('nombre'),
      supabase.from('lineas_credito').select('*').order('entidad'),
      supabase.from('proyectos').select('id, nombre').order('nombre'),
    ])
    if (gRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setGarantias(gRes.data.map((g: Record<string, any>) => ({
        ...g,
        monto: Number(g.monto) || 0,
        proyecto_nombre: g.proyectos?.nombre || '',
      })))
    }
    if (eRes.data) setEntidades(eRes.data)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (lRes.data) setLineas(lRes.data.map((l: Record<string, any>) => ({ ...l, monto: Number(l.monto) || 0 }) as LineaCreditoRow))
    if (pRes.data) setProyectos(pRes.data)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  // ── Computed: Entidades with aggregates ──
  const entidadesComputed = useMemo<EntidadComputed[]>(() => {
    return entidades.map(e => {
      const misLineas = lineas.filter(l => l.entidad === e.nombre)
      const misGarantias = garantias.filter(g => g.entidad === e.nombre && g.estado !== 'devuelta')
      const instrumentosSet = new Set(misLineas.map(l => instrLabel(l.instrumento)))
      return {
        id: e.id,
        nombre: e.nombre,
        tipo: e.tipo,
        contacto: e.contacto,
        observacion: e.observacion,
        tasa_interes: Number(e.tasa_interes) || 0,
        instrumentos: Array.from(instrumentosSet),
        linea: misLineas.reduce((s, l) => s + l.monto, 0),
        consumo: misGarantias.reduce((s, g) => s + g.monto, 0),
        activas: misGarantias.length,
      }
    })
  }, [entidades, lineas, garantias])

  // ── Computed: Instrumentos aggregated from garantías ──
  const instrumentosComputed = useMemo<InstrumentoComputed[]>(() => {
    const map = new Map<string, { activas: number; monto: number; entidades: Set<string>; tipos: Set<string> }>()
    for (const g of garantias) {
      if (g.estado === 'devuelta') continue
      const label = instrLabel(g.instrumento)
      const entry = map.get(label) || { activas: 0, monto: 0, entidades: new Set(), tipos: new Set() }
      entry.activas++
      entry.monto += g.monto
      entry.entidades.add(g.entidad)
      entry.tipos.add(tipoLabel(g.tipo))
      map.set(label, entry)
    }
    // Also add instruments from lineas that have no garantías yet
    for (const l of lineas) {
      const label = instrLabel(l.instrumento)
      if (!map.has(label)) {
        map.set(label, { activas: 0, monto: 0, entidades: new Set([l.entidad]), tipos: new Set() })
      }
    }
    return Array.from(map.entries()).map(([nombre, v]) => {
      const lineaTotal = lineas.filter(l => instrLabel(l.instrumento) === nombre).reduce((s, l) => s + l.monto, 0)
      return {
        nombre,
        activas: v.activas,
        monto: v.monto,
        entidades: Array.from(v.entidades),
        tipos: Array.from(v.tipos),
        aprobado: lineaTotal || v.monto,
        comprometido: v.monto,
      }
    }).sort((a, b) => b.comprometido - a.comprometido)
  }, [garantias, lineas])

  // ── Computed: garantías with dias, proyecto name, and auto-states ──
  // por_vencer (< 30d) and vencida (past date) are computed, not stored
  const garantiasUI = useMemo(() => {
    return garantias.map(g => {
      const dias = diasHasta(g.fecha_vencimiento)
      let estadoEfectivo = g.estado
      // Auto-compute: only if current DB state is 'vigente'
      if (g.estado === 'vigente' && dias !== null) {
        if (dias <= 0) estadoEfectivo = 'vencida' as GarantiaEstado
        else if (dias <= 30) estadoEfectivo = 'por_vencer' as GarantiaEstado
      }
      return {
        ...g,
        estado: estadoEfectivo,
        estado_db: g.estado, // original DB state (for permissions logic)
        dias,
        proyecto: g.proyecto_nombre || '(sin proyecto)',
        instrumento_label: instrLabel(g.instrumento),
        tipo_label: tipoLabel(g.tipo),
      }
    })
  }, [garantias])

  // ── CRUD: Garantías ──
  const saveGarantia = useCallback(async (input: GarantiaInput, id?: string): Promise<boolean> => {
    const row = {
      proyecto_id: input.proyecto_id || null,
      tipo: input.tipo,
      instrumento: input.instrumento,
      entidad: input.entidad,
      monto: input.monto,
      fecha_solicitud: input.fecha_solicitud || null,
      fecha_inicio: input.fecha_inicio || null,
      fecha_vencimiento: input.fecha_vencimiento || null,
      estado: input.estado,
      observacion: input.observacion || '',
      documento_url: input.documento_url || '',
      documento_nombre: input.documento_nombre || '',
      comprobante_url: input.comprobante_url || '',
      comprobante_nombre: input.comprobante_nombre || '',
      updated_at: new Date().toISOString(),
    }
    const { error } = id
      ? await supabase.from('garantias').update(row).eq('id', id)
      : await supabase.from('garantias').insert(row)
    if (error) { console.error('Error saving garantia:', error); throw new Error(error.message) }
    await load()
    return true
  }, [load])

  const deleteGarantia = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('garantias').delete().eq('id', id)
    if (error) { console.error('Error deleting garantia:', error); throw new Error(error.message) }
    await load()
    return true
  }, [load])

  // ── CRUD: Entidades ──
  const saveEntidad = useCallback(async (input: EntidadInput, id?: string): Promise<boolean> => {
    const row = { nombre: input.nombre, tipo: input.tipo, contacto: input.contacto || '', observacion: input.observacion || '', tasa_interes: input.tasa_interes || 0 }
    console.log('[saveEntidad]', id ? 'UPDATE' : 'INSERT', row, id)
    const result = id
      ? await supabase.from('entidades').update(row).eq('id', id)
      : await supabase.from('entidades').insert(row)
    console.log('[saveEntidad] result:', result)
    if (result.error) { console.error('Error saving entidad:', result.error); throw new Error(result.error.message) }
    await load()
    return true
  }, [load])

  const deleteEntidad = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('entidades').delete().eq('id', id)
    if (error) { console.error('Error deleting entidad:', error); throw new Error(error.message) }
    await load()
    return true
  }, [load])

  // ── CRUD: Líneas de crédito ──
  const saveLinea = useCallback(async (linea: Omit<LineaCreditoRow, 'id' | 'created_at'>, id?: string): Promise<boolean> => {
    const { error } = id
      ? await supabase.from('lineas_credito').update(linea).eq('id', id)
      : await supabase.from('lineas_credito').insert(linea)
    if (error) { console.error('Error saving linea:', error); throw new Error(error.message) }
    await load()
    return true
  }, [load])

  const deleteLinea = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('lineas_credito').delete().eq('id', id)
    if (error) { console.error('Error deleting linea:', error); throw new Error(error.message) }
    await load()
    return true
  }, [load])

  // ── Upload file to storage ──
  const uploadFile = useCallback(async (file: File, garantiaId: string, tipo: 'documento' | 'comprobante'): Promise<string> => {
    const ext = file.name.split('.').pop() || 'pdf'
    const path = `${garantiaId}/${tipo}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('garantias-docs').upload(path, file, { upsert: true })
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from('garantias-docs').getPublicUrl(path)
    return data.publicUrl
  }, [])

  return {
    loading,
    refresh: load,
    uploadFile,
    // Raw
    garantias: garantiasUI,
    entidades: entidadesComputed,
    instrumentos: instrumentosComputed,
    lineas,
    proyectos,
    // CRUD
    saveGarantia,
    deleteGarantia,
    saveEntidad,
    deleteEntidad,
    saveLinea,
    deleteLinea,
  }
}
