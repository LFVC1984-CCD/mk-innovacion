'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

const NAV = [
  { href: '/comites', label: 'Inicio', icon: '◉' },
  { href: '/comites/proyectos', label: 'Proyectos', icon: '▦' },
  { href: '/comites/equipos', label: 'Equipos', icon: '◫' },
  { href: '/comites/financiero', label: 'Obras $', icon: '◈' },
  { href: '/comites/garantias', label: 'Garantías', icon: '◇' },
  { href: '/comites/historial', label: 'Historial', icon: '◷' },
]

export default function ComitesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

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
              const active = n.href === '/comites' ? pathname === '/comites' : pathname.startsWith(n.href)
              return (
                <Link key={n.href} href={n.href}
                  className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    active
                      ? 'bg-cobalt border-cobalt text-white shadow-md shadow-cobalt/25'
                      : 'border-white/10 text-white/50 hover:text-white/90 hover:bg-white/8 hover:border-white/20'
                  }`}>
                  {active && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 bg-cobalt rounded-lg"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      style={{ zIndex: -1 }}
                    />
                  )}
                  {n.label}
                </Link>
              )
            })}
            <Link href="/comites/usuarios"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                pathname.startsWith('/comites/usuarios')
                  ? 'bg-cobalt border-cobalt text-white shadow-md shadow-cobalt/25'
                  : 'border-white/10 text-white/50 hover:text-white/90 hover:bg-white/8 hover:border-white/20'
              }`}>
              Usuarios
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-white px-3 py-1.5 rounded-lg text-[11px] font-semibold">
            <span className="w-[7px] h-[7px] rounded-full bg-success animate-pulse" />
            Portal MK
          </div>
        </div>
      </header>
      {/* Content with fade-in */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}
