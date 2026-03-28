-- ═══════════════════════════════════════════════════════
--  RLS Policies — Portal Comités MK
--  Ejecutar en Supabase Dashboard → SQL Editor
--  Fecha: 2026-03-27
-- ═══════════════════════════════════════════════════════

-- Helper: obtener area_id del perfil del usuario autenticado
CREATE OR REPLACE FUNCTION public.user_area_id()
RETURNS TEXT AS $$
  SELECT area_id FROM public.perfiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: verificar si el usuario es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND area_id = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ═══════════════════════════════════════════════════════
--  1. PERFILES — solo lectura propia, admin edita todo
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_select" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_update_own" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_admin_all" ON public.perfiles;

CREATE POLICY "perfiles_select"
  ON public.perfiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "perfiles_update_own"
  ON public.perfiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "perfiles_admin_all"
  ON public.perfiles FOR ALL
  USING (public.is_admin());


-- ═══════════════════════════════════════════════════════
--  2. USUARIOS_PORTAL — solo admin
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.usuarios_portal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.usuarios_portal;
DROP POLICY IF EXISTS "usuarios_admin_only" ON public.usuarios_portal;

CREATE POLICY "usuarios_admin_only"
  ON public.usuarios_portal FOR ALL
  USING (public.is_admin());


-- ═══════════════════════════════════════════════════════
--  3. TAREAS — leer todas, escribir solo tu área o admin
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.tareas;
DROP POLICY IF EXISTS "tareas_select" ON public.tareas;
DROP POLICY IF EXISTS "tareas_write" ON public.tareas;

CREATE POLICY "tareas_select"
  ON public.tareas FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "tareas_write"
  ON public.tareas FOR ALL
  USING (
    public.is_admin()
    OR area_id = public.user_area_id()
    OR area_destino = public.user_area_id()
  );


-- ═══════════════════════════════════════════════════════
--  4. KPIS — leer todas, escribir solo tu área o admin
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.kpis;
DROP POLICY IF EXISTS "kpis_select" ON public.kpis;
DROP POLICY IF EXISTS "kpis_write" ON public.kpis;

CREATE POLICY "kpis_select"
  ON public.kpis FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "kpis_write"
  ON public.kpis FOR ALL
  USING (
    public.is_admin()
    OR area_id = public.user_area_id()
  );


-- ═══════════════════════════════════════════════════════
--  5. KPI_HISTORIAL — leer todas, insertar admin/área
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.kpi_historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.kpi_historial;
DROP POLICY IF EXISTS "kpi_historial_select" ON public.kpi_historial;
DROP POLICY IF EXISTS "kpi_historial_insert" ON public.kpi_historial;

CREATE POLICY "kpi_historial_select"
  ON public.kpi_historial FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "kpi_historial_insert"
  ON public.kpi_historial FOR INSERT
  WITH CHECK (public.is_admin() OR area_id = public.user_area_id());


-- ═══════════════════════════════════════════════════════
--  6. MINUTAS — leer todas, escribir admin/área
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.minutas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.minutas;
DROP POLICY IF EXISTS "minutas_select" ON public.minutas;
DROP POLICY IF EXISTS "minutas_write" ON public.minutas;

CREATE POLICY "minutas_select"
  ON public.minutas FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "minutas_write"
  ON public.minutas FOR ALL
  USING (
    public.is_admin()
    OR area_id = public.user_area_id()
  );


-- ═══════════════════════════════════════════════════════
--  7. PROYECTOS — leer todas, escribir admin
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_select" ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_write" ON public.proyectos;

CREATE POLICY "proyectos_select"
  ON public.proyectos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "proyectos_write"
  ON public.proyectos FOR ALL
  USING (public.is_admin());


-- ═══════════════════════════════════════════════════════
--  8. EQUIPO — leer todas, escribir admin
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.equipo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.equipo;
DROP POLICY IF EXISTS "equipo_select" ON public.equipo;
DROP POLICY IF EXISTS "equipo_write" ON public.equipo;

