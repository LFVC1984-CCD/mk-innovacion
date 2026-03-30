import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Use server client (with cookies) to verify the caller
  const serverClient = createServerSupabase()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: perfil } = await serverClient.from('perfiles').select('area_id').eq('id', user.id).single()
  if (perfil?.area_id !== 'admin') return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  // Use service role client for admin operations
  const supabase = createServiceRoleClient()

  const body = await req.json()
  const { email, password, nombre, area_id, color } = body

  if (!email || !password || !nombre || !area_id) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Create auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authErr || !authData.user) {
    return NextResponse.json({ error: authErr?.message || 'Error creando usuario' }, { status: 400 })
  }

  // Create profile
  const { error: profErr } = await supabase.from('perfiles').insert({
    id: authData.user.id,
    nombre,
    area_id,
    color: color || '#0B5ED7',
  })

  if (profErr) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: profErr.message }, { status: 400 })
  }

  return NextResponse.json({ id: authData.user.id })
}

export async function DELETE(req: NextRequest) {
  const serverClient = createServerSupabase()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: perfil } = await serverClient.from('perfiles').select('area_id').eq('id', user.id).single()
  if (perfil?.area_id !== 'admin') return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  const supabase = createServiceRoleClient()
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  if (id === user.id) return NextResponse.json({ error: 'No puedes eliminarte' }, { status: 400 })

  await supabase.from('permisos_usuario').delete().eq('user_id', id)
  await supabase.from('perfiles').delete().eq('id', id)
  const { error } = await supabase.auth.admin.deleteUser(id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
