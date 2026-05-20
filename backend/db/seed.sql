-- =====================================================================
-- Datos de prueba para el Sistema de Gestión Clínica
-- =====================================================================
-- IMPORTANTE: las contraseñas están hasheadas con bcrypt.
-- Contraseña de prueba para todos los usuarios: "clinica123"
-- =====================================================================

-- Usuario admin / médico de prueba
-- Hash bcrypt de "clinica123": $2b$10$8QzGUXNrEYg7P3JZk7Vd/.dB7p5xXyEvUWmZ3K6q5L9OZpJl3JZJK
INSERT INTO usuarios (id, nombre, email, password_hash, rol, matricula, especialidad, telefono)
VALUES
    ('11111111-1111-1111-1111-111111111111',
     'Dr. Juan Pérez', 'medico@clinica.com',
     '$2b$10$N7QrTQqXmZN6/2lQyHpKHerJ8nVc0TfQX1Z6c/PuJjYqEvVxKjY2y',
     'medico', 'MN 12345', 'Clínica Médica', '+5491133334444'),
    ('22222222-2222-2222-2222-222222222222',
     'María García', 'secretaria@clinica.com',
     '$2b$10$N7QrTQqXmZN6/2lQyHpKHerJ8nVc0TfQX1Z6c/PuJjYqEvVxKjY2y',
     'secretaria', NULL, NULL, '+5491155556666')
ON CONFLICT (email) DO NOTHING;

-- Pacientes de ejemplo
INSERT INTO pacientes (dni, nombre, apellido, fecha_nacimiento, sexo, telefono, email, obra_social, alergias, antecedentes, notas_alerta)
VALUES
    ('30123456', 'Carlos', 'Rodríguez', '1980-05-12', 'Masculino', '5491144445555', 'carlos@mail.com',
     'OSDE', 'Penicilina', 'Hipertensión arterial controlada', 'Anticoagulado con warfarina'),
    ('27987654', 'Ana', 'Martínez', '1975-09-23', 'Femenino', '5491166667777', 'ana@mail.com',
     'Swiss Medical', 'Ninguna', 'Diabetes tipo 2', NULL),
    ('35111222', 'Lucas', 'Fernández', '1992-02-08', 'Masculino', '5491188889999', NULL,
     'Particular', 'Polen, ácaros', 'Asma bronquial', 'Usa salbutamol de rescate')
ON CONFLICT (dni) DO NOTHING;