CREATE POLICY "equipo_select"
  ON public.equipo FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "equipo_write"
  ON public.equipo FOR ALL
  USING (public.is_admin());


-- ═══════════════════════════════════════════════════════
--  9. GARANTÍAS — leer todas, escribir admin + finanzas
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.garantias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.garantias;
DROP POLICY IF EXISTS "garantias_select" ON public.garantias;
DROP POLICY IF EXISTS "garantias_write" ON public.garantias;

CREATE POLICY "garantias_select"
  ON public.garantias FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "garantias_write"
  ON public.garantias FOR ALL
  USING (
    public.is_admin()
    OR public.user_area_id() = 'finanzas'
  );


-- ═══════════════════════════════════════════════════════
--  10. ENTIDADES — leer todas, escribir admin + finanzas
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.entidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.entidades;
DROP POLICY IF EXISTS "entidades_select" ON public.entidades;
DROP POLICY IF EXISTS "entidades_write" ON public.entidades;

CREATE POLICY "entidades_select"
  ON public.entidades FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "entidades_write"
  ON public.entidades FOR ALL
  USING (
    public.is_admin()
    OR public.user_area_id() = 'finanzas'
  );


-- ═══════════════════════════════════════════════════════
--  11. LINEAS_CREDITO — leer todas, escribir admin + finanzas
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.lineas_credito ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.lineas_credito;
DROP POLICY IF EXISTS "lineas_credito_select" ON public.lineas_credito;
DROP POLICY IF EXISTS "lineas_credito_write" ON public.lineas_credito;

CREATE POLICY "lineas_credito_select"
  ON public.lineas_credito FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "lineas_credito_write"
  ON public.lineas_credito FOR ALL
  USING (
    public.is_admin()
    OR public.user_area_id() = 'finanzas'
  );


-- ═══════════════════════════════════════════════════════
--  12. CAUSAS_LEGAL — leer todas, escribir admin + legal
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.causas_legal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.causas_legal;
DROP POLICY IF EXISTS "causas_legal_select" ON public.causas_legal;
DROP POLICY IF EXISTS "causas_legal_write" ON public.causas_legal;

CREATE POLICY "causas_legal_select"
  ON public.causas_legal FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "causas_legal_write"
  ON public.causas_legal FOR ALL
  USING (
    public.is_admin()
    OR public.user_area_id() = 'legal'
  );


-- ═══════════════════════════════════════════════════════
--  13. DOCUMENTOS_LEGAL — leer todas, escribir admin + legal
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.documentos_legal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.documentos_legal;
DROP POLICY IF EXISTS "documentos_legal_select" ON public.documentos_legal;
DROP POLICY IF EXISTS "documentos_legal_write" ON public.documentos_legal;

CREATE POLICY "documentos_legal_select"
  ON public.documentos_legal FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "documentos_legal_write"
  ON public.documentos_legal FOR ALL
  USING (
    public.is_admin()
    OR public.user_area_id() = 'legal'
  );


-- ═══════════════════════════════════════════════════════
--  14. EVENTOS_SEGURIDAD — leer todas, escribir admin + prevencion
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.eventos_seguridad ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.eventos_seguridad;
DROP POLICY IF EXISTS "eventos_seguridad_select" ON public.eventos_seguridad;
DROP POLICY IF EXISTS "eventos_seguridad_write" ON public.eventos_seguridad;

CREATE POLICY "eventos_seguridad_select"
  ON public.eventos_seguridad FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "eventos_seguridad_write"
  ON public.eventos_seguridad FOR ALL
  USING (
    public.is_admin()
    OR public.user_area_id() = 'prevencion'
  );


-- ═══════════════════════════════════════════════════════
--  15. ESTADISTICAS_SEGURIDAD — leer todas, escribir admin + prevencion
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.estadisticas_seguridad ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.estadisticas_seguridad;
DROP POLICY IF EXISTS "estadisticas_seguridad_select" ON public.estadisticas_seguridad;
DROP POLICY IF EXISTS "estadisticas_seguridad_write" ON public.estadisticas_seguridad;

