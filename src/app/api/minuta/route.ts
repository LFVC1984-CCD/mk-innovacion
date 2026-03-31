import { createServerSupabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { AREA_NAMES } from '@/lib/types'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const { area_id, lineas, texto_completo, destinatarios } = body

  if (!area_id || !lineas || !destinatarios?.length) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Save minuta to DB
  const { data: minuta, error: dbErr } = await supabase.from('minutas').insert({
    area_id,
    fecha: new Date().toISOString().split('T')[0],
    lineas,
    texto_completo: texto_completo || null,
    enviada: true,
  }).select().single()

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 400 })
  }

  // Send email via Resend
  const areaName = AREA_NAMES[area_id] || area_id
  const now = new Date()
  const fecha = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}`

  const htmlContent = `
    <div style="font-family: 'Barlow', Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <div style="background: #0B5ED7; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; color: #fff; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
          Minuta de Comité — ${areaName}
        </h1>
        <p style="margin: 4px 0 0; color: rgba(255,255,255,.6); font-size: 12px;">${fecha} · MK Ingeniería</p>
      </div>
      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        ${texto_completo
          ? texto_completo.split('\n').map((line: string) => {
              if (line.startsWith('## ')) return `<h2 style="color:#0B5ED7; font-size:16px; margin:20px 0 8px; font-weight:700;">${line.replace('## ', '')}</h2>`
              if (line.startsWith('- ')) return `<div style="padding:2px 0 2px 12px; font-size:14px; color:#334155;">• ${line.replace('- ', '')}</div>`
              if (line.trim() === '') return '<br/>'
              return `<p style="font-size:14px; color:#334155; margin:4px 0;">${line}</p>`
            }).join('')
          : '<p style="color:#94a3b8;">Sin contenido</p>'
        }
        <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0 12px;" />
        <p style="font-size:11px; color:#94a3b8; text-align:center;">
          Enviado desde Portal de Comités MK · Generado automáticamente
        </p>
      </div>
    </div>
  `

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MK Comités <comites@mkingenieria.cl>',
        to: destinatarios,
        subject: `Minuta Comité ${areaName} — ${fecha}`,
        html: htmlContent,
      }),
    })

    if (!resendRes.ok) {
      const err = await resendRes.json()
      return NextResponse.json({ minuta_id: minuta.id, email_error: err.message || 'Error enviando email' }, { status: 207 })
    }

    return NextResponse.json({ minuta_id: minuta.id, email_sent: true })
  } catch {
    return NextResponse.json({ minuta_id: minuta.id, email_error: 'Error de red al enviar email' }, { status: 207 })
  }
}
