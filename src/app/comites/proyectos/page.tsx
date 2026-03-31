'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProjects } from '@/lib/comites/use-projects'
import { useAuth } from '@/lib/comites/hooks'
import ProyectoCard from '@/components/comites/ProyectoCard'
import ProyectoModal from '@/components/comites/ProyectoModal'
import MandantesPanel from '@/components/comites/MandantesPanel'
import type { Proyecto, ProyectoEstado } from '@/lib/types'
import { ESTADO_LABELS, ESTADO_COLORS } from '@/lib/types'
import { toast } from '@/components/ui/Toast'
import ViewToggle from '@/components/comites/ViewToggle'
import type { ViewMode } from '@/components/comites/ViewToggle'
import { fmtFecha, fmtMM } from '@/lib/comites/data'

type FilterKey = 'todos' | 'estudio' | 'adjudicados' | 'cerrados' | 'no_adjudicados'

const FILTERS: { key: FilterKey; label: string; match: (e: ProyectoEstado) => boolean }[] = [
  { key: 'todos', label: 'Todos', match: () => true },
  { key: 'estudio', label: 'En Estudio', match: e => ['en_evaluacion', 'en_estudio', 'en_aclaracion', 'sin_informacion'].includes(e) },
  { key: 'adjudicados', label: 'Adjudicados / Activos', match: e => ['adjudicado', 'activo'].includes(e) },
  { key: 'cerrados', label: 'Cerrados', match: e => ['cerrado', 'cerrado_saldo'].includes(e) },
  { key: 'no_adjudicados', label: 'No Adjudicados', match: e => ['no_adjudicado', 'excusa'].includes(e) },
]

type PageTab = 'proyectos' | 'mandantes'

export default function ProyectosPage() {
  const { projects, loading, save, remove } = useProjects()
  const { isAdmin, loading: authLoading } = useAuth()
  const [filter, setFilter] = useState<FilterKey>('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Proyecto | null>(null)
  const [pageTab, setPageTab] = useState<PageTab>('proyectos')
  const [view, setView] = useState<ViewMode>('cards')

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
    try { await remove(p.id); toast('Proyecto eliminado') } catch { toast('Error al eliminar proyecto') }
  }

  if (authLoading || loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-slate-400 text-sm">Cargando...</div>
  }

  return (
    <>
      {/* Page-level tabs */}
      <div className="flex gap-1 mb-5 border-b border-[#E2E8F0] pb-0">
        {([
          { id: 'proyectos' as const, label: 'Proyectos', count: projects.length },
          { id: 'mandantes' as const, label: 'Mandantes' },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setPageTab(t.id)}
            className={`relative px-4 py-2.5 text-xs font-bold transition-all ${
              pageTab === t.id
                ? 'text-cobalt'
                : 'text-slate hover:text-ink'
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`ml-1.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                pageTab === t.id ? 'bg-cobalt/10 text-cobalt' : 'bg-slate-100 text-slate'
              }`}>
                {t.count}
              </span>
            )}
            {pageTab === t.id && (
              <motion.div
                layoutId="proyectos-tab-indicator"
                className="absolute bottom-0 left-2 right-2 h-0.5 bg-cobalt rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ═══ TAB: PROYECTOS ═══ */}
        {pageTab === 'proyectos' && (
          <motion.div key="proyectos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {/* Header */}
            <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
              <div>
                <h1 className="font-condensed text-2xl font-extrabold">
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
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
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

            {/* View toggle */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate">{filtered.length} proyecto{filtered.length !== 1 ? 's' : ''}</p>
              <ViewToggle view={view} onChange={setView} options={['cards', 'tabla']} />
            </div>

            {/* Content */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center text-slate-400 text-sm">
                Sin proyectos en este filtro.
              </div>
            ) : view === 'cards' ? (
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
            ) : (
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <th className="text-left px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate">Proyecto</th>
                      <th className="text-left px-2 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate">Estado</th>
                      <th className="text-left px-2 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate">Mandante</th>
                      <th className="text-right px-2 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate">Contrato</th>
                      <th className="text-right px-2 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate">Avance</th>
                      <th className="text-left px-2 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate">Inicio</th>
                      <th className="text-left px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate">Término</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.id}
                        className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                        onClick={() => openEdit(p)}>
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-6 rounded-full shrink-0" style={{ background: ESTADO_COLORS[p.estado] }} />
                            <span className="font-semibold text-ink">{p.nombre}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: ESTADO_COLORS[p.estado] + '15', color: ESTADO_COLORS[p.estado] }}>
                            {ESTADO_LABELS[p.estado]}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-slate">{p.mandante || '—'}</td>
                        <td className="px-2 py-2.5 text-right font-condensed font-bold text-ink">{p.contrato > 0 ? fmtMM(p.contrato) : '—'}</td>
                        <td className="px-2 py-2.5 text-right">
                          {p.avance_real > 0 ? (
                            <span className="font-condensed font-bold" style={{ color: p.avance_real >= p.avance_prog ? '#16A34A' : '#DC2626' }}>
                              {p.avance_real}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-2 py-2.5 text-slate">{p.fecha_inicio ? fmtFecha(p.fecha_inicio) : '—'}</td>
                        <td className="px-3.5 py-2.5 text-slate">{p.fecha_termino ? fmtFecha(p.fecha_termino) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal */}
            <ProyectoModal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              onSave={async (p) => { try { await save(p); toast('Proyecto guardado'); return true } catch { toast('Error al guardar proyecto'); return false } }}
              proyecto={editing}
            />
          </motion.div>
        )}

        {/* ═══ TAB: MANDANTES ═══ */}
        {pageTab === 'mandantes' && (
          <motion.div key="mandantes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            <MandantesPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
