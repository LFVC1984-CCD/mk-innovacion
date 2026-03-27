'use client'
import { useState } from 'react'
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
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    if (!confirm('¿Cerrar sesión?')) return
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* Topbar */}
      <header className="sticky top-0 z-50 hero-gradient h-[52px] flex items-center justify-between px-4 sm:px-6 shadow-lg shadow-black/10">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1">
            <span className={`w-5 h-0.5 bg-white transition-all ${mobileOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <span className={`w-5 h-0.5 bg-white transition-all ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`w-5 h-0.5 bg-white transition-all ${mobileOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </button>

          <Link href="/comites" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded bg-[#E8000D] flex items-center justify-center font-condensed font-black text-white text-xs leading-none select-none group-hover:scale-110 transition-transform">
              MK
            </div>
            <span className="font-condensed text-lg font-bold text-white tracking-tight hidden sm:inline">
              Portal de <span className="text-gold">Comités</span>
            </span>
          </Link>

          {/* Desktop nav */}
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
        <button onClick={handleLogout}
          className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-white/70 px-3 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-white/10 hover:text-white transition-all">
          <span className="w-[7px] h-[7px] rounded-full bg-success" />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </button>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden hero-gradient border-b border-white/10 px-4 py-3 flex flex-wrap gap-1.5 z-40">
          {NAV.map(n => {
            const active = n.exact ? pathname === n.href : pathname.startsWith(n.href)
            return (
              <Link key={n.href} href={n.href} onClick={() => setMobileOpen(false)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border ${
                  active
                    ? 'bg-cobalt border-cobalt text-white'
                    : 'border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                }`}>
                {n.label}
              </Link>
            )
          })}
        </div>
      )}

      <ToastContainer />
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  )
}
