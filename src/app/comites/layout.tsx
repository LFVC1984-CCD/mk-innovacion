'use client'
import { useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/comites/hooks'
import { applyOrgTheme, THEME_PRESETS } from '@/lib/theme'
import ToastContainer from '@/components/ui/Toast'

// ── Sidebar module structure ──
interface NavItem { href: string; label: string; icon: string; badge?: number; sub?: { href: string; label: string }[] }
interface NavSection { title: string; items: NavItem[] }

const SIDEBAR_SECTIONS: NavSection[] = [
  { title: 'Principal', items: [
    { href: '/comites', label: 'Comités', icon: '◉' },
    { href: '/comites/reuniones-obra', label: 'Reuniones', icon: '◎', sub: [{ href: '/comites/reuniones-obra', label: 'Obra–Gerencia' }] },
  ] },
  { title: 'Gestión', items: [
    { href: '/comites/proyectos', label: 'Proyectos', icon: '▣' },
    { href: '/comites/equipos', label: 'Equipos', icon: '◫' },
    { href: '/comites/historial', label: 'Historial', icon: '▤' },
  ] },
  { title: 'Administración', items: [
    { href: '/comites/usuarios', label: 'Usuarios', icon: '◑' },
  ] },
]

const AREA_TABS = [
  { href: '/comites/finanzas', label: 'Finanzas', id: 'finanzas' },
  { href: '/comites/obras', label: 'Obras', id: 'obras' },
  { href: '/comites/estudios', label: 'Estudios', id: 'estudios' },
  { href: '/comites/legal', label: 'Legal', id: 'legal' },
  { href: '/comites/prevencion', label: 'Prevención', id: 'prevencion' },
  { href: '/comites/rrhh', label: 'RRHH', id: 'rrhh' },
  { href: '/comites/eti', label: 'ETI', id: 'eti' },
  { href: '/comites/ampliado', label: 'Ampliado', id: 'ampliado' },
]

// ── Sub-tabs per area (second ribbon) ──
const MODULE_NAMES: Record<string, string> = {
  obras: 'Control Financiero', legal: 'Causas', prevencion: 'Seguridad',
  estudios: 'En Estudio', finanzas: 'Flujo de Caja', eti: 'Tecnología e Innovación', rrhh: 'Recursos Humanos',
}
const HAS_PANEL: string[] = ['obras', 'legal', 'prevencion', 'estudios', 'finanzas', 'eti', 'rrhh']
const HAS_GARANTIAS: string[] = ['finanzas', 'estudios']

function getSubTabs(areaId: string): { id: string; label: string }[] {
  const tabs: { id: string; label: string }[] = [
    { id: 'informe', label: 'Informe' },
    { id: 'tareas', label: 'Tareas' },
  ]
  if (HAS_PANEL.includes(areaId)) tabs.push({ id: 'modulo', label: MODULE_NAMES[areaId] || 'Módulo' })
  if (HAS_GARANTIAS.includes(areaId)) tabs.push({ id: 'garantias', label: 'Garantías' })
  tabs.push({ id: 'procedimientos', label: 'Procedimientos' })
  tabs.push({ id: 'minutas', label: 'Minutas' })
  return tabs
}

// ── Speed Dial actions per module ──
const SPEED_DIAL_ACTIONS: Record<string, { label: string; icon: string }[]> = {
  reuniones: [
    { label: 'Nueva minuta', icon: '+' },
    { label: 'Agendar reunion', icon: '▶' },
    { label: 'Compartir acta', icon: '↓' },
  ],
  default: [
    { label: 'Nuevo registro', icon: '+' },
    { label: 'Exportar', icon: '↓' },
  ],
}

// ── Profile menu items ──
const PROFILE_MENU = [
  { label: 'Mis datos', icon: '◑' },
  { label: 'Notificaciones', icon: '◎', badge: 3 },
  { label: 'Cambiar proyecto', icon: '▣' },
  { label: 'Configuracion', icon: '◫' },
]

export default function ComitesLayout({ children }: { children: React.ReactNode }) {
  return <Suspense><ComitesLayoutInner>{children}</ComitesLayoutInner></Suspense>
}

function ComitesLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { perfil } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [logoutConfirm, setLogoutConfirm] = useState(false)
  const [expandedSub, setExpandedSub] = useState<string | null>(null)
  const [fabOpen, setFabOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState<'home' | 'module' | 'profile'>('home')
  const [drawerSearch, setDrawerSearch] = useState('')

  useEffect(() => { applyOrgTheme(THEME_PRESETS.mk) }, [])
  useEffect(() => { setDrawerOpen(false); setFabOpen(false) }, [pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const searchParams = useSearchParams()
  const isAreaPage = pathname.match(/^\/comites\/(finanzas|obras|estudios|legal|prevencion|rrhh|eti|ampliado)/) || pathname.match(/^\/comites\/[a-f0-9-]+/)
  const isHome = pathname === '/comites'
  const isProfile = mobileTab === 'profile'
  const isNonAreaPage = pathname.match(/^\/comites\/(reuniones|proyectos|equipos|historial|usuarios)/)

  // Current area for sub-tabs
  const currentAreaMatch = pathname.match(/^\/comites\/([a-z]+)/)
  const currentArea = currentAreaMatch ? currentAreaMatch[1] : null
  const showSubTabs = isAreaPage && currentArea && currentArea !== 'ampliado' && !pathname.includes('/proyectar')
  const subTabs = currentArea ? getSubTabs(currentArea) : []
  const activeSubTab = searchParams.get('tab') || 'informe'

  // Current module for speed dial
  const currentModule = useMemo(() => {
    if (pathname.includes('reuniones')) return 'reuniones'
    return 'default'
  }, [pathname])

  function isActive(href: string) {
    if (href === '/comites') return pathname === '/comites'
    return pathname.startsWith(href)
  }

  // Drawer search filter
  const filteredSections = useMemo(() => {
    if (!drawerSearch.trim()) return SIDEBAR_SECTIONS
    const q = drawerSearch.toLowerCase()
    return SIDEBAR_SECTIONS.map(s => ({
      ...s,
      items: s.items.filter(i => i.label.toLowerCase().includes(q) || i.sub?.some(sub => sub.label.toLowerCase().includes(q)))
    })).filter(s => s.items.length > 0)
  }, [drawerSearch])

  // ── Shared sidebar nav ──
  function NavItems({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
    return (
      <>
        {(collapsed ? SIDEBAR_SECTIONS : filteredSections).map(section => (
          <div key={section.title} className="mb-3">
            {!collapsed && <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>{section.title}</p>}
            {section.items.map(item => {
              const active = isActive(item.href)
              const hasSub = item.sub && item.sub.length > 0
              const isExpanded = expandedSub === item.href
              return (
                <div key={item.href}>
                  <Link href={item.href}
                    onClick={(e) => {
                      if (hasSub) { e.preventDefault(); setExpandedSub(isExpanded ? null : item.href); router.push(item.href) }
                      onNavigate?.()
                    }}
                    className={`ccd-sidebar-item flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs relative group ${active ? 'active' : ''}`}
                    style={{ color: active ? undefined : 'var(--org-sidebar-text)', marginLeft: '-2px' }}>
                    <span className="text-base opacity-60 group-hover:opacity-100 transition-opacity">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white min-w-[20px] text-center" style={{ background: 'var(--org-primary)' }}>{item.badge}</span>
                        )}
                        {hasSub && (
                          <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded || active ? 'rotate-90' : ''}`} style={{ color: '#9CA3AF' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
                        )}
                      </>
                    )}
                  </Link>
                  {hasSub && (isExpanded || active) && !collapsed && (
                    <div className="ml-6 mt-0.5 space-y-0.5">
                      {item.sub!.map(sub => (
                        <Link key={sub.href} href={sub.href} onClick={() => onNavigate?.()}
                          className="block px-3 py-1.5 rounded-md text-[12px] transition-colors"
                          style={{ color: pathname === sub.href ? 'var(--org-primary)' : '#6B7280', fontWeight: pathname === sub.href ? 600 : 400, background: pathname === sub.href ? 'var(--org-sidebar-active-bg)' : undefined }}>
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
      </>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#F9FAFB' }}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[500] focus:bg-cobalt focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-bold">
        Ir al contenido principal
      </a>

      {/* ═══ SIDEBAR DESKTOP ═══ */}
      <aside className={`hidden lg:flex flex-col fixed top-0 left-0 h-screen z-40 transition-all ${sidebarCollapsed ? 'w-[64px]' : 'w-[240px]'}`}
        style={{ background: 'var(--org-sidebar-bg)', borderRight: '1px solid var(--org-sidebar-border)', boxShadow: '1px 0 4px rgba(0,0,0,0.04)' }}>
        {/* Logo */}
        <div className="px-4 py-4 flex items-center gap-3 border-b" style={{ borderColor: 'var(--org-sidebar-border)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-condensed font-black text-white text-sm select-none" style={{ background: 'var(--org-primary)' }}>MK</div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--org-sidebar-text)' }}>MK Ingeniería</p>
              <p className="text-[10px] truncate" style={{ color: '#9CA3AF' }}>Portal de Comités</p>
            </div>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          <NavItems collapsed={sidebarCollapsed} />
        </nav>
        {/* User profile + settings */}
        <div className="px-3 py-3 border-t space-y-1" style={{ borderColor: 'var(--org-sidebar-border)' }}>
          {!sidebarCollapsed ? (
            <>
              <div className="flex items-center gap-2.5 px-2 py-1.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0" style={{ background: 'var(--org-primary)' }}>
                  {perfil?.nombre?.split(' ').map(n => n[0]).slice(0, 2).join('') || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold truncate" style={{ color: 'var(--org-sidebar-text)' }}>{perfil?.nombre || 'Usuario'}</p>
                  <p className="text-[10px] truncate" style={{ color: '#9CA3AF' }}>{perfil?.cargo || perfil?.area_id || ''}</p>
                </div>
              </div>
              <div className="flex gap-1 px-1">
                <button onClick={() => setLogoutConfirm(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-colors hover:bg-red-50 text-red-500 hover:text-red-600"
                  style={{ border: '1px solid #FEE2E2' }}>
                  Salir
                </button>
              </div>
            </>
          ) : (
            <button onClick={() => setLogoutConfirm(true)} title="Cerrar sesión"
              className="w-8 h-8 mx-auto rounded-full flex items-center justify-center text-white text-[11px] font-bold hover:ring-2 hover:ring-red-300 transition-all"
              style={{ background: 'var(--org-primary)' }}>
              {perfil?.nombre?.split(' ').map(n => n[0]).slice(0, 2).join('') || '?'}
            </button>
          )}
        </div>
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-white border flex items-center justify-center text-[10px] text-slate shadow-sm hover:shadow-md transition-shadow z-50"
          style={{ borderColor: 'var(--org-sidebar-border)' }}>
          {sidebarCollapsed ? '→' : '←'}
        </button>
      </aside>

      {/* ═══ MOBILE DRAWER (hamburger) ═══ */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute left-0 top-0 h-full w-[280px] shadow-xl flex flex-col" style={{ background: 'var(--org-sidebar-bg)' }}>
              {/* Search */}
              <div className="px-3 pt-4 pb-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F3F4F6]">
                  <span className="text-[#9CA3AF] text-sm">🔍</span>
                  <input type="text" placeholder="Buscar modulo..." value={drawerSearch} onChange={e => setDrawerSearch(e.target.value)}
                    className="flex-1 bg-transparent text-xs outline-none placeholder:text-[#9CA3AF]" />
                </div>
              </div>
              {/* Nav */}
              <nav className="flex-1 overflow-y-auto py-1 px-2">
                <NavItems onNavigate={() => setDrawerOpen(false)} />
              </nav>
              {/* User card */}
              <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--org-sidebar-border)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--org-primary)' }}>FV</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--org-sidebar-text)' }}>Felipe Valenzuela</p>
                    <p className="text-[10px] truncate" style={{ color: '#9CA3AF' }}>Administrador · NEGRETPAR002</p>
                  </div>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ MAIN AREA ═══ */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all ${sidebarCollapsed ? 'lg:ml-[64px]' : 'lg:ml-[240px]'}`}>

        {/* ── Sticky header block: header + comité tabs + sub-tabs ── */}
        <div className="sticky top-0 z-30">
          {/* Row 1: Header */}
          <div className="h-[48px] flex items-center justify-between px-4 sm:px-6 border-b"
            style={{ background: 'var(--org-header-bg)', borderColor: 'var(--org-sidebar-border)' }}>
            <div className="flex items-center gap-3">
              <button onClick={() => setDrawerOpen(true)} className="lg:hidden w-8 h-8 flex flex-col items-center justify-center gap-1">
                <span className="w-5 h-0.5 bg-ink" /><span className="w-5 h-0.5 bg-ink" /><span className="w-5 h-0.5 bg-ink" />
              </button>
              <div className="flex items-center gap-2">
                <span className="font-condensed text-sm font-bold" style={{ color: '#111827' }}>Comités</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'var(--org-primary-light)', color: 'var(--org-primary)' }}>MK</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="lg:hidden w-8 h-8 flex items-center justify-center relative">
                <span className="text-lg">🔔</span>
                <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">3</span>
              </button>
              <button onClick={() => setLogoutConfirm(true)}
                className="hidden sm:flex items-center gap-1.5 bg-white border px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:bg-gray-50"
                style={{ borderColor: 'var(--org-sidebar-border)', color: 'var(--org-sidebar-text)' }}>
                <span className="w-[7px] h-[7px] rounded-full bg-success" />Salir
              </button>
            </div>
          </div>

          {/* Row 2: Comité tabs (gray band) — full width */}
          {(isAreaPage || isHome) && !isProfile && !isNonAreaPage && (
            <div className="px-2 sm:px-4 py-1.5 flex gap-0.5 overflow-x-auto scrollbar-hide border-b"
              style={{ background: 'var(--org-header-bg)', borderColor: 'var(--org-sidebar-border)' }}>
              {AREA_TABS.map(tab => {
                const active = pathname.startsWith(tab.href) || pathname.includes(tab.id)
                return (
                  <Link key={tab.id} href={tab.href}
                    className="flex-1 text-center px-1 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all"
                    style={{
                      background: active ? 'var(--org-tab-active-bg)' : 'white',
                      color: active ? 'var(--org-tab-active-text)' : '#6B7280',
                      boxShadow: active ? `0 1px 4px rgba(var(--org-primary-rgb), 0.2)` : 'none',
                      border: active ? 'none' : '1px solid var(--org-sidebar-border)',
                    }}>
                    {tab.label}
                  </Link>
                )
              })}
            </div>
          )}

          {/* Row 3: Sub-tabs (white band) — full width */}
          {showSubTabs && (
            <div className="px-2 sm:px-4 py-1 flex items-center gap-0.5 overflow-x-auto scrollbar-hide border-b bg-white"
              style={{ borderColor: 'var(--org-sidebar-border)' }}>
              {subTabs.map(tab => {
                const active = activeSubTab === tab.id
                return (
                  <Link key={tab.id} href={`/comites/${currentArea}?tab=${tab.id}`} scroll={false}
                    className={`flex-1 text-center px-1 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-all ${
                      active ? 'font-semibold' : 'text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F9FAFB]'
                    }`}
                    style={active ? { color: 'var(--org-primary)', background: 'var(--org-primary-light)' } : undefined}>
                    {tab.label}
                  </Link>
                )
              })}
              <Link href={`/comites/${currentArea}/proyectar`}
                className="flex-1 text-center px-1 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-all text-[#6B7280] bg-[#F3F4F6] border border-[#E2E8F0] hover:text-ink hover:bg-[#E5E7EB]">
                Presentar →
              </Link>
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <ToastContainer />
        <main id="main-content" className="flex-1 px-3 sm:px-6 py-4 sm:py-5 pb-24 lg:pb-5">
          <div className="max-w-[1100px] mx-auto">
            {/* Mobile profile tab */}
            {isProfile && (
              <div className="lg:hidden">
                <div className="flex flex-col items-center py-6">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold mb-3" style={{ background: 'var(--org-primary)' }}>FV</div>
                  <h2 className="font-condensed text-lg font-bold text-ink">Felipe Valenzuela</h2>
                  <p className="text-xs text-slate">Administrador</p>
                  <span className="mt-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: 'var(--org-primary-light)', color: 'var(--org-primary)' }}>NEGRETPAR002 · MK</span>
                </div>
                <div className="space-y-1">
                  {PROFILE_MENU.map(item => (
                    <button key={item.label} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-[#E5E7EB] text-left hover:bg-[#F9FAFB] transition-colors">
                      <span className="text-base opacity-50">{item.icon}</span>
                      <span className="flex-1 text-sm font-medium text-ink">{item.label}</span>
                      {item.badge && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: 'var(--org-primary)' }}>{item.badge}</span>}
                      <svg className="w-4 h-4 text-[#9CA3AF]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
                    </button>
                  ))}
                  <button onClick={() => setLogoutConfirm(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-red-200 text-left hover:bg-red-50 transition-colors mt-3">
                    <span className="text-base">⏻</span>
                    <span className="text-sm font-medium text-red-600">Cerrar sesion</span>
                  </button>
                </div>
              </div>
            )}
            {/* Normal content (hidden when profile tab is active on mobile) */}
            <div className={isProfile ? 'hidden lg:block' : ''}>
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-[64px] ccd-bottom-nav flex items-center justify-around px-4 safe-area-pb">
        {/* Home */}
        <button onClick={() => { setMobileTab('home'); router.push('/comites') }}
          className="flex flex-col items-center gap-0.5 py-1.5 px-4 relative">
          {mobileTab === 'home' && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full" style={{ background: 'var(--org-primary)' }} />}
          <span className={`text-lg ${mobileTab === 'home' ? '' : 'opacity-40'}`}>🏠</span>
          <span className={`text-[10px] font-semibold ${mobileTab === 'home' ? '' : 'text-[#9CA3AF]'}`} style={{ color: mobileTab === 'home' ? 'var(--org-primary)' : undefined }}>Home</span>
        </button>
        {/* Module */}
        <button onClick={() => { setMobileTab('module'); if (isHome) router.push('/comites/finanzas') }}
          className="flex flex-col items-center gap-0.5 py-1.5 px-4 relative">
          {mobileTab === 'module' && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full" style={{ background: 'var(--org-primary)' }} />}
          <span className={`text-lg ${mobileTab === 'module' ? '' : 'opacity-40'}`}>◎</span>
          <span className={`text-[10px] font-semibold ${mobileTab === 'module' ? '' : 'text-[#9CA3AF]'}`} style={{ color: mobileTab === 'module' ? 'var(--org-primary)' : undefined }}>Comités</span>
        </button>
        {/* Profile */}
        <button onClick={() => setMobileTab('profile')}
          className="flex flex-col items-center gap-0.5 py-1.5 px-4 relative">
          {mobileTab === 'profile' && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full" style={{ background: 'var(--org-primary)' }} />}
          <span className={`text-lg ${mobileTab === 'profile' ? '' : 'opacity-40'}`}>👤</span>
          <span className={`text-[10px] font-semibold ${mobileTab === 'profile' ? '' : 'text-[#9CA3AF]'}`} style={{ color: mobileTab === 'profile' ? 'var(--org-primary)' : undefined }}>Perfil</span>
        </button>
      </nav>

      {/* ═══ MOBILE FAB (Speed Dial) ═══ */}
      <div className="lg:hidden fixed z-50" style={{ bottom: 78, right: 16 }}>
        {/* Speed dial actions */}
        <AnimatePresence>
          {fabOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40" onClick={() => setFabOpen(false)} />
              <div className="absolute bottom-16 right-0 z-50 flex flex-col items-end gap-2">
                {(SPEED_DIAL_ACTIONS[currentModule] || SPEED_DIAL_ACTIONS.default).map((action, i) => (
                  <motion.button key={action.label}
                    initial={{ opacity: 0, y: 12, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setFabOpen(false)}
                    className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-lg bg-[#111827] text-white text-xs font-medium shadow-lg">{action.label}</span>
                    <span className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shadow-lg"
                      style={{ background: i === 0 ? 'var(--org-primary)' : '#E5E7EB', color: i === 0 ? 'white' : 'var(--org-primary)' }}>
                      {action.icon}
                    </span>
                  </motion.button>
                ))}
              </div>
            </>
          )}
        </AnimatePresence>
        {/* FAB button */}
        <button onClick={() => setFabOpen(!fabOpen)}
          className="w-14 h-14 rounded-full ccd-bottom-nav-fab flex items-center justify-center text-white text-2xl font-light transition-transform"
          style={{ transform: fabOpen ? 'rotate(45deg)' : 'none' }}>
          +
        </button>
      </div>

      {/* ═══ LOGOUT MODAL ═══ */}
      {logoutConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-md" onClick={() => setLogoutConfirm(false)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="logout-title"
            className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-[360px] p-6 ring-1 ring-black/5" onClick={e => e.stopPropagation()}>
            <h3 id="logout-title" className="font-condensed text-lg font-extrabold text-ink">¿Cerrar sesion?</h3>
            <p className="text-xs text-slate mt-1 mb-5">Saldras del portal de comites.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setLogoutConfirm(false)} className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-semibold hover:bg-[#F1F5F9]">Cancelar</button>
              <button onClick={handleLogout} className="px-4 py-2 bg-danger border border-danger text-white rounded-lg text-xs font-bold hover:bg-red-700">Cerrar sesion</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
