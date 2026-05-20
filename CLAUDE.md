# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sistema de Gestión Clínica** is a PWA (Progressive Web App) for managing medical clinic operations. It provides appointment scheduling, patient records (fichas clínicas), prescriptions, and study orders. The system is built with Node.js + Express backend and vanilla JavaScript frontend, designed to work on desktop, tablet, and mobile devices with offline-capable PWA installation.

### Tech Stack
- **Backend**: Node.js 18+, Express 4.x, PostgreSQL 14+
- **Frontend**: Vanilla JavaScript (no build tools), HTML5, CSS3, PWA with Service Worker
- **Authentication**: JWT with bcrypt password hashing
- **Deployment**: Render (free tier compatible)

## Quick Start

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with DATABASE_URL and JWT_SECRET
npm run migrate   # Create tables from schema.sql
npm run seed      # Load test data
npm start         # Start server on http://localhost:4000
```

For development with auto-reload:
```bash
npm run dev       # Uses nodemon
```

### Frontend
The frontend is served statically by the backend at the root path. No build step required. Access at `http://localhost:4000` after starting the backend.

### Test Credentials
After seeding, use these accounts:
- **Médico**: medico@clinica.com / clinica123
- **Secretaria**: secretaria@clinica.com / clinica123
- **Admin**: admin@clinica.com / clinica123

## Architecture

### Backend Structure (`/backend/src`)

**Database Layer** (`/db`)
- `pool.js`: PostgreSQL connection pool with SSL handling for production (Render)
- `migrate.js`: Executes `/db/schema.sql` to create tables and indexes
- `runSeed.js`: Populates test users and patients with dynamically bcrypt-hashed passwords (used by `npm run seed`); `backend/db/seed.sql` is a static alternative with pre-hashed passwords for direct psql loading

**Middleware** (`/middleware`)
- `auth.js`: JWT verification middleware (`requireAuth`) and role-based access control (`requireRole`)

**Routes** (`/routes`)
- `auth.js`: POST `/api/auth/login` (rate-limited), GET `/api/auth/me` (requires auth)
- `pacientes.js`: CRUD operations with search by name/DNI; includes GET `/api/pacientes/:id/historial` which aggregates patient data (recent consultas, recetas, estudios)
- `turnos.js`: Appointment queue management (both programmed appointments and walk-in "cola" by arrival order); states: programado, en_espera, en_atencion, atendido, cancelado, ausente
- `consultas.js`: Medical consultation records (vitals: peso, altura, presión, temperatura)
- `recetas.js`: Prescription generation with JSONB medicamentos array
- `estudios.js`: Study orders with JSONB estudios_solicitados array

**Core**

- `app.js`: Express configuration with CORS, Helmet CSP disabled, Morgan logging, rate limiting on auth routes; serves frontend as SPA fallback; exposes `GET /health` for uptime checks
- `server.js`: Entry point that validates DB connection then starts server

### Frontend Structure (`/frontend`)

**HTML/Assets**
- `index.html`: Single-page app container with modal overlay and toast notifications
- `manifest.json`: PWA configuration (standalone display, theme colors)
- `sw.js`: Service Worker with network-first strategy for API, cache-first for static assets
- `styles.css`: Responsive layout with sidebar navigation, form styling, modal dialogs
- `icon.svg`: App icon used in PWA installation

