# MK Ingeniería — Portal de Comités

## Stack
Next.js 14 App Router · Supabase (Auth + DB) · Tailwind CSS · TypeScript
Supabase project: mgemludeasndspzorhbc

## Paleta CCD Brand
--cobalt: #0B5ED7 (primario)
--gold:   #E1BA10 (acento)
--mkred:  #E8000D (logo MK)
--green:  #16A34A (positivo)
--red:    #DC2626 (alertas)
--amber:  #D97706 (en proceso)

## Tipografía
Barlow Condensed — títulos, display, métricas grandes (class: font-condensed)
Barlow — cuerpo, labels, UI

## Estructura del proyecto
```
src/
├── app/
│   ├── layout.tsx          # Layout global (fonts, metadata)
│   ├── page.tsx            # Redirect → /login o /comites
│   ├── login/              # Supabase Auth (email + password)
│   └── comites/
│       ├── layout.tsx      # Topbar + navegación
│       ├── page.tsx        # Home: cards de 7 áreas
│       ├── [area]/         # Edición de KPIs y tareas por área
│       │   └── proyectar/  # Proyección/slides por área
│       ├── garantias/      # Redirect → /comites/finanzas (garantías ahora es tab de Finanzas)
│       ├── proyectos/      # Maestro de proyectos (placeholder)
│       ├── equipos/        # Maestro de equipos (placeholder)
│       ├── usuarios/       # Maestro de usuarios (admin only)
│       ├── ampliado/       # Comité Ampliado (placeholder)
│       ├── historial/      # Historial de minutas (placeholder)
│       └── api/            # Route handlers (minuta, usuarios)
├── components/
│   ├── comites/            # 15+ componentes (AreaCard, GarantiaModal, etc.)
│   └── ui/                 # Componentes base reutilizables
└── lib/
    ├── types.ts            # Types centrales (AreaId, KPI, Tarea, etc.)
    ├── store.ts            # Zustand (estado global)
    ├── comites/            # Data helpers + hooks
    └── supabase/           # Client (browser) + Server (SSR)
```

## Áreas del portal
finanzas | rrhh | legal | prevencion | estudios | obras | eti

## Roles
- admin: edita todo, gestiona usuarios
- viewer: solo lectura
- Por área: editar / ver (granular por comité)

## Auth
Supabase Auth con email + password (no PINs).
RLS: cada usuario edita solo su area_id. Admin edita todo.

## Reglas importantes
- NUNCA usar "PWA" — siempre "sistema web" o "aplicación móvil web"
- Todos los textos en español
- `index.html` en raíz = producción actual (portal HTML v11.4, fallback hasta completar migración)
- No tocar archivos de presentación semanal — eso vive en mk-app separado

## Migración desde index.html
El portal HTML single-file (3,266 líneas) se está migrando módulo por módulo.
Módulos migrados: Login, Home (cards de áreas), Garantías (parcial), Usuarios (parcial)
Módulos pendientes: Proyectos, Equipos, Comité Ampliado, Historial, Edición de área, Proyección, PDF export, Control financiero de obras
