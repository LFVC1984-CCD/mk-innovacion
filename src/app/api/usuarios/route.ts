import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { AREA_NAMES } from '@/lib/types'

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

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (typeof email !== 'string' || !emailRegex.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }

  // Validate nombre is a non-empty string with reasonable length
  if (typeof nombre !== 'string' || nombre.trim().length < 2 || nombre.length > 100) {
    return NextResponse.json({ error: 'Nombre debe tener entre 2 y 100 caracteres' }, { status: 400 })
  }

  // Validate password minimum length
  if (typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: 'Contraseña debe tener al menos 6 caracteres' }, { status: 400 })
  }

  // Validate area_id is a known value
  const validAreas = ['admin', 'viewer', 'finanzas', 'rrhh', 'legal', 'prevencion', 'estudios', 'obras', 'eti']
  if (typeof area_id !== 'string' || !validAreas.includes(area_id)) {
    return NextResponse.json({ error: 'Área inválida' }, { status: 400 })
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

  // Send welcome email via Resend
  const RESEND_KEY = process.env.RESEND_API_KEY
  if (RESEND_KEY) {
    const origin = new URL(req.url).origin
    const redirectTo = `${origin}/auth/callback?next=/auth/reset-password`

    // Generate a direct password-reset link so the user can set their own password immediately
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })
    const resetLink = linkData?.properties?.action_link

    const areaNombre = AREA_NAMES[area_id] || area_id
    const html = buildWelcomeEmail({ nombre, email, password, areaNombre, resetLink: resetLink ?? null, origin })

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'MK Comités <comites@mkingenieria.cl>',
        to: [email],
        subject: 'Bienvenido al Portal de Comités MK Ingeniería',
        html,
      }),
    }).catch(err => console.error('[usuarios] Error enviando email de bienvenida:', err))
  }

  return NextResponse.json({ id: authData.user.id })
}

function buildWelcomeEmail({ nombre, email, password, areaNombre, resetLink, origin }: {
  nombre: string; email: string; password: string; areaNombre: string
  resetLink: string | null; origin: string
}): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const loginUrl = `${origin}/login`

  const resetSection = resetLink
    ? `<div style="text-align:center;margin:24px 0;">
        <a href="${esc(resetLink)}"
          style="display:inline-block;background:#0B5ED7;color:#fff;font-size:14px;font-weight:700;
                 padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:.3px;">
          Definir mi contraseña ahora →
        </a>
        <p style="font-size:11px;color:#94a3b8;margin:8px 0 0;">Este link expira en 24 horas</p>
      </div>`
    : `<p style="font-size:13px;color:#334155;margin:12px 0;">
        Puedes cambiar tu contraseña en cualquier momento desde
        <a href="${esc(loginUrl)}/olvide-password" style="color:#0B5ED7;">¿Olvidaste tu contraseña?</a>
        en el login.
      </p>`

  return `<div style="font-family:'Barlow',Arial,sans-serif;max-width:640px;margin:0 auto;">
    <div style="background:#0B5ED7;padding:20px 24px;border-radius:8px 8px 0 0;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#E8000D,#B8000A);
                    border-radius:8px;display:flex;align-items:center;justify-content:center;
                    font-weight:900;color:#fff;font-size:13px;flex-shrink:0;">MK</div>
        <div>
          <h1 style="margin:0;color:#fff;font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">
            Bienvenido al Portal de Comités
          </h1>
          <p style="margin:2px 0 0;color:rgba(255,255,255,.65);font-size:12px;">MK Ingeniería</p>
        </div>
      </div>
    </div>
    <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
      <p style="font-size:15px;color:#1e293b;font-weight:600;margin:0 0 4px;">Hola, ${esc(nombre)} 👋</p>
      <p style="font-size:13px;color:#334155;margin:0 0 20px;">
        Tu cuenta ha sido creada en el Portal de Comités de MK Ingeniería.
        Tienes acceso al área de <strong>${esc(areaNombre)}</strong>.
      </p>

      <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:6px;border:1px solid #e2e8f0;margin-bottom:20px;">
        <tr>
          <td style="padding:8px 14px;font-size:12px;color:#64748b;font-weight:600;white-space:nowrap;border-bottom:1px solid #f1f5f9;">Correo</td>
          <td style="padding:8px 14px;font-size:13px;color:#1e293b;border-bottom:1px solid #f1f5f9;">${esc(email)}</td>
        </tr>
        <tr>
          <td style="padding:8px 14px;font-size:12px;color:#64748b;font-weight:600;white-space:nowrap;">Contraseña provisional</td>
          <td style="padding:8px 14px;font-size:13px;color:#1e293b;font-family:monospace;letter-spacing:.5px;">${esc(password)}</td>
        </tr>
      </table>

      <div style="background:#fef9c3;border:1px solid #fde047;border-radius:6px;padding:10px 14px;margin-bottom:20px;">
        <p style="font-size:12px;color:#713f12;margin:0;font-weight:600;">
          ⚠️ Por seguridad, cambia tu contraseña en tu primer ingreso.
        </p>
      </div>

      ${resetSection}

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0 12px;"/>
      <p style="font-size:12px;color:#64748b;margin:0 0 6px;">
        Accede al portal en:
        <a href="${esc(loginUrl)}" style="color:#0B5ED7;font-weight:600;">${esc(loginUrl)}</a>
      </p>
      <p style="font-size:11px;color:#94a3b8;margin:0;">
        Portal de Comités MK Ingeniería · Enviado automáticamente
      </p>
    </div>
  </div>`
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
