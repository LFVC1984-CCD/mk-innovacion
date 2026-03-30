export interface ThemeConfig {
  primary: string
  primary_dark: string
  primary_light: string
  primary_rgb: string
  accent: string
  accent_hover: string
  logo_url: string | null
  sidebar_bg: string
}

export const THEME_PRESETS: Record<string, ThemeConfig> = {
  ccd: {
    primary: '#0B5ED7',
    primary_dark: '#0847A8',
    primary_light: '#E8F0FE',
    primary_rgb: '11, 94, 215',
    accent: '#E1BA10',
    accent_hover: 'rgba(225, 186, 16, 0.1)',
    logo_url: null,
    sidebar_bg: '#FFFFFF',
  },
  mk: {
    primary: '#C41E2A',
    primary_dark: '#9B1720',
    primary_light: '#FDE8EA',
    primary_rgb: '196, 30, 42',
    accent: '#C41E2A',
    accent_hover: 'rgba(196, 30, 42, 0.08)',
    logo_url: null,
    sidebar_bg: '#FFFFFF',
  },
}

export function applyOrgTheme(config: ThemeConfig) {
  const r = document.documentElement
  Object.entries(config).forEach(([key, val]) => {
    if (val && key !== 'logo_url') {
      r.style.setProperty('--org-' + key.replace(/_/g, '-'), val)
    }
  })
  // Derived variables
  r.style.setProperty('--org-sidebar-active-bg', `rgba(${config.primary_rgb}, 0.08)`)
  r.style.setProperty('--org-tab-active-bg', config.primary)
  r.style.setProperty('--org-header-bg', config.primary === '#C41E2A' ? '#F9F0F1' : '#F3F4F6')
}

/** Read theme_config from org name, fallback to CCD */
export function getPreset(orgName?: string): ThemeConfig {
  if (!orgName) return THEME_PRESETS.ccd
  const key = orgName.toLowerCase()
  if (key.includes('mk')) return THEME_PRESETS.mk
  return THEME_PRESETS.ccd
}
