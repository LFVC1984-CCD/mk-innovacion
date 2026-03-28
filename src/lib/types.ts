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

export type TareaTipo = 'seguimiento' | 'acuerdo' | 'accion_correctiva' | 'solicitud'

export const TAREA_TIPO_LABELS: Record<TareaTipo, string> = {
  seguimiento: 'Seguimiento',
  acuerdo: 'Acuerdo',
  accion_correctiva: 'Acción correctiva',
  solicitud: 'Solicitud',
}

export const TAREA_TIPO_COLORS: Record<TareaTipo, string> = {
  seguimiento: '#64748B',
  acuerdo: '#0B5ED7',
  accion_correctiva: '#DC2626',
  solicitud: '#D97706',
}

export interface Tarea {
  id: string
  area_id: AreaId
  texto: string
  responsable: string | null
  responsable_id: string | null
  estado: 'pendiente' | 'en-proceso' | 'completada' | 'bloqueada'
  tipo: TareaTipo
  fecha_compromiso: string | null
  from_decision: boolean
  area_destino: AreaId | null
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

// ── Proyectos ──

export type ProyectoEstado =
  | 'en_evaluacion' | 'en_estudio' | 'en_aclaracion' | 'sin_informacion'
  | 'adjudicado' | 'activo'
  | 'no_adjudicado' | 'excusa'
  | 'cerrado_saldo' | 'cerrado'

export type TipoProyecto = 'obra' | 'innovacion' | 'estudio' | 'servicio'

export const TIPO_PROYECTO_LABELS: Record<TipoProyecto, string> = {
  obra: 'Obra',
  innovacion: 'Innovación',
  estudio: 'Estudio',
  servicio: 'Servicio',
}

export const TIPO_PROYECTO_COLORS: Record<TipoProyecto, string> = {
  obra: '#16A34A',
  innovacion: '#0891B2',
  estudio: '#64748B',
  servicio: '#7C3AED',
}

export interface Proyecto {
  id: string
  nombre: string
  tipo_proyecto: TipoProyecto
  estado: ProyectoEstado
  mandante: string | null
  administrador: string | null
  fecha_inicio: string | null
  fecha_termino: string | null
  // Estudio
  monto_licitacion: number
  margen_estudio_pct: number
  fecha_oferta: string | null
  observacion: string | null
  // Adjudicación
  monto_adjudicado: number
  meta_margen: number
  meta_margen_pct: number
  fecha_adjudicacion: string | null
  // Término real
  fecha_fin_asbuilt: string | null
  // Financiero (obras)
  contrato: number
  ndc: number
  ndc_revision: number
  facturado: number
  presupuesto: number
  gastado: number
  // Desglose comprometido
  oc: number              // Órdenes de compra
  sc: number              // Subcontratos
  adicionales: number     // Adicionales / endiciones
  gastos_matriz: number   // Gastos de casa matriz
  mano_obra: number       // Mano de obra
  comprometido: number    // Auto-calc: OC + SC + Adic + GMatriz + MO
  // Avance
  avance_real: number
  avance_prog: number
  spi: number
  cpi: number
  // Comentario
  comentario_financiero: string | null
  updated_at?: string
}

export const ESTADO_LABELS: Record<ProyectoEstado, string> = {
  en_evaluacion: 'En Evaluación',
  en_estudio: 'En Estudio',
  en_aclaracion: 'En Aclaración',
  sin_informacion: 'Sin Información',
  adjudicado: 'Adjudicado',
  activo: 'Activo',
  no_adjudicado: 'No Adjudicado',
  excusa: 'Excusa',
  cerrado_saldo: 'Cerrado con saldo',
  cerrado: 'Cerrado',
}

export const ESTADO_COLORS: Record<ProyectoEstado, string> = {
  en_evaluacion: '#64748B',
  en_estudio: '#0B5ED7',
  en_aclaracion: '#D97706',
  sin_informacion: '#94A3B8',
  adjudicado: '#16A34A',
  activo: '#0B5ED7',
  no_adjudicado: '#DC2626',
  excusa: '#1E293B',
  cerrado_saldo: '#D97706',
  cerrado: '#94A3B8',
}

export const ESTADO_ICONS: Record<ProyectoEstado, string> = {
  en_evaluacion: '📋',
  en_estudio: '🔵',
  en_aclaracion: '🟡',
  sin_informacion: '⚪',
  adjudicado: '🟢',
  activo: '🔵',
  no_adjudicado: '🔴',
  excusa: '⚫',
  cerrado_saldo: '🟠',
  cerrado: '⚪',
}

/** Fecha de término efectiva: Asbuilt si existe, sino contractual */
export function fechaTerminoEfectiva(p: Proyecto): string | null {
  return p.fecha_fin_asbuilt || p.fecha_termino
}

export function isObra(p: Proyecto): boolean {
  if (p.estado === 'cerrado_saldo') return true
  return p.contrato > 0 && ['adjudicado', 'activo', 'cerrado'].includes(p.estado)
}

export function isEstudio(p: Proyecto): boolean {
  return ['en_evaluacion', 'en_estudio', 'en_aclaracion', 'sin_informacion'].includes(p.estado)
}

export const EMPTY_PROYECTO: Omit<Proyecto, 'id'> = {
  nombre: '', tipo_proyecto: 'obra', estado: 'en_evaluacion', mandante: null, administrador: null,
  fecha_inicio: null, fecha_termino: null,
  monto_licitacion: 0, margen_estudio_pct: 0, fecha_oferta: null, observacion: null,
  monto_adjudicado: 0, meta_margen: 0, meta_margen_pct: 0, fecha_adjudicacion: null, fecha_fin_asbuilt: null,
  contrato: 0, ndc: 0, ndc_revision: 0, facturado: 0, presupuesto: 0, gastado: 0,
  oc: 0, sc: 0, adicionales: 0, gastos_matriz: 0, mano_obra: 0, comprometido: 0,
  avance_real: 0, avance_prog: 0, spi: 0, cpi: 0, comentario_financiero: null,
}

// ── Equipo / Profesionales ──

export type MiembroEstado = 'activo' | 'disponible' | 'inactivo'

export interface Miembro {
  id: string
  nombre: string
  cargo: string
  proyecto_id: string | null
  proyecto_nombre?: string | null  // join desde proyectos
  estado: MiembroEstado
  contacto: string | null
}

export const MIEMBRO_ESTADO_LABELS: Record<MiembroEstado, string> = {
  activo: 'Activo',
  disponible: 'Sin proyecto',
  inactivo: 'Inactivo',
}

export const MIEMBRO_ESTADO_COLORS: Record<MiembroEstado, string> = {
  activo: '#16A34A',
  disponible: '#D97706',
  inactivo: '#94A3B8',
}

export const CARGOS_OBRA = [
  'Gerente de Proyecto',
  'Administrador de Obra',
  'Jefe de Terreno',
  'Jefe de Oficina Técnica',
  'Jefe de Calidad',
  'Prevencionista de Riesgos',
  'Profesional de Medio Ambiente',
  'Encargado de Bodega',
  'Topógrafo',
  'Administrador de Contrato',
  'Otro',
] as const

export const EMPTY_MIEMBRO: Omit<Miembro, 'id'> = {
  nombre: '', cargo: '', proyecto_id: null, estado: 'activo', contacto: null,
}

// ── Áreas ──

export const AREAS_LIST: { id: AreaId; name: string; color: string; freq: string }[] = [
  { id: 'finanzas', name: 'Finanzas y Tesorería', color: '#0B5ED7', freq: 'Quincenal' },
  { id: 'rrhh', name: 'Recursos Humanos', color: '#7C3AED', freq: 'Mensual' },
  { id: 'legal', name: 'Legal', color: '#D97706', freq: 'Mensual' },
  { id: 'prevencion', name: 'Prevención de Riesgos', color: '#DC2626', freq: 'Semanal' },
  { id: 'estudios', name: 'Estudios y Licitaciones', color: '#64748B', freq: 'Mensual' },
  { id: 'obras', name: 'Obras Activas', color: '#16A34A', freq: 'Semanal' },
  { id: 'eti', name: 'Eficiencia, Tecnología e Innovación', color: '#0891B2', freq: 'Quincenal' },
]

// ── Legal ──

export type CausaEstado = 'activa' | 'en_negociacion' | 'en_arbitraje' | 'resuelta_favor' | 'resuelta_contra' | 'desistida'
export type CausaTipo = 'reclamo' | 'arbitraje' | 'demanda' | 'mediacion' | 'multa' | 'otro'
export type DocTipo = 'contrato' | 'poder' | 'demanda' | 'resolucion' | 'informe' | 'correspondencia' | 'otro'

export interface CausaLegal {
  id: string
  proyecto_id: string | null
  titulo: string
  tipo: CausaTipo
  estado: CausaEstado
  contraparte: string | null
  monto_reclamado: number
  monto_provision: number
  fecha_inicio: string | null
  fecha_audiencia: string | null
  abogado_responsable: string | null
  descripcion: string | null
  riesgo: 'alto' | 'medio' | 'bajo'
  updated_at?: string
}

export interface DocumentoLegal {
  id: string
  causa_id: string | null
  nombre: string
  tipo: DocTipo
  descripcion: string | null
  url: string | null
  fecha: string | null
  created_at?: string
}

// ── Prevención ──

export type TipoEvento = 'accidente_trabajo' | 'accidente_trayecto' | 'incidente' | 'cuasi_accidente' | 'enfermedad_profesional'
export type Gravedad = 'leve' | 'moderado' | 'grave' | 'fatal'

export interface EventoSeguridad {
  id: string
  proyecto_id: string | null
  tipo: TipoEvento
  gravedad: Gravedad
  fecha: string | null
  descripcion: string | null
  dias_perdidos: number
  trabajador: string | null
  accion_correctiva: string | null
  cerrado: boolean
  created_at?: string
}

export interface EstadisticaMensual {
  id: string
  proyecto_id: string | null
  mes: string
  hh_trabajadas: number
  capacitaciones_horas: number
  inspecciones: number
  charlas_realizadas: number
  created_at?: string
}

// ── ETI ──

export type HerramientaEstado = 'activa' | 'en_evaluacion' | 'suspendida' | 'cancelada'
export type HerramientaCategoria = 'software' | 'plataforma' | 'hardware' | 'servicio_cloud' | 'licencia' | 'otro'

export interface HerramientaETI {
  id: string
  nombre: string
  categoria: HerramientaCategoria
  estado: HerramientaEstado
  proveedor: string | null
  costo_mensual_usd: number
  costo_anual_usd: number
  usuarios: number
  responsable: string | null
  fecha_contratacion: string | null
  fecha_renovacion: string | null
  descripcion: string | null
  url: string | null
  created_at?: string
}

export type EtapaInnovacion =
  | 'necesidad' | 'diseno' | 'mvp' | 'validacion' | 'ajustes'
  | 'desarrollo' | 'implementacion' | 'replicar'
  | 'contratacion' | 'descartado'

export type TipoRutaInnovacion = 'desarrollo_interno' | 'contratacion_servicio'

export const ETAPAS_DESARROLLO: EtapaInnovacion[] = [
  'necesidad', 'diseno', 'mvp', 'validacion', 'ajustes', 'desarrollo', 'implementacion', 'replicar',
]
export const ETAPAS_CONTRATACION: EtapaInnovacion[] = [
  'necesidad', 'contratacion', 'validacion', 'ajustes', 'implementacion', 'replicar',
]

export const ETAPA_CONFIG: Record<EtapaInnovacion, { label: string; color: string; short: string }> = {
  necesidad:      { label: 'Necesidad',      color: '#64748B', short: 'NEC' },
  diseno:         { label: 'Diseño',         color: '#7C3AED', short: 'DIS' },
  mvp:            { label: 'MVP',            color: '#0B5ED7', short: 'MVP' },
  validacion:     { label: 'Validación',     color: '#D97706', short: 'VAL' },
  ajustes:        { label: 'Ajustes',        color: '#0891B2', short: 'AJU' },
  desarrollo:     { label: 'Desarrollo',     color: '#2563EB', short: 'DEV' },
  implementacion: { label: 'Implementación', color: '#16A34A', short: 'IMP' },
  replicar:       { label: 'Replicar',       color: '#059669', short: 'REP' },
  contratacion:   { label: 'Contratación',   color: '#E1BA10', short: 'CON' },
  descartado:     { label: 'Descartado',     color: '#94A3B8', short: '✕' },
}

export interface ProyectoInnovacion {
  id: string
  nombre: string
  estado: 'idea' | 'en_desarrollo' | 'piloto' | 'implementado' | 'descartado'
  etapa: EtapaInnovacion
  tipo_ruta: TipoRutaInnovacion
  responsable: string | null
  fecha_inicio: string | null
  fecha_objetivo: string | null
  descripcion: string | null
  impacto_esperado: string | null
  presupuesto_usd: number
  created_at?: string
}
