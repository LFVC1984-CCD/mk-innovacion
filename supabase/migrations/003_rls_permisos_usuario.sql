-- ═══════════════════════════════════════════════════════
--  RLS Fix: permisos_usuario module-level edit access
--  Ejecutar en Supabase Dashboard → SQL Editor
--  Fecha: 2026-05-15
--
--  Problema: policies con area_id = user_area_id() bloquean
--  a usuarios con area_id='viewer' que tienen permisos en
--  permisos_usuario para un módulo específico.
--
--  Solución: agregar has_module_edit(modulo) como alternativa
--  en todas las policies de escritura.
-- ═══════════════════════════════════════════════════════

-- Helper: verifica si el usuario tiene permiso de edición en un módulo específico
CREATE OR REPLACE FUNCTION public.has_module_edit(modulo text)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.permisos_usuario pu
    WHERE pu.user_id = auth.uid()
      AND pu.modulo = has_module_edit.modulo
      AND pu.nivel = 'edicion'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── KPIS ──
DROP POLICY IF EXISTS "kpis_write" ON public.kpis;
DROP POLICY IF EXISTS "kpis_insert" ON public.kpis;
DROP POLICY IF EXISTS "kpis_update" ON public.kpis;
DROP POLICY IF EXISTS "kpis_delete" ON public.kpis;

CREATE POLICY "kpis_insert" ON public.kpis FOR INSERT WITH CHECK (
  public.is_admin() OR area_id = public.user_area_id() OR public.has_module_edit(area_id)
);
CREATE POLICY "kpis_update" ON public.kpis FOR UPDATE USING (
  public.is_admin() OR area_id = public.user_area_id() OR public.has_module_edit(area_id)
);
CREATE POLICY "kpis_delete" ON public.kpis FOR DELETE USING (
  public.is_admin() OR area_id = public.user_area_id() OR public.has_module_edit(area_id)
);

-- ── TAREAS ──
DROP POLICY IF EXISTS "tareas_write" ON public.tareas;
DROP POLICY IF EXISTS "tareas_insert" ON public.tareas;
DROP POLICY IF EXISTS "tareas_update" ON public.tareas;
DROP POLICY IF EXISTS "tareas_delete" ON public.tareas;

CREATE POLICY "tareas_insert" ON public.tareas FOR INSERT WITH CHECK (
  public.is_admin()
  OR area_id = public.user_area_id()
  OR area_destino = public.user_area_id()
  OR public.has_module_edit(area_id)
  OR (area_destino IS NOT NULL AND public.has_module_edit(area_destino))
);
CREATE POLICY "tareas_update" ON public.tareas FOR UPDATE USING (
  public.is_admin()
  OR area_id = public.user_area_id()
  OR area_destino = public.user_area_id()
  OR public.has_module_edit(area_id)
  OR (area_destino IS NOT NULL AND public.has_module_edit(area_destino))
);
CREATE POLICY "tareas_delete" ON public.tareas FOR DELETE USING (
  public.is_admin() OR area_id = public.user_area_id() OR public.has_module_edit(area_id)
);

-- ── MINUTAS ──
DROP POLICY IF EXISTS "minutas_write" ON public.minutas;
DROP POLICY IF EXISTS "minutas_insert" ON public.minutas;
DROP POLICY IF EXISTS "minutas_update" ON public.minutas;

CREATE POLICY "minutas_insert" ON public.minutas FOR INSERT WITH CHECK (
  public.is_admin() OR area_id = public.user_area_id() OR public.has_module_edit(area_id)
);
CREATE POLICY "minutas_update" ON public.minutas FOR UPDATE USING (
  public.is_admin() OR area_id = public.user_area_id() OR public.has_module_edit(area_id)
);

