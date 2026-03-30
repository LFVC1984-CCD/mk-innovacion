'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/comites/hooks'
import type { PermisoModulo } from '@/lib/comites/hooks'
import { toast } from '@/components/ui/Toast'
import { AREA_NAMES, AREA_COLORS, type AreaId } from '@/lib/types'
import Modal, { Field, Input, Select, Row2, Btn, Divider } from '@/components/comites/Modal'

interface UserRow {
  id: string
  nombre: string
  cargo: string | null
  area_id: AreaId
  color: string
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

export default function UsuariosPage() {
  const { loading: authLoading, isAdmin, supabase } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>([])
  const [permisosMap, setPermisosMap] = useState<Record<string, PermisoModulo[]>>({})
  const [loading, setLoading] = useState(true)

  // Modal state — click on card opens this
  const [editUser, setEditUser] = useState<UserRow | 'new' | null>(null)
  const [form, setForm] = useState({ email: '', password: '', nombre: '', cargo: '', area_id: 'viewer' as AreaId })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (!authLoading && !isAdmin) router.push('/comites') }, [authLoading, isAdmin, router])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const [usersRes, permRes] = await Promise.all([
      supabase.from('perfiles').select('*').order('nombre'),
      supabase.from('permisos_usuario').select('user_id, modulo, nivel'),
    ])
    setUsers((usersRes.data as UserRow[]) || [])
    const map: Record<string, PermisoModulo[]> = {}
    for (const p of (permRes.data || []) as { user_id: string; modulo: string; nivel: 'lectura' | 'edicion' }[]) {
      if (!map[p.user_id]) map[p.user_id] = []
      map[p.user_id].push({ modulo: p.modulo, nivel: p.nivel })
    }
    setPermisosMap(map)
    setLoading(false)
  }, [supabase])

  useEffect(() => { if (isAdmin) loadUsers() }, [isAdmin, loadUsers])

  function openNew() {
    setForm({ email: '', password: '', nombre: '', cargo: '', area_id: 'viewer' })
    setEditUser('new')
  }

  function openEdit(u: UserRow) {
    setForm({ email: '', password: '', nombre: u.nombre, cargo: u.cargo || '', area_id: u.area_id })
    setEditUser(u)
  }

  async function handleSave() {
    setSaving(true)
    if (editUser === 'new') {
      if (!form.email || !form.password || !form.nombre) { setSaving(false); return }
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, nombre: form.nombre, cargo: form.cargo || null, area_id: form.area_id, color: AREA_COLORS[form.area_id] || '#0B5ED7' }),
      })
      if (res.ok) { toast('Usuario creado'); setEditUser(null); await loadUsers() }
      else { const err = await res.json(); toast(`Error: ${err.error}`) }
    } else if (editUser) {
      await supabase.from('perfiles').update({ nombre: form.nombre, cargo: form.cargo || null, area_id: form.area_id, color: AREA_COLORS[form.area_id] || '#0B5ED7' }).eq('id', editUser.id)
      toast('Perfil actualizado'); setEditUser(null); await loadUsers()
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (typeof editUser !== 'object' || !editUser) return
    if (!confirm(`¿Eliminar a ${editUser.nombre}?`)) return
    const res = await fetch('/api/usuarios', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editUser.id }) })
    if (res.ok) { toast('Usuario eliminado'); setEditUser(null); await loadUsers() }
    else { const err = await res.json(); toast(`Error: ${err.error}`) }
  }

  async function togglePermiso(userId: string, modulo: string, nivel: 'lectura' | 'edicion' | null) {
    if (nivel === null) {
      await supabase.from('permisos_usuario').delete().eq('user_id', userId).eq('modulo', modulo)
    } else {
      await supabase.from('permisos_usuario').upsert({ user_id: userId, modulo, nivel }, { onConflict: 'user_id,modulo' })
    }
    await loadUsers()
  }

  if (authLoading || loading) return <div className="flex items-center justify-center py-20"><div className="text-slate text-sm">Cargando...</div></div>
  if (!isAdmin) return null

  const editingUser = typeof editUser === 'object' && editUser !== null ? editUser : null
  const editingPermisos = editingUser ? (permisosMap[editingUser.id] || []) : []

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-condensed font-black text-2xl" style={{ color: 'var(--org-primary)' }}>Usuarios</h1>
          <p className="text-xs text-slate">{users.length} usuario{users.length !== 1 ? 's' : ''} · Click en tarjeta para editar</p>
        </div>
        <button onClick={openNew} className="text-white font-bold text-xs px-4 py-2 rounded-lg" style={{ background: 'var(--org-primary)' }}>+ Nuevo usuario</button>
      </div>

      {/* User cards — click abre modal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {users.map(u => {
          const userPermisos = permisosMap[u.id] || []
          return (
            <div key={u.id} onClick={() => openEdit(u)}
              className="bg-white rounded-xl border border-[#E2E8F0] p-4 cursor-pointer hover:shadow-md hover:border-cobalt/30 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-condensed font-bold text-base shrink-0"
                  style={{ background: AREA_COLORS[u.area_id] || '#94A3B8' }}>
                  {u.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink truncate">{u.nombre}</p>
                  <p className="text-[11px] text-slate">{u.cargo || 'Sin cargo'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                  style={{ background: `${AREA_COLORS[u.area_id]}15`, color: AREA_COLORS[u.area_id] }}>
                  {u.area_id === 'admin' ? 'Administrador' : u.area_id === 'viewer' ? 'Solo lectura' : AREA_NAMES[u.area_id] || u.area_id}
                </span>
              </div>
              {/* Permisos badges */}
              {u.area_id !== 'admin' && userPermisos.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {userPermisos.map(p => (
                    <span key={p.modulo} className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: p.nivel === 'edicion' ? 'var(--org-primary-light)' : '#F0FDF4', color: p.nivel === 'edicion' ? 'var(--org-primary)' : '#16A34A' }}>
                      {MODULOS.find(m => m.id === p.modulo)?.label || p.modulo} {p.nivel === 'edicion' ? '✎' : '👁'}
                    </span>
                  ))}
                </div>
              )}
              {u.area_id !== 'admin' && userPermisos.length === 0 && (
                <p className="text-[10px] text-[#CBD5E1] italic">Sin permisos asignados</p>
              )}
            </div>
          )
        })}
      </div>

      {/* ═══ MODAL EDICIÓN ═══ */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)}
        title={editUser === 'new' ? 'Nuevo usuario' : 'Editar usuario'}
        accent={editingUser?.nombre}
        footer={
          <>
            {editingUser && <Btn variant="danger" onClick={handleDelete}>Eliminar</Btn>}
            <div className="flex-1" />
            <Btn onClick={() => setEditUser(null)}>Cancelar</Btn>
            <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : editUser === 'new' ? 'Crear usuario' : 'Guardar'}</Btn>
          </>
        }>
        {/* Datos del usuario */}
        {editUser === 'new' && (
          <Row2>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="usuario@empresa.cl" />
            </Field>
            <Field label="Contraseña temporal">
              <Input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 6 caracteres" />
            </Field>
          </Row2>
        )}
        <Row2>
          <Field label="Nombre completo">
            <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre Apellido" />
          </Field>
          <Field label="Cargo">
            <Select value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}>
              <option value="">Seleccionar cargo</option>
              {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </Row2>
        <Field label="Rol base">
          <Select value={form.area_id} onChange={e => setForm(f => ({ ...f, area_id: e.target.value as AreaId }))}>
            <option value="admin">Administrador (acceso total)</option>
            <option value="viewer">Usuario (permisos por modulo)</option>
          </Select>
        </Field>

        {/* Permisos por módulo — solo para no-admin */}
        {editingUser && editingUser.area_id !== 'admin' && form.area_id !== 'admin' && (
          <>
            <Divider label="Permisos por modulo" />
            <div className="flex gap-1.5 mb-3">
              <button type="button" onClick={async () => { for (const m of MODULOS) await togglePermiso(editingUser.id, m.id, 'lectura') }}
                className="text-[10px] font-bold px-2.5 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100">Lectura en todos</button>
              <button type="button" onClick={async () => { for (const m of MODULOS) await togglePermiso(editingUser.id, m.id, 'edicion') }}
                className="text-[10px] font-bold px-2.5 py-1 rounded text-white" style={{ background: 'var(--org-primary)' }}>Edicion en todos</button>
              <button type="button" onClick={async () => { for (const m of MODULOS) await togglePermiso(editingUser.id, m.id, null) }}
                className="text-[10px] font-bold px-2.5 py-1 rounded bg-[#F1F5F9] text-slate">Quitar todos</button>
            </div>
            {['Comités', 'Gestión', 'Admin'].map(group => (
              <div key={group} className="mb-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">{group}</p>
                <div className="space-y-1">
                  {MODULOS.filter(m => m.group === group).map(mod => {
                    const perm = editingPermisos.find(p => p.modulo === mod.id)
                    const nivel = perm?.nivel || ''
                    return (
                      <div key={mod.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F9FAFB] border border-[#E2E8F0]">
                        <span className="text-[12px] font-medium text-ink flex-1">{mod.label}</span>
                        <select value={nivel}
                          onChange={e => togglePermiso(editingUser.id, mod.id, e.target.value === '' ? null : e.target.value as 'lectura' | 'edicion')}
                          className="text-[11px] font-semibold rounded border px-2 py-1 cursor-pointer outline-none"
                          style={{
                            borderColor: nivel === 'edicion' ? 'var(--org-primary)' : nivel === 'lectura' ? '#16A34A' : '#E2E8F0',
                            color: nivel === 'edicion' ? 'var(--org-primary)' : nivel === 'lectura' ? '#16A34A' : '#9CA3AF',
                            background: nivel === 'edicion' ? 'var(--org-primary-light)' : nivel === 'lectura' ? '#F0FDF4' : 'white',
                          }}>
                          <option value="">Sin acceso</option>
                          <option value="lectura">Lectura</option>
                          <option value="edicion">Edicion</option>
                        </select>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </>
        )}
        {form.area_id === 'admin' && editingUser && (
          <p className="text-[11px] text-slate mt-2 p-3 bg-[#F9FAFB] rounded-lg">El administrador tiene acceso total a todos los modulos. No necesita permisos individuales.</p>
        )}
      </Modal>
    </>
  )
}
