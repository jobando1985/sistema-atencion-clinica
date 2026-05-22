-- =====================================================================
-- Sistema de Gestión Clínica - Esquema de Base de Datos (PostgreSQL)
-- =====================================================================
-- Este archivo crea todas las tablas necesarias para el sistema.
-- Ejecutarlo una sola vez sobre una base PostgreSQL limpia.
-- =====================================================================

-- Extensión necesaria para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- USUARIOS DEL SISTEMA (médicos y secretarias)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('medico', 'secretaria', 'admin')),
    matricula VARCHAR(50),               -- solo médicos
    especialidad VARCHAR(120),           -- solo médicos
    telefono VARCHAR(30),
    activo BOOLEAN DEFAULT TRUE,
    debe_cambiar_clave BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

-- ---------------------------------------------------------------------
-- RELACIÓN SECRETARIA ↔ MÉDICO
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS secretaria_medico (
    secretaria_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    medico_id     UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    PRIMARY KEY (secretaria_id, medico_id)
);

-- ---------------------------------------------------------------------
-- PACIENTES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dni VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    apellido VARCHAR(120) NOT NULL,
    fecha_nacimiento DATE,
    sexo VARCHAR(15),
    telefono VARCHAR(30),                -- número con código país (ej. 5491133334444) para wa.me
    email VARCHAR(150),
    direccion TEXT,
    obra_social VARCHAR(120),
    nro_afiliado VARCHAR(50),
    grupo_sanguineo VARCHAR(10),
    alergias TEXT,                       -- texto libre
    antecedentes TEXT,                   -- texto libre
    patologias TEXT,                     -- texto libre
    notas_alerta TEXT,                   -- avisos críticos para el médico
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pacientes_apellido ON pacientes(apellido);
CREATE INDEX IF NOT EXISTS idx_pacientes_dni ON pacientes(dni);

-- ---------------------------------------------------------------------
-- TURNOS / COLA DE ESPERA
-- ---------------------------------------------------------------------
-- Si fecha_turno es NULL -> es atención por orden de llegada (walk-in)
-- Si fecha_turno tiene valor -> es turno programado
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    medico_id UUID REFERENCES usuarios(id),
    fecha_turno TIMESTAMPTZ,             -- NULL = cola por orden de llegada
    llegada_en TIMESTAMPTZ DEFAULT NOW(),
    estado VARCHAR(20) NOT NULL DEFAULT 'en_espera'
        CHECK (estado IN ('programado', 'en_espera', 'en_atencion', 'atendido', 'cancelado', 'ausente')),
    motivo TEXT,
    prioridad INTEGER DEFAULT 0,         -- 0 normal, 1 urgente
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turnos_estado ON turnos(estado);
CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos(fecha_turno);
CREATE INDEX IF NOT EXISTS idx_turnos_llegada ON turnos(llegada_en);

-- ---------------------------------------------------------------------
-- CONSULTAS (registros de cada atención médica)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consultas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    medico_id UUID NOT NULL REFERENCES usuarios(id),
    turno_id UUID REFERENCES turnos(id),
    fecha TIMESTAMPTZ DEFAULT NOW(),
    motivo_consulta TEXT,
    sintomas TEXT,
    diagnostico TEXT,
    indicaciones TEXT,
    observaciones TEXT,
    peso NUMERIC(5,2),
    altura NUMERIC(4,2),
    presion VARCHAR(20),
    temperatura NUMERIC(4,2),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultas_paciente ON consultas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_consultas_medico ON consultas(medico_id);
CREATE INDEX IF NOT EXISTS idx_consultas_fecha ON consultas(fecha DESC);

-- ---------------------------------------------------------------------
-- RECETAS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recetas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consulta_id UUID REFERENCES consultas(id) ON DELETE SET NULL,
    paciente_id UUID NOT NULL REFERENCES pacientes(id),
    medico_id UUID NOT NULL REFERENCES usuarios(id),
    fecha TIMESTAMPTZ DEFAULT NOW(),
    medicamentos JSONB NOT NULL,         -- [{nombre, dosis, via, frecuencia, duracion, indicaciones}]
    diagnostico TEXT,
    observaciones TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recetas_paciente ON recetas(paciente_id);

-- ---------------------------------------------------------------------
-- ÓRDENES DE ESTUDIO
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS estudios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consulta_id UUID REFERENCES consultas(id) ON DELETE SET NULL,
    paciente_id UUID NOT NULL REFERENCES pacientes(id),
    medico_id UUID NOT NULL REFERENCES usuarios(id),
    fecha TIMESTAMPTZ DEFAULT NOW(),
    estudios_solicitados JSONB NOT NULL, -- [{nombre, tipo, indicaciones}]
    diagnostico_presuntivo TEXT,
    observaciones TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estudios_paciente ON estudios(paciente_id);

-- ---------------------------------------------------------------------
-- TRIGGER para mantener actualizado_en
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pacientes_upd ON pacientes;
CREATE TRIGGER trg_pacientes_upd
    BEFORE UPDATE ON pacientes
    FOR EACH ROW EXECUTE FUNCTION trg_set_actualizado_en();

DROP TRIGGER IF EXISTS trg_turnos_upd ON turnos;
CREATE TRIGGER trg_turnos_upd
    BEFORE UPDATE ON turnos
    FOR EACH ROW EXECUTE FUNCTION trg_set_actualizado_en();

-- ---------------------------------------------------------------------
-- MIGRACIONES INCREMENTALES (idempotentes)
-- Se ejecutan siempre; no hacen nada si la columna/tabla ya existe.
-- ---------------------------------------------------------------------
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS debe_cambiar_clave BOOLEAN DEFAULT FALSE;
