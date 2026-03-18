'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/comites/hooks'
import TopBar from '@/components/ui/TopBar'
import { toast } from '@/components/ui/Toast'
import { AREA_NAMES, AREA_COLORS, type AreaId } from '@/lib/types'

interface UserRow {
  id: string
  nombre: string
  cargo: string | null
  area_id: AreaId
  color: string
  email?: string
}

const AREA_OPTIONS: { id: AreaId; name: string }[] = [
  { id: 'admin', name: 'Administrador' },
  { id: 'finanzas', name: 'Finanzas y Tesorería' },
  { id: 'rrhh', name: 'Recursos Humanos' },
  { id: 'legal', name: 'Legal' },
  { id: 'prevencion', name: 'Prevención de Riesgos' },
  { id: 'estudios', name: 'Estudios y Licitaciones' },
  { id: 'obras', name: 'Obras Activas' },
  { id: 'viewer', name: 'Solo lectura' },
]

export default function UsuariosPage() {
  const { perfil, loading: authLoading, isAdmin, supabase } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // Create form
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newNombre, setNewNombre] = useState('')
  const [newCargo, setNewCargo] = useState('')
  const [newArea, setNewArea] = useState<AreaId>('viewer')
  const [creating, setCreating] = useState(false)

  // Edit form
  const [editNombre, setEditNombre] = useState('')
  const [editCargo, setEditCargo] = useState('')
  const [editArea, setEditArea] = useState<AreaId>('viewer')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAdmin) router.push('/comites')
  }, [authLoading, isAdmin])

  useEffect(() => {
    if (isAdmin) loadUsers()
  }, [isAdmin])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase.from('perfiles').select('*').order('nombre')
    setUsers((data as UserRow[]) || [])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail || !newPassword || !newNombre) return
    setCreating(true)

    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newEmail,
        password: newPassword,
        nombre: newNombre,
        cargo: newCargo || null,
        area_id: newArea,
        color: AREA_COLORS[newArea] || '#0B5ED7',
      }),
    })

    if (res.ok) {
      toast('Usuario creado')
      setShowCreate(false)
      setNewEmail(''); setNewPassword(''); setNewNombre(''); setNewCargo(''); setNewArea('viewer')
      await loadUsers()
    } else {
      const err = await res.json()
      toast(`Error: ${err.error || 'No se pudo crear'}`)
    }
    setCreating(false)
  }

  function startEdit(u: UserRow) {
    setEditId(u.id)
    setEditNombre(u.nombre)
    setEditCargo(u.cargo || '')
    setEditArea(u.area_id)
  }

  async function handleSaveEdit() {
    if (!editId) return
    setSaving(true)
    const { error } = await supabase.from('perfiles').update({
      nombre: editNombre,
      cargo: editCargo || null,
      area_id: editArea,
      color: AREA_COLORS[editArea] || '#0B5ED7',
    }).eq('id', editId)
    if (error) {
      toast(`Error: ${error.message}`)
    } else {
      toast('Perfil actualizado')
      setEditId(null)
      await loadUsers()
    }
    setSaving(false)
  }

  async function handleDelete(u: UserRow) {
    if (!confirm(`¿Eliminar a ${u.nombre}? Esta acción no se puede deshacer.`)) return
    const res = await fetch('/api/usuarios', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id }),
    })
    if (res.ok) {
      toast('Usuario eliminado')
      await loadUsers()
    } else {
      const err = await res.json()
      toast(`Error: ${err.error || 'No se pudo eliminar'}`)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-slate-400 text-sm">Cargando...</div>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar perfil={perfil} breadcrumbs={[{ label: 'Usuarios' }]} />

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-condensed font-black text-cobalt text-2xl uppercase tracking-wide">Usuarios</h1>
            <p className="text-sm text-slate-500">{users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)}
            className="bg-cobalt text-white font-semibold text-sm px-4 py-2 rounded hover:bg-cobalt/90 transition-all">
            + Nuevo usuario
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-lg p-5 mb-6 space-y-3" style={{ boxShadow: '0 2px 10px rgba(0,0,0,.06)' }}>
            <div className="font-condensed font-bold text-cobalt uppercase tracking-wider text-sm mb-1">Crear usuario</div>
            <div className="grid grid-cols-2 gap-3">
              <input value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" placeholder="Email" required
                className="border border-slate-200 rounded px-3 py-2 text-sm focus:border-cobalt focus:ring-1 focus:ring-cobalt outline-none" />
              <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="text" placeholder="Contraseña temporal" required minLength={6}
                className="border border-slate-200 rounded px-3 py-2 text-sm focus:border-cobalt focus:ring-1 focus:ring-cobalt outline-none" />
              <input value={newNombre} onChange={e => setNewNombre(e.target.value)} type="text" placeholder="Nombre completo" required
                className="border border-slate-200 rounded px-3 py-2 text-sm focus:border-cobalt focus:ring-1 focus:ring-cobalt outline-none" />
              <input value={newCargo} onChange={e => setNewCargo(e.target.value)} type="text" placeholder="Cargo (opcional)"
                className="border border-slate-200 rounded px-3 py-2 text-sm focus:border-cobalt focus:ring-1 focus:ring-cobalt outline-none" />
            </div>
            <div className="flex items-center gap-3">
              <select value={newArea} onChange={e => setNewArea(e.target.value as AreaId)}
                className="border border-slate-200 rounded px-3 py-2 text-sm flex-1 focus:border-cobalt focus:ring-1 focus:ring-cobalt outline-none">
                {AREA_OPTIONS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <button type="submit" disabled={creating}
                className="bg-gold text-cobalt font-bold text-sm px-5 py-2 rounded hover:bg-gold/90 transition-all disabled:opacity-50">
                {creating ? 'Creando...' : 'Crear'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-slate-400 hover:text-slate-600">Cancelar</button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 gap-2.5">
          {users.map(u => (
            <div key={u.id} className="bg-white border border-slate-200 rounded-lg px-5 py-3 flex items-center justify-between hover:border-cobalt/30 transition-all" style={{ boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
              {editId === u.id ? (
                <div className="flex items-center gap-3 flex-1">
                  <input value={editNombre} onChange={e => setEditNombre(e.target.value)}
                    className="border border-slate-200 rounded px-2 py-1 text-sm w-48 focus:border-cobalt outline-none" />
                  <input value={editCargo} onChange={e => setEditCargo(e.target.value)} placeholder="Cargo"
                    className="border border-slate-200 rounded px-2 py-1 text-sm w-40 focus:border-cobalt outline-none" />
                  <select value={editArea} onChange={e => setEditArea(e.target.value as AreaId)}
                    className="border border-slate-200 rounded px-2 py-1 text-sm focus:border-cobalt outline-none">
                    {AREA_OPTIONS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <button onClick={handleSaveEdit} disabled={saving} className="text-xs font-bold text-cobalt hover:underline">Guardar</button>
                  <button onClick={() => setEditId(null)} className="text-xs text-slate-400 hover:text-slate-600">Cancelar</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-condensed font-bold text-sm"
                      style={{ background: AREA_COLORS[u.area_id] || '#94A3B8' }}>
                      {u.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-ink">{u.nombre}</div>
                      <div className="text-xs text-slate-400">{u.cargo || 'Sin cargo'}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                      style={{ background: `${AREA_COLORS[u.area_id]}15`, color: AREA_COLORS[u.area_id] }}>
                      {AREA_NAMES[u.area_id] || u.area_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(u)} className="text-xs font-semibold text-slate-400 hover:text-cobalt transition-colors">Editar</button>
                    {u.id !== perfil?.id && (
                      <button onClick={() => handleDelete(u)} className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors">Eliminar</button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
