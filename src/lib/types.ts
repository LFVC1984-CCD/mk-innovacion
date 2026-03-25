export type AreaId = 'finanzas' | 'rrhh' | 'legal' | 'prevencion' | 'estudios' | 'obras' | 'eti' | 'admin' | 'viewer'

export interface Perfil {
  id: string
  nombre: string
  cargo: string | null
  area_id: AreaId
  color: string
}

export interface KPI {
  id: string
  area_id: AreaId
  nombre: string
  valor: string | null
  meta: string | null
  tipo: string
  status: string
  guia: string | null
  comentario: string
  orden: number
}

export interface Tarea {
  id: string
  area_id: AreaId
  texto: string
  responsable: string | null
  responsable_id: string | null
  estado: 'pendiente' | 'en-proceso' | 'completada' | 'bloqueada'
  fecha_compromiso: string | null
  from_decision: boolean
}

export interface Decision {
  id: string
  area_id: AreaId
  texto: string
  urgencia: 'urgente' | 'reunion' | 'proxima'
  resuelta: boolean
}

export interface Minuta {
  id: string
  area_id: AreaId
  fecha: string
  lineas: unknown[]
  texto_completo: string | null
  enviada: boolean
}

export interface Parking {
  id: string
  area_id: AreaId
  texto: string
}

export const AREA_NAMES: Record<string, string> = {
  admin: 'Administrador',
  finanzas: 'Finanzas y Tesorería',
  rrhh: 'Recursos Humanos',
  legal: 'Legal',
  prevencion: 'Prevención de Riesgos',
  estudios: 'Estudios y Licitaciones',
  obras: 'Obras Activas',
  eti: 'Eficiencia, Tecnología e Innovación',
  viewer: 'Solo lectura',
}

export const AREA_COLORS: Record<string, string> = {
  admin: '#0F172A',
  finanzas: '#0B5ED7',
  rrhh: '#7C3AED',
  legal: '#D97706',
  prevencion: '#DC2626',
  estudios: '#64748B',
  obras: '#16A34A',
  eti: '#0891B2',
  viewer: '#94A3B8',
}

export const AREAS_LIST: { id: AreaId; name: string; color: string; freq: string }[] = [
  { id: 'finanzas', name: 'Finanzas y Tesorería', color: '#0B5ED7', freq: 'Quincenal' },
  { id: 'rrhh', name: 'Recursos Humanos', color: '#7C3AED', freq: 'Mensual' },
  { id: 'legal', name: 'Legal', color: '#D97706', freq: 'Mensual' },
  { id: 'prevencion', name: 'Prevención de Riesgos', color: '#DC2626', freq: 'Semanal' },
  { id: 'estudios', name: 'Estudios y Licitaciones', color: '#64748B', freq: 'Mensual' },
  { id: 'obras', name: 'Obras Activas', color: '#16A34A', freq: 'Semanal' },
  { id: 'eti', name: 'Eficiencia, Tecnología e Innovación', color: '#0891B2', freq: 'Quincenal' },
]
