'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ToastContainer from '@/components/ui/Toast'

const NAV = [
  { href: '/comites', label: 'Inicio', exact: true },
  { href: '/comites/proyectos', label: 'Proyectos', exact: false },
  { href: '/comites/equipos', label: 'Equipos', exact: false },
  { href: '/comites/garantias', label: 'Garantías', exact: false },
  { href: '/comites/historial', label: 'Historial', exact: false },
  { href: '/comites/usuarios', label: 'Usuarios', exact: false },
]

export default function ComitesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    if (!confirm('¿Cerrar sesión?')) return
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* Topbar */}
      <header className="sticky top-0 z-50 hero-gradient h-[52px] flex items-center justify-between px-6 shadow-lg shadow-black/10">
        <div className="flex items-center gap-4">
          <Link href="/comites" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded bg-[#E8000D] flex items-center justify-center font-condensed font-black text-white text-xs leading-none select-none group-hover:scale-110 transition-transform">
              MK
            </div>
            <span className="font-condensed text-lg font-bold text-white tracking-tight">
              Portal de <span className="text-gold">Comités</span>
            </span>
          </Link>
          <nav className="hidden md:flex gap-1">
            {NAV.map(n => {
              const active = n.exact ? pathname === n.href : pathname.startsWith(n.href)
              return (
                <Link key={n.href} href={n.href}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    active
                      ? 'bg-cobalt border-cobalt text-white shadow-md shadow-cobalt/25'
                      : 'border-white/10 text-white/50 hover:text-white/90 hover:bg-white/8 hover:border-white/20'
                  }`}>
                  {n.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-white/70 px-3 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-white/10 hover:text-white transition-all">
            <span className="w-[7px] h-[7px] rounded-full bg-success" />
            Cerrar sesión
          </button>
        </div>
      </header>
      <ToastContainer />
      {/* Content — no page transition animation to avoid flicker */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  )
}
