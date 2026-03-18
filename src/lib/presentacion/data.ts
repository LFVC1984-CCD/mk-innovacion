export const WEEK = '17 Mar 2026'

export type PresentacionTaskStatus = 'pendiente' | 'en-proceso' | 'listo'

export interface Area {
  id: string
  name: string
  color: string
  slide: number
  tareas: string[]
  herramientas: string[]
  plan: string[]
  planLink?: { text: string; url: string }
  pendientes: string[]
  pendientesStatus: PresentacionTaskStatus[]
}

export const AREAS: Area[] = [
  {
    id: 'finanzas', name: 'Finanzas, Contabilidad y Tesorería', color: '#0B5ED7', slide: 3,
    tareas: [
      'Levantamiento de funciones y tareas por cargo',
      'Inventario y evaluación de softwares actuales',
      'Propuesta de digitalización de tesorería',
      'Extracción y análisis de datos desde plataformas',
      'Desarrollo de plataforma web (reemplaza Excel manual)',
    ],
    herramientas: [
      'Defontana — ERP (contabilidad y proveedores)',
      'Excel — procesamiento manual de facturas en tesorería',
      'SII — revisión, aceptación y control de plazos',
      'iConstruye — aprobación de facturas de obras',
    ],
    plan: [
      'Portal de Documentos: sincroniza SII + Defontana + iConstruye',
      'APIs SII e iConstruye → integración próxima semana (Luis Macri)',
      'Sistema en pruebas internas ✓',
      'Elimina copypaste manual — dashboard en tiempo real',
    ],
    planLink: { text: 'Acceder al Portal →', url: 'https://mkappai001.azurewebsites.net/comps/PortalDeDocumentos' },
    pendientes: [
      'Despido Aldo Jaramillo (proceso reemplazado por plataforma)',
      'Aprobación pago API SII',
      'Validar con Fernando Riveros (GG-Finanzas)',
      'Validar con Jaime Martínez (Contador general)',
      'Validar con Bárbara Queglas (Tesorería)',
    ],
    pendientesStatus: ['pendiente', 'pendiente', 'en-proceso', 'pendiente', 'pendiente'],
  },
  {
    id: 'rrhh', name: 'Recursos Humanos', color: '#7C3AED', slide: 4,
    tareas: [
      'Diagnóstico de procesos en Talana (subutilizado)',
      'Optimización de aplicación de firmas y contratos',
      'Capacitaciones y desarrollo de flujos en Talana',
      'Establecimiento de banda de sueldos y cargos',
      'Reforzar amonestaciones por no-marcación asistencia',
    ],
    herramientas: [
      'Talana — RRHH y remuneraciones (subutilizado)',
      'Aplicación móvil de firmas/contratos (sobreutilizada)',
      'Reloj control biométrico en obra',
      'App asistencia profesionales (con brechas de uso)',
      'Excel — remuneraciones y finiquitos',
    ],
    plan: [
      'Optimizar flujos en Talana → eliminar Excels de RRHH',
      'Revisar contrato Talana — cobros por revisión FV',
      'App control productividad HH para toda la empresa',
      'Normalizar cargos → tabla de sueldos → validación LGR',
    ],
    pendientes: [
      'Validar tabla de sueldos: Luis Godoy (Gcia. Operaciones)',
      'Confirmar flujos Talana reemplazan app de firmas',
      'Definir política de amonestaciones (reglamento interno)',
      'Revisar contrato Talana y condiciones de facturación',
    ],
    pendientesStatus: ['en-proceso', 'pendiente', 'pendiente', 'pendiente'],
  },
  {
    id: 'legal', name: 'Legal', color: '#D97706', slide: 5,
    tareas: [
      'Revisión de contratos tipo vigentes',
      'Implementación firma electrónica en iConstruye (SC)',
      'Diseño sistema digital de gestión documental SC',
      'Migración causas legales (SharePoint → sistema web)',
      'Participación comités semanales y minutas',
    ],
    herramientas: [
      'iConstruye — contratos y órdenes de compra',
      'iConstruye — firma digital SC (implementación próx. semana)',
      'SharePoint — repositorio documentos (poco eficiente)',
      'SharePoint — lista causas legales (a reemplazar)',
      'Pendiente: finiquito retenciones (iConstruye sin solución)',
    ],
    plan: [
      'Sistema web Gestión Documental SC — 90% prototipo ✓',
      '→ Próximo: validación gerencia + administrativos obra',
      'Sistema web Auditorías Legales — en diseño',
      'Asistente IA Legal para obras y abogada — en evaluación',
    ],
    planLink: { text: 'Ver prototipo DocSC →', url: 'https://mkappai001.azurewebsites.net/Demos/DocSC-Prototipo.html' },
    pendientes: [
      'Validar prototipo sistema documental SC con gerencia',
      'Definir alcance asistente IA Legal',
      'Resolver finiquito retenciones con iConstruye',
      'Avanzar auditorías legales una vez definido SC',
    ],
    pendientesStatus: ['en-proceso', 'pendiente', 'pendiente', 'pendiente'],
  },
  {
    id: 'prevencion', name: 'Prevención de Riesgos', color: '#DC2626', slide: 6,
    tareas: [
      'Evaluación digitalización con Kizeo (hoy todo en papel)',
      'Revisión app operativa: incidentes, accidentes, RDI',
      'Prototipo charlas individuales y masivas (listo)',
      'Diseño informes autónomos para mandante e internos',
      'Integrar amonestaciones en sistema documental SC',
    ],
    herramientas: [
      'Papel + escaneo — proceso actual (sin digitalizar)',
      'Excel no estructurado — planillas de prevención',
      'Kizeo — evaluando (formularios mapeados, sin validar)',
      'Aplicación móvil operativa — no testeada en obra',
      'iConstruye — algunos documentos de prevención',
    ],
    plan: [
      'Probar app operativa en obra → migrar a sistema web CCD',
      'Evaluar APIs Kizeo para informes (si sirve convivir)',
      'Agentes IA → informes automáticos de obra e internos',
      'Incorporar charlas individuales/masivas al módulo',
    ],
    pendientes: [
      'Reunión con jefe de prevención → evaluar alcance Kizeo',
      'L. Godoy: Kizeo solo cambia Excel por formulario',
      'Definir: ¿directo a sistema web o piloto en app primero?',
      'Validar si APIs Kizeo son útiles para informes',
    ],
    pendientesStatus: ['pendiente', 'listo', 'pendiente', 'pendiente'],
  },
  {
    id: 'estudios', name: 'Estudios y Licitaciones', color: '#64748B', slide: 7,
    tareas: [
      'Entrevistas: Subgerente área, Jefa Negocios ✓',
      'Entrevista Gerente Comercial — en proceso',
      'Mapeo procesos de licitación y cubicación',
      'Formalizar descripciones de cargo y procesos',
      'Evaluar incorporación BIM (exigencia creciente)',
    ],
    herramientas: [
      'Excel — presupuestos y cubicaciones',
      'Correo — cotizaciones a proveedores',
      'iConstruye — histórico de recursos',
      'AutoCAD — planos y diseño',
      'BIM — incorporación pendiente (modelador + as-built)',
    ],
    plan: [
      'Sistema web: estatus de licitaciones e informes',
      'Evaluar integración IA cubicación (F. Riveros)',
      'Formalizar procesos y descripciones de cargo',
      'Conectar con ecosistema CCD para datos históricos',
    ],
    pendientes: [
      'Completar entrevistas pendientes del área',
      'Definir alcance sistema web de licitaciones',
      'Evaluar iniciativa IA cubicación de F. Riveros',
      'Definir estrategia BIM (software, modelador)',
    ],
    pendientesStatus: ['en-proceso', 'pendiente', 'pendiente', 'pendiente'],
  },
  {
    id: 'obras', name: 'Obras — Resumen General', color: '#16A34A', slide: 8,
    tareas: [
      'Visitas a terreno: soporte técnico e innovación',
      'Levantamiento de necesidades digitales en obras activas',
      'Control gestión: flujo financiero, productividad, margen',
      'Gestión facturas, anexos de contrato y estados de pago',
      'Contacto con ITO y análisis de presupuestos',
    ],
    herramientas: [
      'iConstruye — OC, SC, estados de pago, facturas',
      'Talana — remuneraciones y asistencia',
      'Apps CCD — Presupuestos, Planificación, Calidad (producción)',
      'Excel — NDC, RDI, control MO · MS Project — Carta Gantt',
      'Teams + Planner — coordinación y asignación de tareas',
    ],
    plan: [
      'Informes automáticos integrando APIs (SII, iConstruye, Talana)',
      'Antes: datos vía RPA → SharePoint. Ahora: APIs directas ✓',
      'Control MO → sistema web CCD (en cola, prototipo avanzado)',
      'App enrolamiento de trabajadores — proceso 100% digital',
    ],
    planLink: { text: 'Ver app Enrolamiento →', url: 'https://mkappai001.azurewebsites.net/Demos/ccd-personas-enrolamiento.html' },
    pendientes: [
      'Validar apps CCD en todas las obras activas',
      'Presupuesto y priorización apps en cola',
      'Definir administrador obras sin administrador',
      'Formalizar flujos de coordinación en Teams/Planner',
    ],
    pendientesStatus: ['en-proceso', 'pendiente', 'pendiente', 'pendiente'],
  },
]

export const MAPA_DATA = [
  { name: 'Finanzas', n: 5, done: 3, pct: 60, color: '#0B5ED7' },
  { name: 'RRHH', n: 6, done: 3, pct: 50, color: '#7C3AED' },
  { name: 'Legal', n: 5, done: 2, pct: 40, color: '#D97706' },
  { name: 'Prevención', n: 4, done: 1, pct: 25, color: '#DC2626' },
  { name: 'Estudios', n: 4, done: 1, pct: 25, color: '#64748B' },
  { name: 'Obras', n: 9, done: 6, pct: 67, color: '#16A34A' },
]

export const PROXIMOS = [
  { area: 'Finanzas', task: 'Integrar APIs SII + iConstruye → Portal de Documentos' },
  { area: 'RRHH', task: 'Enviar tabla de sueldos a Luis Godoy para validación' },
  { area: 'Legal', task: 'Validar prototipo sistema documental SC con gerencia' },
  { area: 'Prevención', task: 'Reunión jefe prevención → definir Kizeo vs sistema web' },
  { area: 'Estudios', task: 'Completar entrevistas y formalizar procesos del área' },
  { area: 'Obras', task: 'Lanzar Control MO en obras piloto — prioridad desarrollo' },
]
