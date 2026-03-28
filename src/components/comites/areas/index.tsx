import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import type { AreaId } from '@/lib/types'

const Loading = () => <div className="py-8 text-center text-slate-500 text-sm">Cargando...</div>

/**
 * Mapa de paneles especializados por área.
 * Cada componente se carga dinámicamente (code-split).
 * RRHH no tiene panel — solo usa KPIs + Tareas.
 */
export const AREA_PANELS: Partial<Record<AreaId, ComponentType>> = {
  obras: dynamic(() => import('./ObrasPanel'), { loading: Loading }),
  estudios: dynamic(() => import('./EstudiosPanel'), { loading: Loading }),
  legal: dynamic(() => import('./LegalPanel'), { loading: Loading }),
  prevencion: dynamic(() => import('./PrevencionPanel'), { loading: Loading }),
  finanzas: dynamic(() => import('./FinanzasPanel'), { loading: Loading }),
  eti: dynamic(() => import('./ETIPanel'), { loading: Loading }),
  rrhh: dynamic(() => import('./RRHHPanel'), { loading: Loading }),
}

export const GarantiasPanel = dynamic(() => import('./GarantiasPanel'), { loading: Loading })
export const GarantiasViewer = dynamic(() => import('./GarantiasViewer'), { loading: Loading })
