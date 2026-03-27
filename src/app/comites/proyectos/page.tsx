'use client'
import { useState, useMemo } from 'react'
import { useProjects } from '@/lib/comites/use-projects'
import { useAuth } from '@/lib/comites/hooks'
import ProyectoCard from '@/components/comites/ProyectoCard'
import ProyectoModal from '@/components/comites/ProyectoModal'
import type { Proyecto, ProyectoEstado } from '@/lib/types'
import { ESTADO_LABELS, ESTADO_COLORS } from '@/lib/types'

type FilterKey = 'todos' | 'estudio' | 'adjudicados' | 'cerrados' | 'no_adjudicados'

const FILTERS: { key: FilterKey; label: string; match: (e: ProyectoEstado) => boolean }[] = [
  { key: 'todos', label: 'Todos', match: () => true },
  { key: 'estudio', label: 'En Estudio', match: e => ['en_evaluacion', 'en_estudio', 'en_aclaracion', 'sin_informacion'].includes(e) },
  { key: 'adjudicados', label: 'Adjudicados / Activos', match: e => ['adjudicado', 'activo'].includes(e) },
  { key: 'cerrados', label: 'Cerrados', match: e => ['cerrado', 'cerrado_saldo'].includes(e) },
  { key: 'no_adjudicados', label: 'No Adjudicados', match: e => ['no_adjudicado', 'excusa'].includes(e) },
]

export default function ProyectosPage() {
  const { projects, loading, save, remove } = useProjects()
  const { isAdmin, loading: authLoading } = useAuth()
  const [filter, setFilter] = useState<FilterKey>('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Proyecto | null>(null)

  const filtered = useMemo(() => {
    const f = FILTERS.find(x => x.key === filter)!
    return projects.filter(p => f.match(p.estado))
  }, [projects, filter])

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { todos: 0, estudio: 0, adjudicados: 0, cerrados: 0, no_adjudicados: 0 }
    projects.forEach(p => {
      c.todos++
      FILTERS.forEach(f => { if (f.key !== 'todos' && f.match(p.estado)) c[f.key]++ })
    })
    return c
  }, [projects])

  function openNew() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(p: Proyecto) {
    setEditing(p)
    setModalOpen(true)
  }

  async function handleDelete(p: Proyecto) {
    if (!confirm(`¿Eliminar proyecto "${p.nombre}"?`)) return
    await remove(p.id)
  }

  if (authLoading || loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-slate-400 text-sm">Cargando...</div>
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="font-condensed text-[26px] font-extrabold">
            Maestro de <span className="text-cobalt">Proyectos</span>
          </h1>
          <p className="text-xs text-slate-500">Proyectos compartidos entre todas las áreas</p>
        </div>
        {isAdmin && (
          <button
            onClick={openNew}
            className="bg-cobalt text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-cobalt-dark transition-colors"
          >
            + Nuevo proyecto
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
              filter === f.key
                ? 'bg-cobalt text-white border-cobalt'
                : 'bg-white border-[#E2E8F0] text-slate-500 hover:border-cobalt hover:text-cobalt'
            }`}
          >
            {f.label}
            <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full ${
              filter === f.key ? 'bg-white/20' : 'bg-slate-100'
            }`}>
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Summary by estado */}
      <div className="flex gap-2 flex-wrap mb-4">
        {Object.entries(
          filtered.reduce<Record<string, number>>((acc, p) => {
            acc[p.estado] = (acc[p.estado] || 0) + 1
            return acc
          }, {})
        ).map(([estado, count]) => (
          <div
            key={estado}
            className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: ESTADO_COLORS[estado as ProyectoEstado] }}
            />
            {ESTADO_LABELS[estado as ProyectoEstado]}: {count}
          </div>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate-400 text-sm">
          Sin proyectos en este filtro.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => (
            <ProyectoCard
              key={p.id}
              proyecto={p}
              onEdit={() => openEdit(p)}
              onDelete={() => handleDelete(p)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <ProyectoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={save}
        proyecto={editing}
      />
    </>
  )
}
