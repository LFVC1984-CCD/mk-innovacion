'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/comites', label: 'Inicio' },
  { href: '/comites/proyectos', label: 'Proyectos' },
  { href: '/comites/equipos', label: 'Equipos' },
  { href: '/comites/financiero', label: 'Obras $' },
  { href: '/comites/garantias', label: 'Garantías' },
  { href: '/comites/historial', label: 'Historial' },
]

export default function ComitesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* Topbar */}
      <header className="sticky top-0 z-50 bg-[#0F172A] h-[52px] flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/comites" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#E8000D] flex items-center justify-center font-condensed font-black text-white text-xs leading-none select-none">
              MK
            </div>
            <span className="font-condensed text-lg font-bold text-white tracking-tight">
              Portal de <span className="text-gold">Comités</span>
            </span>
          </Link>
          <nav className="hidden md:flex gap-1">
            {NAV.map(n => {
              const active = n.href === '/comites' ? pathname === '/comites' : pathname.startsWith(n.href)
              return (
                <Link key={n.href} href={n.href}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                    active
                      ? 'bg-cobalt border-cobalt text-white'
                      : 'border-white/10 text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}>
                  {n.label}
                </Link>
              )
            })}
            <Link href="/comites/usuarios"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                pathname.startsWith('/comites/usuarios')
                  ? 'bg-cobalt border-cobalt text-white'
                  : 'border-white/10 text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}>
              Usuarios
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-white px-3 py-1.5 rounded-lg text-[11px] font-semibold">
            <span className="w-[7px] h-[7px] rounded-full bg-success" />
            Portal MK
          </div>
        </div>
      </header>
      {/* Content */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  )
}
