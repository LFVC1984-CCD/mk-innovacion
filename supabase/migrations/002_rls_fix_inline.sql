-- ═══════════════════════════════════════════════════════
--  FIX RLS — Policies inline (sin funciones custom)
--  Ejecutar en Supabase Dashboard → SQL Editor
--  Fecha: 2026-03-27
--
--  Problema: las policies usan is_admin() y user_area_id()
--  que no existen. Se reemplazan con subqueries inline.
-- ═══════════════════════════════════════════════════════

-- ── Helper functions (por si no existen) ──
CREATE OR REPLACE FUNCTION public.user_area_id()
RETURNS TEXT AS $$
  SELECT area_id FROM public.perfiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND area_id = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════
--  Ahora re-crear TODAS las policies con fallback
--  Authenticated = puede leer todo
--  Admin = puede escribir todo
--  Área específica = puede escribir sus tablas
-- ═══════════════════════════════════════════════════════

-- ── ENTIDADES: leer todos auth, escribir admin + finanzas ──
ALTER TABLE public.entidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON public.entidades;
DROP POLICY IF EXISTS "entidades_select" ON public.entidades;
DROP POLICY IF EXISTS "entidades_write" ON public.entidades;
DROP POLICY IF EXISTS "entidades_insert" ON public.entidades;
DROP POLICY IF EXISTS "entidades_update" ON public.entidades;
DROP POLICY IF EXISTS "entidades_delete" ON public.entidades;

CREATE POLICY "entidades_select" ON public.entidades FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "entidades_insert" ON public.entidades FOR INSERT WITH CHECK (
  public.is_admin() OR public.user_area_id() = 'finanzas'
);
CREATE POLICY "entidades_update" ON public.entidades FOR UPDATE USING (
  public.is_admin() OR public.user_area_id() = 'finanzas'
);
CREATE POLICY "entidades_delete" ON public.entidades FOR DELETE USING (
  public.is_admin() OR public.user_area_id() = 'finanzas'
);

-- ── GARANTIAS ──
ALTER TABLE public.garantias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON public.garantias;
DROP POLICY IF EXISTS "garantias_select" ON public.garantias;
DROP POLICY IF EXISTS "garantias_write" ON public.garantias;
DROP POLICY IF EXISTS "garantias_insert" ON public.garantias;
DROP POLICY IF EXISTS "garantias_update" ON public.garantias;
DROP POLICY IF EXISTS "garantias_delete" ON public.garantias;

CREATE POLICY "garantias_select" ON public.garantias FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "garantias_insert" ON public.garantias FOR INSERT WITH CHECK (
  public.is_admin() OR public.user_area_id() = 'finanzas'
);
CREATE POLICY "garantias_update" ON public.garantias FOR UPDATE USING (
  public.is_admin() OR public.user_area_id() = 'finanzas'
);
CREATE POLICY "garantias_delete" ON public.garantias FOR DELETE USING (
  public.is_admin() OR public.user_area_id() = 'finanzas'
);

-- ── LINEAS_CREDITO ──
ALTER TABLE public.lineas_credito ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON public.lineas_credito;
DROP POLICY IF EXISTS "lineas_credito_select" ON public.lineas_credito;
DROP POLICY IF EXISTS "lineas_credito_write" ON public.lineas_credito;
DROP POLICY IF EXISTS "lineas_credito_insert" ON public.lineas_credito;
DROP POLICY IF EXISTS "lineas_credito_update" ON public.lineas_credito;
DROP POLICY IF EXISTS "lineas_credito_delete" ON public.lineas_credito;

CREATE POLICY "lineas_credito_select" ON public.lineas_credito FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "lineas_credito_insert" ON public.lineas_credito FOR INSERT WITH CHECK (
  public.is_admin() OR public.user_area_id() = 'finanzas'
);
CREATE POLICY "lineas_credito_update" ON public.lineas_credito FOR UPDATE USING (
  public.is_admin() OR public.user_area_id() = 'finanzas'
);
CREATE POLICY "lineas_credito_delete" ON public.lineas_credito FOR DELETE USING (
  public.is_admin() OR public.user_area_id() = 'finanzas'
);

-- ── PROYECTOS ──
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_select" ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_write" ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_insert" ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_update" ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_delete" ON public.proyectos;

CREATE POLICY "proyectos_select" ON public.proyectos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "proyectos_insert" ON public.proyectos FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "proyectos_update" ON public.proyectos FOR UPDATE USING (public.is_admin());
CREATE POLICY "proyectos_delete" ON public.proyectos FOR DELETE USING (public.is_admin());

-- ── EQUIPO ──
ALTER TABLE public.equipo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON public.equipo;
DROP POLICY IF EXISTS "equipo_select" ON public.equipo;
DROP POLICY IF EXISTS "equipo_write" ON public.equipo;
DROP POLICY IF EXISTS "equipo_insert" ON public.equipo;
DROP POLICY IF EXISTS "equipo_update" ON public.equipo;
DROP POLICY IF EXISTS "equipo_delete" ON public.equipo;

CREATE POLICY "equipo_select" ON public.equipo FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "equipo_insert" ON public.equipo FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "equipo_update" ON public.equipo FOR UPDATE USING (public.is_admin());
CREATE POLICY "equipo_delete" ON public.equipo FOR DELETE USING (public.is_admin());

