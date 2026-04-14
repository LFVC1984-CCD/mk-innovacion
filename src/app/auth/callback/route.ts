import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/comites'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_missing_code`)
  }

  const supabase = createServerSupabase()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
