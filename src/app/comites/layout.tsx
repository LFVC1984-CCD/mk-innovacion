'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { applyOrgTheme, THEME_PRESETS } from '@/lib/theme'
import ToastContainer from '@/components/ui/Toast'

// ── Sidebar module structure ──
interface NavItem {
  href: string
  label: string
  icon: string
  badge?: number
  sub?: { href: string; label: string }[]
}

interface NavSection {
  title: string
  items: NavItem[]
}

const SIDEBAR_SECTIONS: NavSection[] = [
  {
    title: 'Principal',
    items: [
      { href: '/comites', label: 'Dashboard', icon: '◉' },
      { href: '/comites/reuniones-obra', label: 'Reuniones', icon: '◎', sub: [
        { href: '/comites/reuniones-obra', label: 'Obra–Gerencia' },
      ] },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { href: '/comites/proyectos', label: 'Proyectos', icon: '▣' },
      { href: '/comites/equipos', label: 'Equipos', icon: '◫' },
      { href: '/comites/historial', label: 'Historial', icon: '▤' },
    ],
  },
  {
    title: 'Administración',
    items: [
      { href: '/comites/usuarios', label: 'Usuarios', icon: '◑' },
    ],
  },
]

// ── Area tabs (comité areas) ──
const AREA_TABS = [
  { href: '/comites/finanzas', label: 'Finanzas', id: 'finanzas' },
  { href: '/comites/obras', label: 'Obras', id: 'obras' },
  { href: '/comites/estudios', label: 'Estudios', id: 'estudios' },
  { href: '/comites/legal', label: 'Legal', id: 'legal' },
  { href: '/comites/prevencion', label: 'Prevención', id: 'prevencion' },
  { href: '/comites/rrhh', label: 'RRHH', id: 'rrhh' },
  { href: '/comites/eti', label: 'ETI', id: 'eti' },
]