-- ── KPI_HISTORIAL ──
DROP POLICY IF EXISTS "kpi_historial_insert" ON public.kpi_historial;
CREATE POLICY "kpi_historial_insert" ON public.kpi_historial FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── COMENTARIOS_AREA ──
DROP POLICY IF EXISTS "comentarios_area_write" ON public.comentarios_area;
DROP POLICY IF EXISTS "comentarios_area_insert" ON public.comentarios_area;
DROP POLICY IF EXISTS "comentarios_area_update" ON public.comentarios_area;
DROP POLICY IF EXISTS "comentarios_area_delete" ON public.comentarios_area;

CREATE POLICY "comentarios_area_insert" ON public.comentarios_area FOR INSERT WITH CHECK (
  public.is_admin() OR area_id = public.user_area_id() OR public.has_module_edit(area_id)
);
CREATE POLICY "comentarios_area_update" ON public.comentarios_area FOR UPDATE USING (
  public.is_admin() OR area_id = public.user_area_id() OR public.has_module_edit(area_id)
);
CREATE POLICY "comentarios_area_delete" ON public.comentarios_area FOR DELETE USING (
  public.is_admin() OR area_id = public.user_area_id() OR public.has_module_edit(area_id)
);

-- ── HISTORIAL_AREA ──
DROP POLICY IF EXISTS "historial_area_write" ON public.historial_area;
DROP POLICY IF EXISTS "historial_area_insert" ON public.historial_area;
DROP POLICY IF EXISTS "historial_area_update" ON public.historial_area;
DROP POLICY IF EXISTS "historial_area_delete" ON public.historial_area;

CREATE POLICY "historial_area_insert" ON public.historial_area FOR INSERT WITH CHECK (
  public.is_admin() OR area_id = public.user_area_id() OR public.has_module_edit(area_id)
);
CREATE POLICY "historial_area_update" ON public.historial_area FOR UPDATE USING (
  public.is_admin() OR area_id = public.user_area_id() OR public.has_module_edit(area_id)
);
CREATE POLICY "historial_area_delete" ON public.historial_area FOR DELETE USING (
  public.is_admin() OR area_id = public.user_area_id() OR public.has_module_edit(area_id)
);

-- ── PROYECTOS: admin OR 'proyectos' module edit ──
DROP POLICY IF EXISTS "proyectos_write" ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_insert" ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_update" ON public.proyectos;
DROP POLICY IF EXISTS "proyectos_delete" ON public.proyectos;

CREATE POLICY "proyectos_insert" ON public.proyectos FOR INSERT WITH CHECK (
  public.is_admin() OR public.has_module_edit('proyectos')
);
CREATE POLICY "proyectos_update" ON public.proyectos FOR UPDATE USING (
  public.is_admin() OR public.has_module_edit('proyectos')
);
CREATE POLICY "proyectos_delete" ON public.proyectos FOR DELETE USING (public.is_admin());

-- ── CONFIG_ESTUDIOS ──
DROP POLICY IF EXISTS "config_estudios_write" ON public.config_estudios;
DROP POLICY IF EXISTS "config_estudios_insert" ON public.config_estudios;
DROP POLICY IF EXISTS "config_estudios_update" ON public.config_estudios;
DROP POLICY IF EXISTS "config_estudios_delete" ON public.config_estudios;

CREATE POLICY "config_estudios_insert" ON public.config_estudios FOR INSERT WITH CHECK (
  public.is_admin() OR public.user_area_id() = 'estudios' OR public.has_module_edit('estudios')
);
CREATE POLICY "config_estudios_update" ON public.config_estudios FOR UPDATE USING (
  public.is_admin() OR public.user_area_id() = 'estudios' OR public.has_module_edit('estudios')
);
CREATE POLICY "config_estudios_delete" ON public.config_estudios FOR DELETE USING (
  public.is_admin() OR public.user_area_id() = 'estudios' OR public.has_module_edit('estudios')
);

-- ── EQUIPO ──
DROP POLICY IF EXISTS "equipo_write" ON public.equipo;
DROP POLICY IF EXISTS "equipo_insert" ON public.equipo;
DROP POLICY IF EXISTS "equipo_update" ON public.equipo;
DROP POLICY IF EXISTS "equipo_delete" ON public.equipo;

