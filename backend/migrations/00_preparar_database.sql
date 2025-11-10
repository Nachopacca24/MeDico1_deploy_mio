-- ============================================
-- Script de preparación para importar dump de PostgreSQL
-- Ejecutar ANTES de importar el dump
-- ============================================

-- Crear el esquema public si no existe
CREATE SCHEMA IF NOT EXISTS public;

-- Establecer permisos
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Establecer el search_path
SET search_path TO public;

-- Mensaje de confirmación
SELECT 'Esquema public creado correctamente. Ahora puedes importar el dump.' as mensaje;
