import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const TIPO_LABELS: Record<string, string> = {
  seriedad_oferta: 'Seriedad de la oferta',
  fiel_cumplimiento: 'Fiel cumplimiento',
  anticipo: 'Anticipo',
  correcta_ejecucion: 'Correcta ejecución',
}

const INSTR_LABELS: Record<string, string> = {
  boleta_garantia: 'Boleta de garantía',
  poliza_garantia: 'Póliza de garantía',
  credito_comercial: 'Crédito comercial',
  factoring: 'Factoring',
  capital_trabajo: 'Capital de trabajo',
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatMonto(monto: number, divisa = 'CLP'): string {
  if (divisa === 'CLP') return `$${monto.toLocaleString('es-CL')} CLP`
  if (divisa === 'UF') return `${monto.toLocaleString('es-CL', { maximumFractionDigits: 2 })} UF`
  return `$${monto.toLocaleString('es-CL')} ${divisa}`
}

function buildRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 12px; font-size:13px; color:#64748b; font-weight:600; white-space:nowrap;">${escapeHtml(label)}</td>
    <td style="padding:6px 12px; font-size:13px; color:#1e293b;">${escapeHtml(value)}</td>
  </tr>`
}

function buildTable(rows: Array<[string, string]>): string {
  return `<table style="width:100%; border-collapse:collapse; background:#fff; border-radius:6px; overflow:hidden; border:1px solid #e2e8f0;">
    ${rows.map(([l, v]) => buildRow(l, v)).join('')}
  </table>`
}

function emailBase(title: string, subtitle: string, body: string): string {
  return `<div style="font-family:'Barlow',Arial,sans-serif;max-width:640px;margin:0 auto;">
    <div style="background:#0B5ED7;padding:20px 24px;border-radius:8px 8px 0 0;">
      <h1 style="margin:0;color:#fff;font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">
        ${escapeHtml(title)}
      </h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,.65);font-size:12px;">${escapeHtml(subtitle)}</p>
    </div>
    <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
      ${body}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0 10px;"/>
      <p style="font-size:11px;color:#94a3b8;text-align:center;margin:0;">
        Portal de Comités MK Ingeniería · Enviado automáticamente
      </p>
    </div>
  </div>`
}

function buildEmailSolicitante(data: {
  tipo: string; instrumento: string; entidad: string; monto: number; divisa?: string
  fecha_solicitud: string | null; proyecto_nombre: string; observacion: string
}): string {
  const rows: Array<[string, string]> = [
    ['Tipo', TIPO_LABELS[data.tipo] ?? data.tipo],
    ['Instrumento', INSTR_LABELS[data.instrumento] ?? data.instrumento],
    ['Entidad', data.entidad],
    ['Monto', formatMonto(data.monto, data.divisa)],
  ]
  if (data.fecha_solicitud) rows.push(['Fecha requerida', data.fecha_solicitud])
  if (data.proyecto_nombre) rows.push(['Proyecto', data.proyecto_nombre])
  if (data.observacion) rows.push(['Observaciones', data.observacion])

  const body = `
    <p style="font-size:14px;color:#334155;margin:0 0 16px;">
      Tu solicitud fue recibida y está siendo procesada por el área de Finanzas.
    </p>
    ${buildTable(rows)}
  `
  return emailBase(
    'Solicitud de boleta de garantía recibida',
    `MK Ingeniería · ${new Date().toLocaleDateString('es-CL')}`,
    body,
  )
}

function buildEmailFinanzas(data: {
  tipo: string; instrumento: string; entidad: string; monto: number; divisa?: string
  fecha_solicitud: string | null; proyecto_nombre: string; observacion: string
  solicitante_email: string
}): string {
  const rows: Array<[string, string]> = [
    ['Solicitante', data.solicitante_email],
    ['Tipo', TIPO_LABELS[data.tipo] ?? data.tipo],
    ['Instrumento', INSTR_LABELS[data.instrumento] ?? data.instrumento],
    ['Entidad', data.entidad],
    ['Monto', formatMonto(data.monto, data.divisa)],
  ]
  if (data.fecha_solicitud) rows.push(['Fecha requerida', data.fecha_solicitud])
  if (data.proyecto_nombre) rows.push(['Proyecto', data.proyecto_nombre])
  if (data.observacion) rows.push(['Observaciones', data.observacion])

  const body = `
    <p style="font-size:14px;color:#334155;margin:0 0 16px;">
      El área de Estudios ha solicitado una nueva boleta de garantía.
    </p>
    ${buildTable(rows)}
    <p style="font-size:13px;color:#64748b;margin:16px 0 0;">
      Revisar en el módulo de <strong>Finanzas → Garantías</strong>.
    </p>
  `
  return emailBase(
    `Nueva solicitud de boleta de garantía${data.proyecto_nombre ? ` — ${data.proyecto_nombre}` : ''}`,
    `MK Ingeniería · ${new Date().toLocaleDateString('es-CL')}`,
    body,
  )
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const { tipo, instrumento, entidad, monto, divisa, fecha_solicitud, observacion, proyecto_nombre } = body

  if (!tipo || !instrumento || !entidad) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()

  // Look up finanzas users' emails via service role
  const { data: perfilesFinanzas } = await serviceClient
    .from('perfiles')
    .select('id')
    .eq('area_id', 'finanzas')

  const finanzasIds = new Set((perfilesFinanzas ?? []).map((p: { id: string }) => p.id))

  const { data: { users: allUsers } } = await serviceClient.auth.admin.listUsers({ perPage: 200 })
  const finanzasEmails = allUsers
    .filter(u => finanzasIds.has(u.id) && u.email)
    .map(u => u.email as string)

  const RESEND_KEY = process.env.RESEND_API_KEY
  if (!RESEND_KEY) {
    console.error('[garantias/solicitar] RESEND_API_KEY no configurada')
    return NextResponse.json({ ok: false, error: 'Email no configurado' }, { status: 500 })
  }

  const FROM = 'MK Comités <comites@mkingenieria.cl>'
  const emailData = { tipo, instrumento, entidad, monto, divisa, fecha_solicitud, proyecto_nombre: proyecto_nombre ?? '', observacion: observacion ?? '' }
  let emailsSent = 0

  // 1. Confirmación al solicitante
  const resConfirm = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [user.email!],
      subject: 'Solicitud de boleta de garantía recibida',
      html: buildEmailSolicitante(emailData),
    }),
  })
  if (resConfirm.ok) emailsSent++

  // 2. Alerta a Finanzas
  if (finanzasEmails.length > 0) {
    const resFinanzas = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: finanzasEmails,
        subject: `Nueva solicitud de boleta de garantía${proyecto_nombre ? ` — ${proyecto_nombre}` : ''}`,
        html: buildEmailFinanzas({ ...emailData, solicitante_email: user.email! }),
      }),
    })
    if (resFinanzas.ok) emailsSent++
  }

  return NextResponse.json({ ok: true, emails_enviados: emailsSent, finanzas: finanzasEmails.length })
}