CREATE POLICY "equipo_insert" ON public.equipo FOR INSERT WITH CHECK (
  public.is_admin() OR public.has_module_edit('equipos')
);
CREATE POLICY "equipo_update" ON public.equipo FOR UPDATE USING (
  public.is_admin() OR public.has_module_edit('equipos')
);
CREATE POLICY "equipo_delete" ON public.equipo FOR DELETE USING (public.is_admin());

-- ── CAUSAS_LEGAL ──
DROP POLICY IF EXISTS "causas_legal_write" ON public.causas_legal;
DROP POLICY IF EXISTS "causas_legal_insert" ON public.causas_legal;
DROP POLICY IF EXISTS "causas_legal_update" ON public.causas_legal;
DROP POLICY IF EXISTS "causas_legal_delete" ON public.causas_legal;

CREATE POLICY "causas_legal_insert" ON public.causas_legal FOR INSERT WITH CHECK (
  public.is_admin() OR public.user_area_id() = 'legal' OR public.has_module_edit('legal')
);
CREATE POLICY "causas_legal_update" ON public.causas_legal FOR UPDATE USING (
  public.is_admin() OR public.user_area_id() = 'legal' OR public.has_module_edit('legal')
);
CREATE POLICY "causas_legal_delete" ON public.causas_legal FOR DELETE USING (
  public.is_admin() OR public.user_area_id() = 'legal' OR public.has_module_edit('legal')
);

-- ── DOCUMENTOS_LEGAL ──
DROP POLICY IF EXISTS "documentos_legal_write" ON public.documentos_legal;
DROP POLICY IF EXISTS "documentos_legal_insert" ON public.documentos_legal;
DROP POLICY IF EXISTS "documentos_legal_update" ON public.documentos_legal;
DROP POLICY IF EXISTS "documentos_legal_delete" ON public.documentos_legal;

CREATE POLICY "documentos_legal_insert" ON public.documentos_legal FOR INSERT WITH CHECK (
  public.is_admin() OR public.user_area_id() = 'legal' OR public.has_module_edit('legal')
);
CREATE POLICY "documentos_legal_update" ON public.documentos_legal FOR UPDATE USING (
  public.is_admin() OR public.user_area_id() = 'legal' OR public.has_module_edit('legal')
);
CREATE POLICY "documentos_legal_delete" ON public.documentos_legal FOR DELETE USING (
  public.is_admin() OR public.user_area_id() = 'legal' OR public.has_module_edit('legal')
);

-- ── EVENTOS_SEGURIDAD ──
DROP POLICY IF EXISTS "eventos_seguridad_write" ON public.eventos_seguridad;
DROP POLICY IF EXISTS "eventos_seguridad_insert" ON public.eventos_seguridad;
DROP POLICY IF EXISTS "eventos_seguridad_update" ON public.eventos_seguridad;
DROP POLICY IF EXISTS "eventos_seguridad_delete" ON public.eventos_seguridad;

CREATE POLICY "eventos_seguridad_insert" ON public.eventos_seguridad FOR INSERT WITH CHECK (
  public.is_admin() OR public.user_area_id() = 'prevencion' OR public.has_module_edit('prevencion')
);
CREATE POLICY "eventos_seguridad_update" ON public.eventos_seguridad FOR UPDATE USING (
  public.is_admin() OR public.user_area_id() = 'prevencion' OR public.has_module_edit('prevencion')
);
CREATE POLICY "eventos_seguridad_delete" ON public.eventos_seguridad FOR DELETE USING (
  public.is_admin() OR public.user_area_id() = 'prevencion' OR public.has_module_edit('prevencion')
);

-- ── ESTADISTICAS_SEGURIDAD ──
DROP POLICY IF EXISTS "estadisticas_seguridad_write" ON public.estadisticas_seguridad;
DROP POLICY IF EXISTS "estadisticas_seguridad_insert" ON public.estadisticas_seguridad;
DROP POLICY IF EXISTS "estadisticas_seguridad_update" ON public.estadisticas_seguridad;
DROP POLICY IF EXISTS "estadisticas_seguridad_delete" ON public.estadisticas_seguridad;