CREATE POLICY "estadisticas_seguridad_select"
  ON public.estadisticas_seguridad FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "estadisticas_seguridad_write"
  ON public.estadisticas_seguridad FOR ALL
  USING (
    public.is_admin()
    OR public.user_area_id() = 'prevencion'
  );


-- ═══════════════════════════════════════════════════════
--  16. HERRAMIENTAS_ETI — leer todas, escribir admin + eti
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.herramientas_eti ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.herramientas_eti;
DROP POLICY IF EXISTS "herramientas_eti_select" ON public.herramientas_eti;
DROP POLICY IF EXISTS "herramientas_eti_write" ON public.herramientas_eti;

CREATE POLICY "herramientas_eti_select"
  ON public.herramientas_eti FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "herramientas_eti_write"
  ON public.herramientas_eti FOR ALL
  USING (
    public.is_admin()
    OR public.user_area_id() = 'eti'
  );


-- ═══════════════════════════════════════════════════════
--  17. PROYECTOS_INNOVACION — leer todas, escribir admin + eti
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.proyectos_innovacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.proyectos_innovacion;
DROP POLICY IF EXISTS "proyectos_innovacion_select" ON public.proyectos_innovacion;
DROP POLICY IF EXISTS "proyectos_innovacion_write" ON public.proyectos_innovacion;

CREATE POLICY "proyectos_innovacion_select"
  ON public.proyectos_innovacion FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "proyectos_innovacion_write"
  ON public.proyectos_innovacion FOR ALL
  USING (
    public.is_admin()
    OR public.user_area_id() = 'eti'
  );


-- ═══════════════════════════════════════════════════════
--  18-20. FLUJO, CONFIG, DECISIONES — leer todas, admin escribe
-- ═══════════════════════════════════════════════════════

-- flujo_financiero
ALTER TABLE public.flujo_financiero ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON public.flujo_financiero;
CREATE POLICY "flujo_financiero_select" ON public.flujo_financiero FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "flujo_financiero_write" ON public.flujo_financiero FOR ALL USING (public.is_admin() OR public.user_area_id() = 'finanzas');

-- flujo_proyectos
ALTER TABLE public.flujo_proyectos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON public.flujo_proyectos;
CREATE POLICY "flujo_proyectos_select" ON public.flujo_proyectos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "flujo_proyectos_write" ON public.flujo_proyectos FOR ALL USING (public.is_admin() OR public.user_area_id() = 'finanzas');

-- comentarios_area
ALTER TABLE public.comentarios_area ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON public.comentarios_area;
CREATE POLICY "comentarios_area_select" ON public.comentarios_area FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "comentarios_area_write" ON public.comentarios_area FOR ALL USING (public.is_admin() OR area_id = public.user_area_id());

-- decisiones
ALTER TABLE public.decisiones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON public.decisiones;
CREATE POLICY "decisiones_select" ON public.decisiones FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "decisiones_write" ON public.decisiones FOR ALL USING (public.is_admin());

-- historial_area
ALTER TABLE public.historial_area ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON public.historial_area;
CREATE POLICY "historial_area_select" ON public.historial_area FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "historial_area_write" ON public.historial_area FOR ALL USING (public.is_admin() OR area_id = public.user_area_id());

-- parking
ALTER TABLE public.parking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON public.parking;
CREATE POLICY "parking_select" ON public.parking FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "parking_write" ON public.parking FOR ALL USING (public.is_admin());

-- config_estudios
ALTER TABLE public.config_estudios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON public.config_estudios;
CREATE POLICY "config_estudios_select" ON public.config_estudios FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "config_estudios_write" ON public.config_estudios FOR ALL USING (public.is_admin() OR public.user_area_id() = 'estudios');

-- plan_inversion
ALTER TABLE public.plan_inversion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON public.plan_inversion;
CREATE POLICY "plan_inversion_select" ON public.plan_inversion FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "plan_inversion_write" ON public.plan_inversion FOR ALL USING (public.is_admin() OR public.user_area_id() = 'eti');
