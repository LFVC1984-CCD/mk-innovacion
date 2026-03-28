'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Perfil } from '@/lib/types'
import { AREA_NAMES } from '@/lib/types'

interface Props {
  perfil: Perfil | null
  breadcrumbs?: { label: string; href?: string }[]
}

export default function TopBar({ perfil, breadcrumbs }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  async function handleLogout() {
    if (!confirm('¿Cerrar sesión?')) return
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isPresentacion = pathname.startsWith('/presentacion')

  return (
    <header className="bg-white border-b-2 border-cobalt px-5 flex items-center justify-between sticky top-0 z-50 h-[52px]" style={{ boxShadow: '0 1px 6px rgba(0,0,0,.07)' }}>
      <div className="flex items-center gap-2">
        <div className="w-1 h-7 bg-gold rounded-sm" />
        <Link href="/comites" className="font-condensed font-black text-cobalt text-lg hover:opacity-80">
          Portal de <span className="text-gold">Comités</span>
        </Link>

        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1.5 ml-2 text-xs">
            {breadcrumbs.map((bc, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="text-slate-300">/</span>
                {bc.href ? (
                  <Link href={bc.href} className="text-slate-500 hover:text-cobalt">{bc.label}</Link>
                ) : (
                  <span className="text-ink font-semibold">{bc.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Link href="/presentacion" className={`px-3 py-1.5 rounded text-xs font-semibold border transition-all ${isPresentacion ? 'bg-cobalt text-white border-cobalt' : 'border-slate-200 text-slate-500 hover:border-cobalt hover:text-cobalt'}`}>
          Presentación
        </Link>
        <Link href="/comites" className={`px-3 py-1.5 rounded text-xs font-semibold border transition-all ${pathname.startsWith('/comites') ? 'bg-cobalt text-white border-cobalt' : 'border-slate-200 text-slate-500 hover:border-cobalt hover:text-cobalt'}`}>
          Comités
        </Link>

        {perfil?.area_id === 'admin' && (
          <Link href="/usuarios" className="px-3 py-1.5 rounded text-xs font-semibold border border-slate-200 text-slate-500 hover:border-cobalt hover:text-cobalt transition-all">
            Usuarios
          </Link>
        )}

        {perfil && (
          <button onClick={handleLogout} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 text-xs font-semibold text-slate-500 hover:text-cobalt transition-all">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {AREA_NAMES[perfil.area_id] || perfil.area_id}
          </button>
        )}
      </div>
    </header>
  )
}
