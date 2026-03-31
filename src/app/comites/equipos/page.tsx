'use client'
import { useState, useMemo } from 'react'
import { useEquipo } from '@/lib/comites/use-equipo'
import { useProjects } from '@/lib/comites/use-projects'
import { useAuth } from '@/lib/comites/hooks'
import MiembroCard from '@/components/comites/MiembroCard'
import MiembroModal from '@/components/comites/MiembroModal'
import type { Miembro, Proyecto } from '@/lib/types'
import { toast } from '@/components/ui/Toast'
import { ESTADO_COLORS, fechaTerminoEfectiva } from '@/lib/types'

type EstadoFilter = 'todos' | 'activo' | 'disponible' | 'inactivo'
type Tab = 'listado' | 'calendario'

const ESTADO_FILTERS: { key: EstadoFilter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'activo', label: 'Activos' },
  { key: 'disponible', label: 'Sin proyecto' },
  { key: 'inactivo', label: 'Inactivos' },
]

export default function EquiposPage() {
  const { equipo, loading, save, remove } = useEquipo()
  const { projects, loading: projLoading } = useProjects()
  const { isAdmin, loading: authLoading } = useAuth()

  const [tab, setTab] = useState<Tab>('listado')
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('todos')
  const [proyectoFilter, setProyectoFilter] = useState<string>('todos')
  const [cargoFilter, setCargoFilter] = useState<string>('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Miembro | null>(null)

  // Unique values for filters
  const uniqueProyectos = useMemo(() => {
    const set = new Set<string>()
    equipo.forEach(m => { if (m.proyecto_nombre) set.add(m.proyecto_nombre) })
    return Array.from(set).sort()
  }, [equipo])

  const uniqueCargos = useMemo(() => {
    const set = new Set<string>()
    equipo.forEach(m => { if (m.cargo) set.add(m.cargo) })
    return Array.from(set).sort()
  }, [equipo])

  // Apply all filters
  const filtered = useMemo(() => {
    return equipo.filter(m => {
      if (estadoFilter !== 'todos' && m.estado !== estadoFilter) return false
      if (proyectoFilter !== 'todos') {
        if (proyectoFilter === '_sin') { if (m.proyecto_nombre) return false }
        else { if (m.proyecto_nombre !== proyectoFilter) return false }
      }
      if (cargoFilter !== 'todos' && m.cargo !== cargoFilter) return false
      return true
    })
  }, [equipo, estadoFilter, proyectoFilter, cargoFilter])

  const counts = useMemo(() => {
    const c: Record<EstadoFilter, number> = { todos: equipo.length, activo: 0, disponible: 0, inactivo: 0 }
    equipo.forEach(m => { c[m.estado as EstadoFilter] = (c[m.estado as EstadoFilter] || 0) + 1 })
    return c
  }, [equipo])

  const projColorMap = useMemo(() => {
    const m: Record<string, string> = {}
    projects.forEach(p => { m[p.id] = ESTADO_COLORS[p.estado] || '#94A3B8' })
    return m
  }, [projects])

  if (authLoading || loading || projLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-slate-500 text-sm">Cargando...</div>
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="font-condensed text-2xl font-extrabold">
            Maestro de <span className="text-cobalt">Equipos</span>
          </h1>
          <p className="text-xs text-slate-500">{equipo.length} profesionales · {uniqueProyectos.length} proyectos</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditing(null); setModalOpen(true) }}
            className="bg-cobalt text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-cobalt-dark transition-colors"
          >
            + Nuevo profesional
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-1 w-fit mb-4">
        {([['listado', 'Listado'], ['calendario', 'Calendario']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === key ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'listado' ? (
        <ListadoView
          equipo={equipo}
          filtered={filtered}
          counts={counts}
          estadoFilter={estadoFilter}
          setEstadoFilter={setEstadoFilter}
          proyectoFilter={proyectoFilter}
          setProyectoFilter={setProyectoFilter}
          cargoFilter={cargoFilter}
          setCargoFilter={setCargoFilter}
          uniqueProyectos={uniqueProyectos}
          uniqueCargos={uniqueCargos}
          projColorMap={projColorMap}
          onEdit={m => { setEditing(m); setModalOpen(true) }}
          onDelete={async m => { if (confirm(`¿Eliminar a "${m.nombre}"?`)) { try { await remove(m.id); toast('Miembro eliminado') } catch { toast('Error al eliminar miembro') } } }}
        />
      ) : (
        <CalendarioView equipo={equipo} projects={projects} />
      )}

      <MiembroModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={async (m) => { try { await save(m); toast('Miembro guardado'); return true } catch { toast('Error al guardar miembro'); return false } }}
        miembro={editing}
        proyectos={projects}
      />
    </>
  )
}

// ── LISTADO VIEW ──

function ListadoView({
  filtered, counts, estadoFilter, setEstadoFilter,
  proyectoFilter, setProyectoFilter, cargoFilter, setCargoFilter,
  uniqueProyectos, uniqueCargos, projColorMap, onEdit, onDelete,
}: {
  equipo: Miembro[]
  filtered: Miembro[]
  counts: Record<EstadoFilter, number>
  estadoFilter: EstadoFilter
  setEstadoFilter: (f: EstadoFilter) => void
  proyectoFilter: string
  setProyectoFilter: (f: string) => void
  cargoFilter: string
  setCargoFilter: (f: string) => void
  uniqueProyectos: string[]
  uniqueCargos: string[]
  projColorMap: Record<string, string>
  onEdit: (m: Miembro) => void
  onDelete: (m: Miembro) => void
}) {
  return (
    <>
      {/* Estado filters */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {ESTADO_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setEstadoFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
              estadoFilter === f.key
                ? 'bg-cobalt text-white border-cobalt'
                : 'bg-white border-[#E2E8F0] text-slate-500 hover:border-cobalt hover:text-cobalt'
            }`}
          >
            {f.label}
            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
              estadoFilter === f.key ? 'bg-white/20' : 'bg-slate-100'
            }`}>{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {/* Proyecto + Cargo filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <select
          value={proyectoFilter}
          onChange={e => setProyectoFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[11px] font-semibold bg-white text-ink cursor-pointer focus:outline-none focus:border-cobalt"
        >
          <option value="todos">Todos los proyectos</option>
          <option value="_sin">Sin proyecto</option>
          {uniqueProyectos.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          value={cargoFilter}
          onChange={e => setCargoFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[11px] font-semibold bg-white text-ink cursor-pointer focus:outline-none focus:border-cobalt"
        >
          <option value="todos">Todos los cargos</option>
          {uniqueCargos.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {(proyectoFilter !== 'todos' || cargoFilter !== 'todos') && (
          <button
            onClick={() => { setProyectoFilter('todos'); setCargoFilter('todos') }}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-danger transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate-500 text-sm">
          Sin profesionales en este filtro.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filtered.map(m => (
            <MiembroCard
              key={m.id}
              miembro={m}
              proyectoColor={m.proyecto_id ? projColorMap[m.proyecto_id] : undefined}
              onEdit={() => onEdit(m)}
              onDelete={() => onDelete(m)}
            />
          ))}
        </div>
      )}
    </>
  )
}

// ── CALENDARIO VIEW ──

function CalendarioView({ equipo, projects }: { equipo: Miembro[]; projects: Proyecto[] }) {
  // Timeline: 12 months from today
  const today = new Date()
  const months: { label: string; start: Date; end: Date }[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
    const end = new Date(today.getFullYear(), today.getMonth() + i + 1, 0)
    months.push({
      label: `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getFullYear()).slice(2)}`,
      start: d,
      end,
    })
  }

  const timelineStart = months[0].start.getTime()
  const timelineEnd = months[months.length - 1].end.getTime()
  const totalDays = (timelineEnd - timelineStart) / 86400000

  // Map project id → project
  const projMap = new Map(projects.map(p => [p.id, p]))

  // Only show activo + disponible
  const visible = equipo.filter(m => m.estado !== 'inactivo').sort((a, b) => {
    // Sort by project, then name
    const pa = a.proyecto_nombre || 'zzz'
    const pb = b.proyecto_nombre || 'zzz'
    if (pa !== pb) return pa.localeCompare(pb)
    return a.nombre.localeCompare(b.nombre)
  })

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
      {/* Header */}
      <div className="flex border-b border-[#E2E8F0] sticky top-0 bg-white z-10">
        <div className="w-[200px] shrink-0 p-3 text-[10px] font-bold uppercase text-slate-500 border-r border-[#E2E8F0]">
          Profesional
        </div>
        <div className="flex flex-1 min-w-[720px]">
          {months.map((m, i) => (
            <div key={i} className="flex-1 p-2 text-center text-[10px] font-bold uppercase text-slate-500 border-r border-[#E2E8F0] last:border-r-0">
              {m.label}
            </div>
          ))}
        </div>
      </div>

      {/* Rows */}
      {visible.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm">Sin profesionales para mostrar</div>
      ) : (
        visible.map(m => {
          const proj = m.proyecto_id ? projMap.get(m.proyecto_id) : null
          const projStart = proj?.fecha_inicio ? new Date(proj.fecha_inicio + 'T00:00:00').getTime() : null
          const projEnd = proj ? (fechaTerminoEfectiva(proj) ? new Date(fechaTerminoEfectiva(proj)! + 'T00:00:00').getTime() : null) : null
          const color = proj ? (ESTADO_COLORS[proj.estado] || '#94A3B8') : '#D97706'

          // Calculate bar position
          let barLeft = 0
          let barWidth = 0
          if (projStart && projEnd) {
            const clampStart = Math.max(projStart, timelineStart)
            const clampEnd = Math.min(projEnd, timelineEnd)
            if (clampEnd > clampStart) {
              barLeft = ((clampStart - timelineStart) / 86400000) / totalDays * 100
              barWidth = ((clampEnd - clampStart) / 86400000) / totalDays * 100
            }
          }

          // Today marker position
          const todayPct = ((today.getTime() - timelineStart) / 86400000) / totalDays * 100

          return (
            <div key={m.id} className="flex border-b border-[#E2E8F0] last:border-b-0 hover:bg-slate-50/50">
              {/* Name cell */}
              <div className="w-[200px] shrink-0 p-2.5 border-r border-[#E2E8F0]">
                <p className="text-[12px] font-semibold text-ink truncate">{m.nombre}</p>
                <p className="text-[10px] text-cobalt truncate">{m.cargo}</p>
              </div>

              {/* Timeline cell */}
              <div className="flex-1 min-w-[720px] relative" style={{ height: 44 }}>
                {/* Month grid lines */}
                <div className="absolute inset-0 flex">
                  {months.map((_, i) => (
                    <div key={i} className="flex-1 border-r border-[#E2E8F0] last:border-r-0" />
                  ))}
                </div>

                {/* Today line */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-danger/30 z-10"
                  style={{ left: `${todayPct}%` }}
                />

                {/* Project bar */}
                {barWidth > 0 ? (
                  <div
                    className="absolute top-2.5 h-5 rounded-md flex items-center px-2 text-[10px] font-bold text-white truncate z-20"
                    style={{
                      left: `${barLeft}%`,
                      width: `${barWidth}%`,
                      background: color,
                      minWidth: 4,
                    }}
                    title={`${m.proyecto_nombre} · ${proj?.fecha_inicio || '?'} → ${fechaTerminoEfectiva(proj!) || '?'}`}
                  >
                    {barWidth > 8 ? m.proyecto_nombre : ''}
                  </div>
                ) : m.proyecto_nombre ? (
                  <div className="absolute top-2.5 left-1 text-[10px] text-slate-500 italic">
                    {m.proyecto_nombre} (sin fechas)
                  </div>
                ) : (
                  <div className="absolute top-2.5 left-1 text-[10px] text-amber font-semibold">
                    Disponible
                  </div>
                )}
              </div>
            </div>
          )
        })
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 p-3 border-t border-[#E2E8F0] bg-slate-50/50 text-[10px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger/30" /> Hoy</span>
        <span>Barras = período del proyecto (usa fecha Asbuilt si existe)</span>
        <span className="text-amber font-semibold">Disponible = sin proyecto asignado</span>
      </div>
    </div>
  )
}
