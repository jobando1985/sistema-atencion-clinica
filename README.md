# 🏥 Sistema de Gestión Clínica

Aplicación web (PWA) para gestión de turnos, fichas clínicas, recetas y órdenes de estudio. Funciona en navegador de PC, tablet y celular, e instalable como app en móviles.

## Características

**Módulo Secretaría / Recepción**
- Alta y edición de pacientes con datos completos
- Gestión de turnos programados
- Cola de espera por orden de llegada (walk-in)
- Marcado de urgencias

**Módulo Médico**
- Autenticación segura con JWT
- Dashboard en tiempo real con pacientes en espera
- Ficha clínica integral: historial, alergias, antecedentes, alertas
- Registro de consultas con signos vitales
- Emisión de recetas y órdenes de estudio

**Prescripciones**
- Generación de receta/orden imprimible (PDF mediante diálogo de impresión del navegador)
- Envío directo por WhatsApp con un click (link wa.me, sin costo)

**Infraestructura**
- Base de datos PostgreSQL en la nube (Render plan gratuito)
- Backend Node.js + Express
- Frontend PWA instalable (sin dependencias de build)
- Datos protegidos en la nube — sin riesgo de pérdida por daño del dispositivo

---

## Estructura del proyecto

```
Sistema atención clinica/
├── backend/                  # API REST Node.js + Express
│   ├── db/
│   │   ├── schema.sql        # esquema PostgreSQL
│   │   └── seed.sql          # datos de ejemplo
│   ├── src/
│   │   ├── server.js         # arranque
│   │   ├── app.js            # configuración Express
│   │   ├── db/               # conexión y migraciones
│   │   ├── middleware/       # auth JWT
│   │   └── routes/           # auth, pacientes, turnos, consultas, recetas, estudios
│   ├── package.json
│   └── .env.example
├── frontend/                 # PWA (HTML + JS vanilla)
│   ├── index.html
│   ├── manifest.json         # configuración PWA
│   ├── sw.js                 # service worker
│   ├── styles.css
│   └── js/                   # módulos: auth, pacientes, turnos, consultas, recetas
└── render.yaml               # configuración de despliegue en Render
```

---

## Instalación local (para desarrollo)

### 1. Requisitos

- Node.js 18 o superior
- PostgreSQL 14+ corriendo en local (o una URL de conexión a una base en la nube)

### 2. Configurar backend

```bash
cd backend
npm install
cp .env.example .env
```

Editar `.env` y completar:

```
DATABASE_URL=postgresql://usuario:password@localhost:5432/clinica
JWT_SECRET=poner_aqui_una_cadena_larga_y_aleatoria
```

### 3. Crear las tablas y cargar datos de prueba

```bash
npm run migrate
npm run seed
```

### 4. Iniciar el servidor

```bash
npm start
```

Listo: la aplicación está disponible en `http://localhost:4000`.

**Cuentas de prueba** (creadas con el seed):

| Email | Contraseña | Rol |
|-------|-----------|-----|
| `medico@clinica.com` | `clinica123` | Médico |
| `secretaria@clinica.com` | `clinica123` | Secretaría |
| `admin@clinica.com` | `clinica123` | Administrador |

---

## Despliegue en Render (producción gratis)

1. Subí este proyecto a un repositorio de GitHub.
2. Entrá a [render.com](https://render.com) y creá una cuenta gratis.
3. En el dashboard, hacer clic en **"New +"** → **"Blueprint"**.
4. Conectá tu repositorio. Render detectará el `render.yaml` y creará automáticamente:
   - Una base PostgreSQL gratuita (`clinica-db`)
   - El servicio web Node.js (`clinica-app`)
5. Esperá unos minutos a que termine el deploy.
6. Una vez listo, **abrir una terminal en Render** (Settings → Shell) y ejecutar:
   ```bash
   npm run seed
   ```
   para cargar los usuarios y pacientes de prueba.
7. Acceder a la URL pública que te da Render (algo como `https://clinica-app.onrender.com`).

**Importante sobre el plan gratuito:**
- El servicio se duerme tras 15 minutos de inactividad. La primera consulta tarda ~30s en despertarlo.
- La base PostgreSQL gratuita se elimina a los 90 días si no se actualiza al plan pago. Hacer respaldos periódicos con `pg_dump`.

---

## Instalar como app en el celular (PWA)

1. Abrí la URL pública en Chrome (Android) o Safari (iOS) del celular.
2. **Android**: tocar el menú (⋮) → "Instalar aplicación" o "Añadir a pantalla de inicio".
3. **iOS**: tocar compartir (□↑) → "Añadir a pantalla de inicio".

La app queda como un ícono en el escritorio del teléfono y funciona en pantalla completa.

---

## Flujo de uso típico

### En recepción (secretaria)

1. Llega un paciente → buscarlo por DNI/nombre o crearlo si es nuevo
2. Si tiene turno programado: confirmar llegada
3. Si es walk-in: clic en "→ Cola" desde el listado de pacientes, o usar "Nuevo turno" sin fecha
4. El paciente queda en la cola por orden de llegada

### En consultorio (médico)

1. Entra al sistema → ve el dashboard con la cola en tiempo real
2. Clic en "Atender" en el primer paciente
3. Se abre la ficha clínica integral: alertas, alergias, historial, recetas previas, etc.
4. Registra la consulta con "+ Nueva consulta"
5. Si necesita prescribir: "+ Receta" → agrega medicamentos → emite
6. Al emitir la receta, se abre automáticamente la versión imprimible y aparece el botón "📱 WhatsApp" para enviar al paciente
7. Mismo flujo para órdenes de estudio

---

## API REST (referencia rápida)

Todas las rutas excepto `/api/auth/login` requieren header `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/auth/me` | Datos del usuario logueado |
| GET | `/api/pacientes?q=...` | Listar/buscar pacientes |
| POST | `/api/pacientes` | Crear paciente |
| GET | `/api/pacientes/:id/historial` | Ficha clínica integral |
| PUT | `/api/pacientes/:id` | Actualizar |
| GET | `/api/turnos/cola` | Cola actual de pacientes en espera |
| POST | `/api/turnos` | Crear turno o agregar a cola |
| PATCH | `/api/turnos/:id` | Cambiar estado |
| POST | `/api/consultas` | Registrar atención médica |
| POST | `/api/recetas` | Emitir receta |
| GET | `/api/recetas/:id` | Datos completos de una receta |
| POST | `/api/estudios` | Emitir orden de estudios |

---

## Seguridad

- Contraseñas almacenadas con `bcrypt` (10 rounds)
- JWT con expiración configurable
- Rate limiting en login (20 intentos cada 15 min)
- Helmet para headers de seguridad HTTP
- SSL obligatorio en producción para conexión a PostgreSQL

**Recomendaciones adicionales para producción:**
- Cambiar `JWT_SECRET` por una cadena aleatoria larga (Render lo genera automáticamente)
- Restringir `CORS_ORIGIN` al dominio del frontend
- Activar respaldos automáticos de la base
- Considerar pasar al plan pago de Render para evitar pausas por inactividad

---

## Próximos pasos sugeridos

- Reportes y estadísticas (consultas por médico, pacientes atendidos, etc.)
- Generación nativa de PDF con `pdfkit` (en vez del diálogo de impresión)
- Adjuntar archivos a la ficha del paciente (estudios escaneados, imágenes)
- Recordatorios automáticos de turnos por WhatsApp
- Multi-tenancy si el sistema se usa en más de una clínica
- Exportación de historial clínico a PDF

---

## Licencia

Proyecto privado. Uso interno de la clínica.