-- ── TAREAS ──
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON public.tareas;
DROP POLICY IF EXISTS "tareas_select" ON public.tareas;
DROP POLICY IF EXISTS "tareas_write" ON public.tareas;
DROP POLICY IF EXISTS "tareas_insert" ON public.tareas;
DROP POLICY IF EXISTS "tareas_update" ON public.tareas;
DROP POLICY IF EXISTS "tareas_delete" ON public.tareas;

CREATE POLICY "tareas_select" ON public.tareas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "tareas_insert" ON public.tareas FOR INSERT WITH CHECK (
  public.is_admin() OR area_id = public.user_area_id() OR area_destino = public.user_area_id()
);
CREATE POLICY "tareas_update" ON public.tareas FOR UPDATE USING (
  public.is_admin() OR area_id = public.user_area_id() OR area_destino = public.user_area_id()
);
CREATE POLICY "tareas_delete" ON public.tareas FOR DELETE USING (
  public.is_admin() OR area_id = public.user_area_id()
);

-- ── KPIS ──
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON public.kpis;
DROP POLICY IF EXISTS "kpis_select" ON public.kpis;
DROP POLICY IF EXISTS "kpis_write" ON public.kpis;
DROP POLICY IF EXISTS "kpis_insert" ON public.kpis;
DROP POLICY IF EXISTS "kpis_update" ON public.kpis;
DROP POLICY IF EXISTS "kpis_delete" ON public.kpis;

CREATE POLICY "kpis_select" ON public.kpis FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "kpis_insert" ON public.kpis FOR INSERT WITH CHECK (
  public.is_admin() OR area_id = public.user_area_id()
);
CREATE POLICY "kpis_update" ON public.kpis FOR UPDATE USING (
  public.is_admin() OR area_id = public.user_area_id()
);
CREATE POLICY "kpis_delete" ON public.kpis FOR DELETE USING (
  public.is_admin() OR area_id = public.user_area_id()
);

-- ── MINUTAS ──
ALTER TABLE public.minutas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON public.minutas;
DROP POLICY IF EXISTS "minutas_select" ON public.minutas;
DROP POLICY IF EXISTS "minutas_write" ON public.minutas;
DROP POLICY IF EXISTS "minutas_insert" ON public.minutas;
DROP POLICY IF EXISTS "minutas_update" ON public.minutas;

CREATE POLICY "minutas_select" ON public.minutas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "minutas_insert" ON public.minutas FOR INSERT WITH CHECK (
  public.is_admin() OR area_id = public.user_area_id()
);
CREATE POLICY "minutas_update" ON public.minutas FOR UPDATE USING (
  public.is_admin() OR area_id = public.user_area_id()
);

-- ── KPI_HISTORIAL ──
ALTER TABLE public.kpi_historial ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON public.kpi_historial;
DROP POLICY IF EXISTS "kpi_historial_select" ON public.kpi_historial;
DROP POLICY IF EXISTS "kpi_historial_insert" ON public.kpi_historial;

CREATE POLICY "kpi_historial_select" ON public.kpi_historial FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "kpi_historial_insert" ON public.kpi_historial FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── PERFILES ──
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_select" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_update_own" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_admin_all" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_admin_insert" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_admin_update" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_admin_delete" ON public.perfiles;

CREATE POLICY "perfiles_select" ON public.perfiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "perfiles_update_own" ON public.perfiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "perfiles_admin_insert" ON public.perfiles FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "perfiles_admin_update" ON public.perfiles FOR UPDATE USING (public.is_admin());
CREATE POLICY "perfiles_admin_delete" ON public.perfiles FOR DELETE USING (public.is_admin());

-- ── USUARIOS_PORTAL ──
ALTER TABLE public.usuarios_portal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON public.usuarios_portal;
DROP POLICY IF EXISTS "usuarios_admin_only" ON public.usuarios_portal;
DROP POLICY IF EXISTS "usuarios_select" ON public.usuarios_portal;
DROP POLICY IF EXISTS "usuarios_insert" ON public.usuarios_portal;
DROP POLICY IF EXISTS "usuarios_update" ON public.usuarios_portal;
DROP POLICY IF EXISTS "usuarios_delete" ON public.usuarios_portal;

CREATE POLICY "usuarios_select" ON public.usuarios_portal FOR SELECT USING (public.is_admin());
CREATE POLICY "usuarios_insert" ON public.usuarios_portal FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "usuarios_update" ON public.usuarios_portal FOR UPDATE USING (public.is_admin());
CREATE POLICY "usuarios_delete" ON public.usuarios_portal FOR DELETE USING (public.is_admin());

-- ── Tablas restantes: lectura autenticados, escritura admin ──

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'causas_legal','documentos_legal','eventos_seguridad','estadisticas_seguridad',
    'herramientas_eti','proyectos_innovacion','flujo_financiero','flujo_proyectos',
    'comentarios_area','decisiones','historial_area','parking','config_estudios','plan_inversion'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_write" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT USING (auth.uid() IS NOT NULL)', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT WITH CHECK (public.is_admin())', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE USING (public.is_admin())', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE USING (public.is_admin())', tbl, tbl);
  END LOOP;
END $$;
