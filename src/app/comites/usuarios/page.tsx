'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/comites/hooks'
import type { PermisoModulo } from '@/lib/comites/hooks'
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

const MODULOS: { id: string; label: string; group: string }[] = [
  { id: 'finanzas', label: 'Finanzas', group: 'Comités' },
  { id: 'obras', label: 'Obras', group: 'Comités' },
  { id: 'estudios', label: 'Estudios', group: 'Comités' },
  { id: 'legal', label: 'Legal', group: 'Comités' },
  { id: 'prevencion', label: 'Prevención', group: 'Comités' },
  { id: 'rrhh', label: 'RRHH', group: 'Comités' },
  { id: 'eti', label: 'ETI', group: 'Comités' },
  { id: 'reuniones', label: 'Reuniones', group: 'Gestión' },
  { id: 'proyectos', label: 'Proyectos', group: 'Gestión' },
  { id: 'equipos', label: 'Equipos', group: 'Gestión' },
  { id: 'historial', label: 'Historial', group: 'Gestión' },
  { id: 'usuarios', label: 'Usuarios', group: 'Admin' },
]

const CARGOS = ['Gerente General', 'Administrador de Obra', 'Jefe Oficina Técnica', 'Jefe de Terreno', 'Prevencionista', 'Profesional', 'Analista', 'Asistente', 'Otro']

const ROLES: { id: AreaId; name: string }[] = [
  { id: 'admin', name: 'Administrador (acceso total)' },
  { id: 'viewer', name: 'Solo lectura (base)' },
]