**JavaScript Modules** (`/js`)
- `api.js`: HTTP client abstraction (GET, POST, PUT, PATCH, DELETE) with Bearer token management; handles 401 by clearing session and redirecting to login
- `auth.js`: Login page render and session handling
- `router.js`: Hash-based router (#/login, #/dashboard, #/pacientes, #/ficha/:pacienteId) with view dispatch
- `app.js`: Main layout with sidebar navigation and view switching
- `utils.js`: DOM helpers (el(), $(), $$() for DOM manipulation)
- `pacientes.js`: Patient list/search and detail edit modals
- `turnos.js`: Appointment queue display and state management (real-time "cola" view)
- `consultas.js`: Medical consultation form with vital signs entry
- `recetas.js`: Handles both prescriptions AND study orders — contains `openRecetaForm`, `openEstudioForm`, print functions (`imprimirReceta`, `imprimirEstudio`), WhatsApp share functions, and self-contained HTML document generation for printable PDFs via browser print dialog

## Database Schema Highlights

**Key Tables**
- `usuarios`: rol IN ('medico', 'secretaria', 'admin'); matricula/especialidad for doctors
- `pacientes`: Full patient profile with alergias, antecedentes, patologias, notas_alerta (critical alerts)
- `turnos`: fecha_turno NULL indicates walk-in queue entry; llegada_en tracks arrival time for FIFO ordering
- `consultas`: Links paciente + medico; stores vitals and clinical notes
- `recetas`: JSONB medicamentos array with {nombre, dosis, via, frecuencia, duracion, indicaciones}
- `estudios`: JSONB estudios_solicitados array with {nombre, tipo, indicaciones}

**Triggers**
- Auto-update `actualizado_en` timestamp on pacientes and turnos modifications

## Common Development Tasks

### Adding a New API Endpoint
1. Create route handler in `/backend/src/routes/yourfeature.js`
2. Use `requireAuth` middleware for protected routes; `requireRole('medico')` for doctor-only access
3. Leverage `pool.query()` with parameterized queries to prevent SQL injection
4. Register route in `app.js` with `app.use('/api/yourfeature', yourfeatureRoutes)`
5. On frontend, call via `Api.get('/yourfeature')`, `Api.post('/yourfeature', data)`, etc.

### Modifying the Database Schema
1. Edit `/backend/db/schema.sql` (the source of truth)
2. For existing databases: manually run migration SQL via psql or in the migration script
3. Re-run `npm run migrate` in fresh environments
4. Update seed data in `/backend/src/db/runSeed.js` if needed

### Styling and Responsive Design
- All CSS in `/frontend/styles.css`; no CSS frameworks, pure CSS Grid/Flexbox
- Sidebar layout uses CSS Grid with media queries for mobile collapse
- Modal system with overlay and z-index management
- Toast notifications appended to #toast-container

### PWA Installation
- Service Worker caches essential assets (index.html, styles.css, manifest.json, icon.svg)
- Network-first strategy for API calls (always attempts fetch first)
- Works offline for cached pages; API calls fail gracefully with error messages

## Security Considerations

- **JWT**: Signed with `JWT_SECRET` from environment; default 12h expiration
- **Passwords**: Bcrypt with 10 rounds (see `runSeed.js`)
- **Rate Limiting**: 20 login attempts per 15 minutes
- **CORS**: Configurable via `CORS_ORIGIN` env var; defaults to "*" in development
- **SQL Injection**: All queries use parameterized statements with `pool.query(sql, [params])`
- **Role-Based Access**: Enforced at route level with middleware
- **Production HTTPS**: Database connections require SSL on Render; set in pool.js via NODE_ENV check

## Deployment (Render)

The `render.yaml` blueprint automatically:
1. Creates a free PostgreSQL database
2. Deploys Node.js service to `/backend` directory
3. Runs `npm install && npm run migrate` on build
4. Sets `NODE_ENV=production` and generates `JWT_SECRET`
5. Exposes app at https://clinica-app.onrender.com

**Post-Deploy**: Connect to Render shell and run `npm run seed` to load test data.

**Free Tier Caveats**:
- Service sleeps after 15 minutes of inactivity (~30s wake time on next request)
- PostgreSQL removed after 90 days without paid upgrade; use `pg_dump` for backups

## Debugging Tips

- Check backend logs: look for `[OK]`, `[ERROR]`, `[DB]` prefixes for quick filtering
- Frontend errors: open browser DevTools console; API errors appear as toast notifications
- Token issues: clear localStorage (token + usuario keys) and re-login
- Database connection: verify `DATABASE_URL` in `.env` and check PostgreSQL is running
- CORS issues: adjust `CORS_ORIGIN` if frontend and backend are on different domains