CREATE POLICY "estadisticas_seguridad_insert" ON public.estadisticas_seguridad FOR INSERT WITH CHECK (
  public.is_admin() OR public.user_area_id() = 'prevencion' OR public.has_module_edit('prevencion')
);
CREATE POLICY "estadisticas_seguridad_update" ON public.estadisticas_seguridad FOR UPDATE USING (
  public.is_admin() OR public.user_area_id() = 'prevencion' OR public.has_module_edit('prevencion')
);
CREATE POLICY "estadisticas_seguridad_delete" ON public.estadisticas_seguridad FOR DELETE USING (
  public.is_admin() OR public.user_area_id() = 'prevencion' OR public.has_module_edit('prevencion')
);

-- ── HERRAMIENTAS_ETI ──
DROP POLICY IF EXISTS "herramientas_eti_write" ON public.herramientas_eti;
DROP POLICY IF EXISTS "herramientas_eti_insert" ON public.herramientas_eti;
DROP POLICY IF EXISTS "herramientas_eti_update" ON public.herramientas_eti;
DROP POLICY IF EXISTS "herramientas_eti_delete" ON public.herramientas_eti;

CREATE POLICY "herramientas_eti_insert" ON public.herramientas_eti FOR INSERT WITH CHECK (
  public.is_admin() OR public.user_area_id() = 'eti' OR public.has_module_edit('eti')
);
CREATE POLICY "herramientas_eti_update" ON public.herramientas_eti FOR UPDATE USING (
  public.is_admin() OR public.user_area_id() = 'eti' OR public.has_module_edit('eti')
);
CREATE POLICY "herramientas_eti_delete" ON public.herramientas_eti FOR DELETE USING (
  public.is_admin() OR public.user_area_id() = 'eti' OR public.has_module_edit('eti')
);

-- ── PROYECTOS_INNOVACION ──
DROP POLICY IF EXISTS "proyectos_innovacion_write" ON public.proyectos_innovacion;
DROP POLICY IF EXISTS "proyectos_innovacion_insert" ON public.proyectos_innovacion;
DROP POLICY IF EXISTS "proyectos_innovacion_update" ON public.proyectos_innovacion;
DROP POLICY IF EXISTS "proyectos_innovacion_delete" ON public.proyectos_innovacion;

CREATE POLICY "proyectos_innovacion_insert" ON public.proyectos_innovacion FOR INSERT WITH CHECK (
  public.is_admin() OR public.user_area_id() = 'eti' OR public.has_module_edit('eti')
);
CREATE POLICY "proyectos_innovacion_update" ON public.proyectos_innovacion FOR UPDATE USING (
  public.is_admin() OR public.user_area_id() = 'eti' OR public.has_module_edit('eti')
);
CREATE POLICY "proyectos_innovacion_delete" ON public.proyectos_innovacion FOR DELETE USING (
  public.is_admin() OR public.user_area_id() = 'eti' OR public.has_module_edit('eti')
);

-- ── PLAN_INVERSION ──
DROP POLICY IF EXISTS "plan_inversion_write" ON public.plan_inversion;
DROP POLICY IF EXISTS "plan_inversion_insert" ON public.plan_inversion;
DROP POLICY IF EXISTS "plan_inversion_update" ON public.plan_inversion;
DROP POLICY IF EXISTS "plan_inversion_delete" ON public.plan_inversion;

CREATE POLICY "plan_inversion_insert" ON public.plan_inversion FOR INSERT WITH CHECK (
  public.is_admin() OR public.user_area_id() = 'eti' OR public.has_module_edit('eti')
);
CREATE POLICY "plan_inversion_update" ON public.plan_inversion FOR UPDATE USING (
  public.is_admin() OR public.user_area_id() = 'eti' OR public.has_module_edit('eti')
);
CREATE POLICY "plan_inversion_delete" ON public.plan_inversion FOR DELETE USING (
  public.is_admin() OR public.user_area_id() = 'eti' OR public.has_module_edit('eti')
);
