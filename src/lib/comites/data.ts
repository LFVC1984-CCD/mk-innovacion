// ── Formateo de montos ──

/** Formato moneda chilena con separador de miles (punto). Ej: 1250 → "$1.250" */
export function fmtMoney(value: number): string {
  return `$${value.toLocaleString('es-CL')}`
}

/** Formato moneda + MM. Ej: 1250 → "$1.250 MM" */
export function fmtMM(value: number): string {
  return `${fmtMoney(value)} MM`
}

/** Formato compacto para barras. Ej: 1250 → "$1.250" (sin MM, para labels cortos) */
export function fmtShort(value: number): string {
  return fmtMoney(value)
}

// Divisas disponibles para garantías
export const DIVISAS = ['CLP', 'UF', 'USD', 'EUR'] as const
export type Divisa = typeof DIVISAS[number]

// Valor referencia UF (actualizable)
export const UF_REF = 38_847.56 // Valor UF referencia 25-mar-2026

// ── Data types & mock data for Comités portal ──

export type AreaId = 'finanzas' | 'rrhh' | 'legal' | 'prevencion' | 'estudios' | 'obras' | 'eti'

export interface AreaDef {
  id: AreaId
  name: string
  color: string
  freq: string
  kpis: number
  bad: number
  warn: number
  activas: number
  sinFecha: number
  spark: number[]
  updated: string
}

export const AREA_DEFS: AreaDef[] = [
  { id: 'finanzas', name: 'Finanzas y Tesorería', color: '#0B5ED7', freq: 'Quincenal', kpis: 7, bad: 1, warn: 2, activas: 3, sinFecha: 1, spark: [65, 72, 68, 81, 78, 85], updated: 'hace 1 día' },
  { id: 'rrhh', name: 'Recursos Humanos', color: '#7C3AED', freq: 'Mensual', kpis: 2, bad: 0, warn: 1, activas: 1, sinFecha: 1, spark: [40, 45, 50, 48, 55, 58], updated: 'hace 3 días' },
  { id: 'legal', name: 'Legal', color: '#D97706', freq: 'Mensual', kpis: 2, bad: 0, warn: 0, activas: 1, sinFecha: 1, spark: [30, 35, 33, 40, 42, 45], updated: 'hoy' },
  { id: 'prevencion', name: 'Prevención de Riesgos', color: '#DC2626', freq: 'Semanal', kpis: 6, bad: 2, warn: 1, activas: 1, sinFecha: 0, spark: [80, 75, 70, 65, 60, 55], updated: 'hace 5 días' },
  { id: 'estudios', name: 'Estudios y Licitaciones', color: '#64748B', freq: 'Mensual', kpis: 2, bad: 0, warn: 1, activas: 1, sinFecha: 1, spark: [20, 30, 35, 40, 50, 55], updated: 'hace 2 días' },
  { id: 'obras', name: 'Obras Activas', color: '#16A34A', freq: 'Semanal', kpis: 4, bad: 0, warn: 1, activas: 2, sinFecha: 0, spark: [50, 55, 60, 65, 70, 75], updated: 'hoy' },
  { id: 'eti', name: 'Eficiencia, Tecnología e Innovación', color: '#0891B2', freq: 'Quincenal', kpis: 6, bad: 0, warn: 2, activas: 2, sinFecha: 1, spark: [45, 58, 68, 71], updated: 'hace 1 día' },
]

// ── Garantías ──

export type GarantiaEstado = 'solicitada' | 'vigente' | 'por_vencer' | 'en_renovacion' | 'vencida' | 'devuelta'

export const ESTADO_CONFIG: Record<GarantiaEstado, { color: string; label: string }> = {
  solicitada: { color: '#0B5ED7', label: 'Solicitada' },
  vigente: { color: '#16A34A', label: 'Vigente' },
  por_vencer: { color: '#D97706', label: 'Por vencer' },
  en_renovacion: { color: '#7C3AED', label: 'En renovación' },
  vencida: { color: '#DC2626', label: 'Vencida' },
  devuelta: { color: '#94A3B8', label: 'Devuelta' },
}

export interface Garantia {
  id: string
  proyecto: string
  tipo: string
  instrumento: string
  entidad: string
  monto: number
  fechaInicio: string
  fechaVencimiento: string
  estado: GarantiaEstado
  dias: number | null
}

export interface InstrumentBar {
  name: string
  aprobado: number
  comprometido: number
}

export interface Vencimiento {
  date: string
  month: string
  proyecto: string
  detalle: string
  monto: number
  dias: number
}

export interface Entidad {
  nombre: string
  tipo: 'Banco' | 'Aseguradora'
  instrumentos: string[]
  linea: number
  consumo: number
  activas: number
}

export interface Instrumento {
  nombre: string
  activas: number
  monto: number
  entidades: string[]
  tipos: string[]
}

// ── Colores financieros (convención global) ──
export const FIN_COLORS = {
  aprobado: '#0B5ED7',     // azul
  comprometido: '#D97706', // amber
  disponible: '#16A34A',   // verde
  vencido: '#DC2626',      // rojo
  critico: '#DC2626',      // >80%
} as const

// ── Mock data ──

export const INSTR_BARS: InstrumentBar[] = [
  { name: 'Boleta de garantía', aprobado: 800, comprometido: 620 },
  { name: 'Póliza', aprobado: 300, comprometido: 187 },
  { name: 'Crédito comercial', aprobado: 150, comprometido: 45 },
  { name: 'Factoring', aprobado: 100, comprometido: 40 },
]