export default function ComitesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoutConfirm, setLogoutConfirm] = useState(false)
  const [expandedSub, setExpandedSub] = useState<string | null>(null)

  // Apply org theme
  useEffect(() => {
    applyOrgTheme(THEME_PRESETS.mk)
  }, [])

  // Close mobile sidebar on navigation
  useEffect(() => { setMobileOpen(false) }, [pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Is current route an area page?
  const isAreaPage = pathname.match(/^\/comites\/(finanzas|obras|estudios|legal|prevencion|rrhh|eti)/) ||
    pathname.match(/^\/comites\/[a-f0-9-]+/)
  const isAmpliadoPage = pathname.startsWith('/comites/ampliado')

  function isActive(href: string) {
    if (href === '/comites') return pathname === '/comites'
    return pathname.startsWith(href)
  }

  // ── Sidebar content (shared between desktop and mobile drawer) ──
  function SidebarContent() {
    return (
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="px-4 py-4 flex items-center gap-3 border-b" style={{ borderColor: 'var(--org-sidebar-border)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-condensed font-black text-white text-sm select-none"
            style={{ background: 'var(--org-primary)' }}>
            MK
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--org-sidebar-text)' }}>MK Ingeniería</p>
              <p className="text-[10px] truncate" style={{ color: '#9CA3AF' }}>Portal de Comités</p>
            </div>
          )}
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {SIDEBAR_SECTIONS.map(section => (
            <div key={section.title} className="mb-3">
              {!sidebarCollapsed && (
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>
                  {section.title}
                </p>
              )}
              {section.items.map(item => {
                const active = isActive(item.href)
                const hasSub = item.sub && item.sub.length > 0
                const isExpanded = expandedSub === item.href
                return (
                  <div key={item.href}>
                    <Link href={item.href}
                      onClick={(e) => {
                        if (hasSub) {
                          e.preventDefault()
                          setExpandedSub(isExpanded ? null : item.href)
                          router.push(item.href)
                        }
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all relative group"
                      style={{
                        background: active ? 'var(--org-sidebar-active-bg)' : undefined,
                        color: active ? 'var(--org-primary)' : 'var(--org-sidebar-text)',
                        fontWeight: active ? 600 : 500,
                        borderLeft: active ? '3px solid var(--org-primary)' : '3px solid transparent',
                        marginLeft: '-2px',
                      }}>
                      <span className="text-base opacity-60 group-hover:opacity-100 transition-opacity">{item.icon}</span>
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white min-w-[20px] text-center"
                              style={{ background: 'var(--org-primary)' }}>{item.badge}</span>
                          )}
                          {hasSub && (
                            <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded || active ? 'rotate-90' : ''}`}
                              style={{ color: '#9CA3AF' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </>
                      )}
                    </Link>
                    {/* Sub-items */}
                    {hasSub && (isExpanded || active) && !sidebarCollapsed && (
                      <div className="ml-6 mt-0.5 space-y-0.5">
                        {item.sub!.map(sub => (
                          <Link key={sub.href} href={sub.href}
                            className="block px-3 py-1.5 rounded-md text-[12px] transition-colors"
                            style={{
                              color: pathname === sub.href ? 'var(--org-primary)' : '#6B7280',
                              fontWeight: pathname === sub.href ? 600 : 400,
                              background: pathname === sub.href ? 'var(--org-sidebar-active-bg)' : undefined,
                            }}>
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Project selector at bottom */}
        <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--org-sidebar-border)' }}>
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'var(--org-primary-light)' }}>
              <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'var(--org-primary)' }}>N</div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold truncate" style={{ color: 'var(--org-primary)' }}>NEGRETPAR002</p>
                <p className="text-[9px] truncate" style={{ color: '#9CA3AF' }}>MK Ingeniería</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 mx-auto rounded flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'var(--org-primary)' }}>N</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#F9FAFB' }}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[500] focus:bg-cobalt focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-bold">
        Ir al contenido principal
      </a>

      {/* ── Sidebar Desktop ── */}
      <aside className={`hidden lg:flex flex-col fixed top-0 left-0 h-screen z-40 transition-all ${sidebarCollapsed ? 'w-[64px]' : 'w-[240px]'}`}
        style={{
          background: 'var(--org-sidebar-bg)',
          borderRight: '1px solid var(--org-sidebar-border)',
          boxShadow: '1px 0 4px rgba(0,0,0,0.04)',
        }}>
        <SidebarContent />
        {/* Collapse toggle */}
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-white border flex items-center justify-center text-[10px] text-slate shadow-sm hover:shadow-md transition-shadow z-50"
          style={{ borderColor: 'var(--org-sidebar-border)' }}>
          {sidebarCollapsed ? '→' : '←'}
        </button>
      </aside>

      {/* ── Mobile Drawer Overlay ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[280px] shadow-xl"
            style={{ background: 'var(--org-sidebar-bg)' }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main area ── */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all ${sidebarCollapsed ? 'lg:ml-[64px]' : 'lg:ml-[240px]'}`}>

        {/* ── Header ── */}
        <header className="sticky top-0 z-30 h-[52px] flex items-center justify-between px-4 sm:px-6 border-b"
          style={{ background: 'var(--org-header-bg)', borderColor: 'var(--org-sidebar-border)' }}>
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden w-8 h-8 flex flex-col items-center justify-center gap-1">
              <span className="w-5 h-0.5 bg-ink" />
              <span className="w-5 h-0.5 bg-ink" />
              <span className="w-5 h-0.5 bg-ink" />
            </button>

            {/* Breadcrumb / title */}
            <div className="flex items-center gap-2">
              <span className="font-condensed text-base font-bold" style={{ color: '#111827' }}>Portal de Comités</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'var(--org-primary-light)', color: 'var(--org-primary)' }}>MK</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Ampliado button */}
            <Link href="/comites/ampliado"
              className="text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all"
              style={{
                borderColor: isAmpliadoPage ? 'var(--org-primary)' : 'var(--org-sidebar-border)',
                background: isAmpliadoPage ? 'var(--org-primary)' : 'white',
                color: isAmpliadoPage ? 'white' : 'var(--org-sidebar-text)',
              }}>
              Ampliado
            </Link>
            {/* Logout */}
            <button onClick={() => setLogoutConfirm(true)}
              className="flex items-center gap-1.5 bg-white border px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:bg-gray-50"
              style={{ borderColor: 'var(--org-sidebar-border)', color: 'var(--org-sidebar-text)' }}>
              <span className="w-[7px] h-[7px] rounded-full bg-success" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        {/* ── Area tabs (pill style) ── */}
        {(isAreaPage || pathname === '/comites') && (
          <div className="px-4 sm:px-6 py-2.5 flex gap-1.5 overflow-x-auto border-b"
            style={{ background: 'var(--org-header-bg)', borderColor: 'var(--org-sidebar-border)' }}>
            {AREA_TABS.map(tab => {
              const active = pathname.startsWith(tab.href) || pathname.includes(tab.id)
              return (
                <Link key={tab.id} href={tab.href}
                  className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all shrink-0"
                  style={{
                    background: active ? 'var(--org-tab-active-bg)' : 'white',
                    color: active ? 'var(--org-tab-active-text)' : '#6B7280',
                    boxShadow: active ? `0 2px 8px rgba(var(--org-primary-rgb), 0.25)` : 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05))',
                    border: active ? 'none' : '1px solid var(--org-sidebar-border)',
                  }}>
                  {tab.label}
                </Link>
              )
            })}
          </div>
        )}

        {/* ── Content ── */}
        <ToastContainer />
        <main id="main-content" className="flex-1 px-4 sm:px-6 py-5">
          <div className="max-w-[1100px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* ── Logout confirmation modal ── */}
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