export default function UsuariosPage() {
  const { loading: authLoading, isAdmin, supabase } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>([])
  const [permisosMap, setPermisosMap] = useState<Record<string, PermisoModulo[]>>({})
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [permisosEditId, setPermisosEditId] = useState<string | null>(null)

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
  }, [authLoading, isAdmin, router])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const [usersRes, permRes] = await Promise.all([
      supabase.from('perfiles').select('*').order('nombre'),
      supabase.from('permisos_usuario').select('user_id, modulo, nivel'),
    ])
    setUsers((usersRes.data as UserRow[]) || [])
    // Group permisos by user_id
    const map: Record<string, PermisoModulo[]> = {}
    for (const p of (permRes.data || []) as { user_id: string; modulo: string; nivel: 'lectura' | 'edicion' }[]) {
      if (!map[p.user_id]) map[p.user_id] = []
      map[p.user_id].push({ modulo: p.modulo, nivel: p.nivel })
    }
    setPermisosMap(map)
    setLoading(false)
  }, [supabase])

  useEffect(() => { if (isAdmin) loadUsers() }, [isAdmin, loadUsers])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail || !newPassword || !newNombre) return
    setCreating(true)
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, password: newPassword, nombre: newNombre, cargo: newCargo || null, area_id: newArea, color: AREA_COLORS[newArea] || '#0B5ED7' }),
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
    setEditId(u.id); setEditNombre(u.nombre); setEditCargo(u.cargo || ''); setEditArea(u.area_id)
  }

  async function handleSaveEdit() {
    if (!editId) return
    setSaving(true)
    await supabase.from('perfiles').update({ nombre: editNombre, cargo: editCargo || null, area_id: editArea, color: AREA_COLORS[editArea] || '#0B5ED7' }).eq('id', editId)
    toast('Perfil actualizado'); setEditId(null); await loadUsers()
    setSaving(false)
  }

  async function handleDelete(u: UserRow) {
    if (!confirm(`¿Eliminar a ${u.nombre}?`)) return
    const res = await fetch('/api/usuarios', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id }) })
    if (res.ok) { toast('Usuario eliminado'); await loadUsers() }
    else { const err = await res.json(); toast(`Error: ${err.error}`) }
  }

  // ── Permisos toggle ──
  async function togglePermiso(userId: string, modulo: string, nivel: 'lectura' | 'edicion' | null) {
    if (nivel === null) {
      // Remove
      await supabase.from('permisos_usuario').delete().eq('user_id', userId).eq('modulo', modulo)
    } else {
      // Upsert
      await supabase.from('permisos_usuario').upsert({ user_id: userId, modulo, nivel }, { onConflict: 'user_id,modulo' })
    }
    await loadUsers()
  }

  if (authLoading || loading) return <div className="flex items-center justify-center py-20"><div className="text-slate text-sm">Cargando...</div></div>
  if (!isAdmin) return null

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-condensed font-black text-2xl" style={{ color: 'var(--org-primary)' }}>Usuarios</h1>
          <p className="text-xs text-slate">{users.length} usuario{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="text-white font-bold text-xs px-4 py-2 rounded-lg" style={{ background: 'var(--org-primary)' }}>+ Nuevo usuario</button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white border border-[#E2E8F0] rounded-xl p-4 mb-4" style={{ borderLeftWidth: 3, borderLeftColor: 'var(--org-primary)' }}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate mb-3">Crear usuario</p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" placeholder="Email" required className="inp" />
            <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="text" placeholder="Contraseña temporal" required minLength={6} className="inp" />
            <input value={newNombre} onChange={e => setNewNombre(e.target.value)} type="text" placeholder="Nombre completo" required className="inp" />
            <select value={newCargo} onChange={e => setNewCargo(e.target.value)} className="inp">
              <option value="">Cargo</option>
              {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select value={newArea} onChange={e => setNewArea(e.target.value as AreaId)} className="inp" style={{ width: 'auto' }}>
              {ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <div className="flex-1" />
            <button type="submit" disabled={creating} className="px-4 py-2 text-white text-xs font-bold rounded-lg disabled:opacity-50" style={{ background: 'var(--org-primary)' }}>{creating ? 'Creando...' : 'Crear'}</button>
            <button type="button" onClick={() => setShowCreate(false)} className="text-xs text-slate hover:text-ink">Cancelar</button>
          </div>
        </form>
      )}

      {/* User list */}
      <div className="space-y-2">
        {users.map(u => {
          const userPermisos = permisosMap[u.id] || []
          const isEditing = editId === u.id
          const showPermisos = permisosEditId === u.id

          return (
            <div key={u.id} className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
              {/* User row */}
              <div className="px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-condensed font-bold text-sm shrink-0"
                  style={{ background: AREA_COLORS[u.area_id] || '#94A3B8' }}>
                  {u.nombre.charAt(0).toUpperCase()}
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <input value={editNombre} onChange={e => setEditNombre(e.target.value)} className="inp" style={{ width: 180 }} />
                    <select value={editCargo} onChange={e => setEditCargo(e.target.value)} className="inp" style={{ width: 'auto' }}>
                      <option value="">Cargo</option>
                      {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={editArea} onChange={e => setEditArea(e.target.value as AreaId)} className="inp" style={{ width: 'auto' }}>
                      {ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <button onClick={handleSaveEdit} disabled={saving} className="text-xs font-bold hover:underline" style={{ color: 'var(--org-primary)' }}>Guardar</button>
                    <button onClick={() => setEditId(null)} className="text-xs text-slate">Cancelar</button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-ink">{u.nombre}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style={{ background: `${AREA_COLORS[u.area_id]}15`, color: AREA_COLORS[u.area_id] }}>
                          {u.area_id === 'admin' ? 'Admin' : u.area_id === 'viewer' ? 'Lectura' : AREA_NAMES[u.area_id] || u.area_id}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate">{u.cargo || 'Sin cargo'}</p>
                      {/* Permisos badges */}
                      {u.area_id !== 'admin' && userPermisos.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {userPermisos.map(p => (
                            <span key={p.modulo} className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: p.nivel === 'edicion' ? 'var(--org-primary-light)' : '#F1F5F9', color: p.nivel === 'edicion' ? 'var(--org-primary)' : '#6B7280' }}>
                              {MODULOS.find(m => m.id === p.modulo)?.label || p.modulo} {p.nivel === 'edicion' ? '✎' : '👁'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {u.area_id !== 'admin' && (
                        <button onClick={() => setPermisosEditId(showPermisos ? null : u.id)}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${showPermisos ? 'border-transparent text-white' : 'border-[#E2E8F0] text-slate hover:text-ink'}`}
                          style={showPermisos ? { background: 'var(--org-primary)' } : undefined}>
                          Permisos
                        </button>
                      )}
                      <button onClick={() => startEdit(u)} className="text-[10px] font-bold text-slate hover:text-ink px-2 py-1">Editar</button>
                      <button onClick={() => handleDelete(u)} className="text-[10px] font-bold text-red-400 hover:text-red-600 px-2 py-1">Eliminar</button>
                    </div>
                  </>
                )}
              </div>

              {/* Permisos panel */}
              {showPermisos && u.area_id !== 'admin' && (
                <div className="px-4 py-3 border-t border-[#E2E8F0] bg-[#F9FAFB]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-2">Permisos de {u.nombre}</p>
                  {['Comités', 'Gestión', 'Admin'].map(group => {
                    const mods = MODULOS.filter(m => m.group === group)
                    return (
                      <div key={group} className="mb-2">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">{group}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                          {mods.map(mod => {
                            const perm = userPermisos.find(p => p.modulo === mod.id)
                            const nivel = perm?.nivel || null
                            return (
                              <div key={mod.id} className="flex items-center gap-1 bg-white rounded-lg border border-[#E2E8F0] px-2 py-1.5">
                                <span className="text-[11px] font-medium text-ink flex-1">{mod.label}</span>
                                <div className="flex gap-0.5">
                                  <button onClick={() => togglePermiso(u.id, mod.id, nivel === null ? 'lectura' : null)}
                                    className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center transition-all ${nivel ? 'bg-green-100 text-green-700' : 'bg-[#F1F5F9] text-[#CBD5E1]'}`}
                                    title={nivel ? 'Quitar acceso' : 'Dar lectura'}>
                                    👁
                                  </button>
                                  <button onClick={() => togglePermiso(u.id, mod.id, nivel === 'edicion' ? 'lectura' : 'edicion')}
                                    className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center transition-all ${nivel === 'edicion' ? 'text-white' : 'bg-[#F1F5F9] text-[#CBD5E1]'}`}
                                    style={nivel === 'edicion' ? { background: 'var(--org-primary)' } : undefined}
                                    title={nivel === 'edicion' ? 'Cambiar a lectura' : 'Dar edición'}>
                                    ✎
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                  <p className="text-[9px] text-slate mt-1">👁 = solo lectura · ✎ = edicion · gris = sin acceso</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