export const VENCIMIENTOS: Vencimiento[] = [
  { date: '08', month: 'ABR', proyecto: 'Estadio Nacional', detalle: 'Boleta · BCI', monto: 120, dias: 14 },
  { date: '12', month: 'ABR', proyecto: 'Costanera Center', detalle: 'Boleta · Santander', monto: 85, dias: 18 },
  { date: '19', month: 'ABR', proyecto: 'Hospital Talca', detalle: 'Póliza · Mapfre', monto: 45, dias: 25 },
  { date: '05', month: 'MAY', proyecto: 'Torre Apoquindo', detalle: 'Crédito · BCI', monto: 67, dias: 41 },
  { date: '18', month: 'MAY', proyecto: 'Puente Maipo', detalle: 'Boleta · BancoEstado', monto: 95, dias: 54 },
]

export const GARANTIAS: Garantia[] = [
  { id: 'g1', proyecto: 'Estadio Nacional', tipo: 'Fiel cumplimiento', instrumento: 'Boleta de garantía', entidad: 'BCI', monto: 120, fechaInicio: '15-ene-2026', fechaVencimiento: '08-abr-2026', estado: 'por_vencer', dias: 14 },
  { id: 'g2', proyecto: 'Costanera Center', tipo: 'Anticipo', instrumento: 'Boleta de garantía', entidad: 'Santander', monto: 85, fechaInicio: '01-dic-2025', fechaVencimiento: '12-abr-2026', estado: 'por_vencer', dias: 18 },
  { id: 'g3', proyecto: 'Hospital Talca', tipo: 'Seriedad oferta', instrumento: 'Póliza', entidad: 'Mapfre', monto: 45, fechaInicio: '20-feb-2026', fechaVencimiento: '19-abr-2026', estado: 'por_vencer', dias: 25 },
  { id: 'g4', proyecto: 'Torre Apoquindo', tipo: 'Fiel cumplimiento', instrumento: 'Boleta de garantía', entidad: 'BCI', monto: 180, fechaInicio: '01-mar-2026', fechaVencimiento: '01-sep-2026', estado: 'vigente', dias: 160 },
  { id: 'g5', proyecto: 'Puente Maipo', tipo: 'Correcta ejecución', instrumento: 'Boleta de garantía', entidad: 'BancoEstado', monto: 95, fechaInicio: '15-ene-2026', fechaVencimiento: '18-may-2026', estado: 'vigente', dias: 54 },
  { id: 'g6', proyecto: 'Edificio Providencia', tipo: 'Anticipo', instrumento: 'Factoring', entidad: 'Santander', monto: 67, fechaInicio: '10-feb-2026', fechaVencimiento: '10-ago-2026', estado: 'vigente', dias: 138 },
  { id: 'g7', proyecto: 'Centro Logístico', tipo: 'Fiel cumplimiento', instrumento: 'Póliza', entidad: 'Mapfre', monto: 97, fechaInicio: '01-feb-2026', fechaVencimiento: '01-dic-2026', estado: 'vigente', dias: 251 },
  { id: 'g8', proyecto: 'Parque Industrial', tipo: 'Seriedad oferta', instrumento: 'Crédito comercial', entidad: 'BCI', monto: 45, fechaInicio: '01-nov-2025', fechaVencimiento: '01-mar-2026', estado: 'vencida', dias: -24 },
  { id: 'g9', proyecto: 'Mall del Sur', tipo: 'Fiel cumplimiento', instrumento: 'Boleta de garantía', entidad: 'BancoEstado', monto: 110, fechaInicio: '15-mar-2026', fechaVencimiento: '15-mar-2027', estado: 'vigente', dias: 355 },
  { id: 'g10', proyecto: 'Ruta 5 Norte', tipo: 'Anticipo', instrumento: 'Factoring', entidad: 'Scotiabank', monto: 48, fechaInicio: '', fechaVencimiento: '', estado: 'solicitada', dias: null },
]

export const ENTIDADES: Entidad[] = [
  { nombre: 'BCI', tipo: 'Banco', instrumentos: ['Boleta de garantía', 'Crédito comercial'], linea: 500, consumo: 380, activas: 5 },
  { nombre: 'Santander', tipo: 'Banco', instrumentos: ['Boleta de garantía', 'Factoring'], linea: 400, consumo: 290, activas: 4 },
  { nombre: 'Mapfre', tipo: 'Aseguradora', instrumentos: ['Póliza'], linea: 200, consumo: 142, activas: 3 },
  { nombre: 'BancoEstado', tipo: 'Banco', instrumentos: ['Boleta de garantía', 'Crédito comercial'], linea: 150, consumo: 80, activas: 2 },
  { nombre: 'Liberty', tipo: 'Aseguradora', instrumentos: ['Póliza'], linea: 100, consumo: 0, activas: 0 },
  { nombre: 'Scotiabank', tipo: 'Banco', instrumentos: ['Boleta de garantía', 'Factoring', 'Crédito comercial'], linea: 300, consumo: 0, activas: 0 },
]

export const INSTRUMENTOS: Instrumento[] = [
  { nombre: 'Boleta de garantía', activas: 8, monto: 620, entidades: ['BCI', 'Santander', 'BancoEstado', 'Scotiabank'], tipos: ['Fiel cumplimiento', 'Seriedad oferta', 'Anticipo', 'Correcta ejecución'] },
  { nombre: 'Póliza', activas: 3, monto: 187, entidades: ['Mapfre', 'Liberty'], tipos: ['Fiel cumplimiento', 'Correcta ejecución'] },
  { nombre: 'Crédito comercial', activas: 1, monto: 45, entidades: ['BCI', 'BancoEstado', 'Scotiabank'], tipos: ['Anticipo'] },
  { nombre: 'Factoring', activas: 2, monto: 40, entidades: ['Santander', 'Scotiabank'], tipos: ['Anticipo'] },
]
