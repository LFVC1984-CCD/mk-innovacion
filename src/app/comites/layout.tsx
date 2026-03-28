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
  { href: '/comites/historial', label: 'Historial', exact: false },
  { href: '/comites/usuarios', label: 'Usuarios', exact: false },
]

export default function ComitesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoutConfirm, setLogoutConfirm] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[500] focus:bg-cobalt focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-bold">
        Ir al contenido principal
      </a>
      {/* Topbar — estilo luminoso como HTML publicado */}
      <header className="sticky top-0 z-50 bg-white h-[52px] flex items-center justify-between px-4 sm:px-6 border-b-2 border-cobalt shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1">
            <span className={`w-5 h-0.5 bg-ink transition-all ${mobileOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <span className={`w-5 h-0.5 bg-ink transition-all ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`w-5 h-0.5 bg-ink transition-all ${mobileOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </button>

          <Link href="/comites" className="flex items-center gap-2.5 group">
            <div className="w-1 h-[30px] rounded bg-gold" />
            <div className="w-7 h-7 rounded bg-[#E8000D] flex items-center justify-center font-condensed font-black text-white text-xs leading-none select-none group-hover:scale-110 transition-transform">
              MK
            </div>
            <span className="font-condensed text-lg font-bold text-cobalt tracking-tight hidden sm:inline">
              Portal de <span className="text-gold">Comités</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-1 ml-2">
            {NAV.map(n => {
              const active = n.exact ? pathname === n.href : pathname.startsWith(n.href)
              return (
                <Link key={n.href} href={n.href}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    active
                      ? 'bg-cobalt border-cobalt text-white'
                      : 'border-transparent text-slate hover:text-cobalt hover:bg-[#EFF6FF]'
                  }`}>
                  {n.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <button onClick={() => setLogoutConfirm(true)}
          className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] text-slate px-3 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-[#F1F5F9] hover:text-ink transition-all">
          <span className="w-[7px] h-[7px] rounded-full bg-success" />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </button>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-[#E2E8F0] px-4 py-3 flex flex-wrap gap-1.5 z-40 shadow-sm">
          {NAV.map(n => {
            const active = n.exact ? pathname === n.href : pathname.startsWith(n.href)
            return (
              <Link key={n.href} href={n.href} onClick={() => setMobileOpen(false)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border ${
                  active
                    ? 'bg-cobalt border-cobalt text-white'
                    : 'border-[#E2E8F0] text-slate hover:text-cobalt hover:bg-[#EFF6FF]'
                }`}>
                {n.label}
              </Link>
            )
          })}
        </div>
      )}

      <ToastContainer />
      <main id="main-content" className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>

      {/* Logout confirmation modal */}
      {logoutConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-md" onClick={() => setLogoutConfirm(false)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="logout-title"
            className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-[360px] p-6 ring-1 ring-black/5" onClick={e => e.stopPropagation()}>
            <h3 id="logout-title" className="font-condensed text-lg font-extrabold text-ink">¿Cerrar sesión?</h3>
            <p className="text-xs text-slate mt-1 mb-5">Saldrás del portal de comités. Podrás volver a ingresar con tu cuenta.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setLogoutConfirm(false)}
                className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-semibold hover:bg-[#F1F5F9] transition-colors">
                Cancelar
              </button>
              <button onClick={handleLogout}
                className="px-4 py-2 bg-danger border border-danger text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
