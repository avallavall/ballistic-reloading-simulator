# Simulador de Balistica de Precision

## Descripcion
Simulador web de balistica interior para recarga de municion de precision.
Stack: Next.js 14 (frontend) + FastAPI/Python 3.12 (backend) + PostgreSQL 16 + Docker Compose.

## Estructura del Proyecto
```
simulador_balistica/
├── CLAUDE.md                 # Este fichero
├── docker-compose.yml        # 4 servicios: db, backend, frontend, pgadmin
├── .env.example              # Variables de entorno
├── .gitignore
├── docs/
│   ├── PROJECT_PLAN.md       # Plan completo del proyecto (6 fases)
│   ├── physics_core.md       # Documento de fisica (1097 lineas, 20 refs academicas)
│   ├── materials_database.md # Base de datos de materiales (554 lineas)
│   └── grtools_analysis.md   # Analisis competitivo vs GRTools (330 lineas)
├── backend/
│   ├── Dockerfile
│   ├── alembic.ini           # Configuracion de migraciones
│   ├── requirements.txt
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_thermodynamics.py   # 13 tests
│   │   ├── test_solver.py          # 21 tests
│   │   ├── test_structural.py      # 28 tests
│   │   ├── test_harmonics.py       # 17 tests
│   │   ├── test_schema_validation.py # 30 tests
│   │   └── test_api_integration.py  # 18 tests
│   └── app/
│       ├── main.py           # FastAPI app (CORS, middleware, health check)
│       ├── config.py         # Pydantic Settings
│       ├── middleware.py     # Rate limiting (slowapi), error handler, timing
│       ├── core/             # Motor de fisica
│       │   ├── thermodynamics.py    # Noble-Abel, Vieille, form function
│       │   ├── internal_ballistics.py # Lagrange, bullet acceleration
│       │   ├── solver.py           # ODE integrador (4 vars: Z, x, v, Q_loss)
│       │   ├── structural.py       # Lame hoop stress, case expansion, erosion
│       │   ├── harmonics.py        # Cantilever freq, OCW barrel times
│       │   └── heat_transfer.py    # Modelo Thornhill de perdida de calor
│       ├── models/           # SQLAlchemy ORM (6 tablas)
│       ├── schemas/          # Pydantic v2 DTOs (con validacion de limites fisicos)
│       ├── api/              # Endpoints REST
│       │   ├── router.py     # /api/v1 prefix
│       │   ├── powders.py    # CRUD
│       │   ├── bullets.py    # CRUD
│       │   ├── cartridges.py # CRUD
│       │   ├── rifles.py     # CRUD
│       │   ├── loads.py      # CRUD
│       │   ├── simulate.py   # /simulate, /simulate/direct, /simulate/ladder, /simulate/export
│       │   └── chrono.py     # /chrono/import (Labradar/MagnetoSpeed CSV)
│       ├── db/
│       │   ├── session.py    # AsyncSession factory
│       │   └── migrations/   # Alembic (async, migracion inicial incluida)
│       └── seed/             # Datos iniciales (22 polvoras, balas, cartuchos, 5 rifles)
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── app/
        │   ├── layout.tsx         # Root layout (dark mode, Providers)
        │   ├── page.tsx           # Dashboard
        │   ├── simulate/page.tsx  # Simulacion (P(t), V(x), structural, harmonics, CSV export)
        │   ├── ladder/page.tsx    # Ladder Test (vel vs carga, presion vs carga)
        │   ├── drawings/page.tsx  # 2D SVG technical drawings (assembly, cross-section, chamber)
        │   ├── powders/page.tsx   # CRUD con edicion inline
        │   ├── bullets/page.tsx   # CRUD con edicion inline
        │   ├── cartridges/page.tsx # CRUD con edicion inline
        │   ├── rifles/page.tsx    # CRUD con edicion inline
        │   └── loads/page.tsx     # CRUD con edicion inline
        ├── components/
        │   ├── ui/               # Badge, Button, Card, Input, Select, Spinner, Table
        │   ├── layout/           # Header, Sidebar (con Cartuchos + Ladder Test), AppShell
        │   ├── forms/            # SimulationForm, LoadForm
        │   ├── drawings/          # SVG technical drawings (Phase 12)
        │   │   ├── AssemblyDrawing.tsx      # Barrel+cartridge+bullet assembly
        │   │   ├── BulletProfile.tsx        # Standalone bullet profile drawing
        │   │   ├── CartridgeCrossSection.tsx # Cartridge cross-section with hatching
        │   │   ├── ChamberDrawing.tsx       # Chamber dimensions drawing
        │   │   ├── DimensionLabel.tsx       # Reusable dimension annotation
        │   │   ├── HatchPatterns.tsx        # SVG hatch pattern definitions
        │   │   └── TitleBlock.tsx           # Drawing title block
        │   └── charts/
        │       ├── PressureTimeChart.tsx    # P(t) con linea SAAMI
        │       ├── VelocityDistanceChart.tsx # V(x)
        │       └── HarmonicsChart.tsx       # OBT nodes + barrel time
        ├── hooks/            # usePowders, useBullets, useCartridges, useRifles, useLoads, useSimulation
        │                     # Cada hook incluye useCreate*, useUpdate*, useDelete*
        └── lib/
            ├── api.ts        # Cliente HTTP (CRUD + simulate + ladder + chrono)
            ├── types.ts      # Interfaces TS (incluye campos structural/harmonics)
            ├── utils.ts      # Conversiones, safety levels, formateo
            ├── drawings/          # Drawing computation (pure, no React)
            │   ├── dimension-layout.ts  # Greedy interval scheduling for dim placement
            │   ├── themes.ts           # Blueprint and modern theme definitions
            │   ├── title-block.ts      # Title block data computation
            │   └── types.ts            # DimensionAnnotation, DrawingTheme types
            └── geometry/          # Bullet/cartridge geometry engines
                ├── bullet-geometry.ts   # SVG path + ProfilePoint[] generation
                └── types.ts            # BulletDimensions, ProfilePoint types

```

## Estado por Fases

### FASE 0: Investigacion y Documentacion - COMPLETADA
- [x] `docs/physics_core.md` - Documento completo de fisica (Secciones A-F, 20 refs)
- [x] `docs/materials_database.md` - Datos empiricos (22 polvoras, 12 cartuchos, 15+ balas)
- [x] `docs/PROJECT_PLAN.md` - Plan del proyecto con 6 fases
- [x] `docs/grtools_analysis.md` - Analisis competitivo vs GRTools con roadmap priorizado

### FASE 1: Infraestructura Docker - COMPLETADA
- [x] `docker-compose.yml` - 4 servicios (db, backend, frontend, pgadmin)
- [x] `backend/Dockerfile` - Python 3.12-slim
- [x] `frontend/Dockerfile` - Node 20-alpine
- [x] `.env.example` - Variables de entorno

### FASE 2: Motor de Fisica (backend/app/core/) - COMPLETADA
- [x] `thermodynamics.py` - Noble-Abel EOS, Vieille burn rate, form function, flame temperature
- [x] `internal_ballistics.py` - Lagrange pressure gradient, bullet acceleration, free volume
- [x] `solver.py` - Integrador ODE de 4 variables (RK45 via scipy.integrate.solve_ivp)
  - Sistema ODE: dZ/dt, dx/dt, dv/dt, dQ_loss/dt
  - Modelo Thornhill de perdida de calor integrado (h=2000 W/m2K por defecto)
  - Calculo integrado de structural (hoop stress, case expansion, erosion)
  - Calculo integrado de harmonics (barrel frequency, OBT, obt_match)
  - SimResult incluye: presion, velocidad, curvas, structural, harmonics
  - Validacion SAAMI + warnings
- [x] `structural.py` - Lame hoop stress, case expansion, Lawton erosion
- [x] `harmonics.py` - Cantilever frequency, muzzle deflection, OCW barrel times
- [x] `heat_transfer.py` - Wall heat flux, convective area, gas temperature (Thornhill)

### FASE 3: Modelos y API REST - COMPLETADA
#### Modelos ORM (backend/app/models/) - COMPLETADOS
- [x] `base.py` - DeclarativeBase + UUIDMixin
- [x] `powder.py` - 10 campos (name, manufacturer, burn_rate_*, force_constant, etc.)
- [x] `bullet.py` - 9 campos (weight_grains, diameter_mm, bc_g1/g7, etc.)
- [x] `cartridge.py` - 8 campos (saami_max_pressure, case_capacity, bore_diameter, etc.)
- [x] `rifle.py` - 7 campos + FK a cartridge + round_count
- [x] `load.py` - FK a powder, bullet, rifle + coal_mm, seating_depth_mm
- [x] `simulation.py` - Results con JSONB + campos structural/harmonics

#### Schemas Pydantic (backend/app/schemas/) - COMPLETADOS
- [x] Schemas Create/Update/Response para cada entidad
- [x] Validacion de limites fisicos en todos los schemas (Field gt/lt/le)
- [x] SimulationRequest, LadderTestRequest, DirectSimulationRequest/Response

#### Endpoints API (backend/app/api/) - COMPLETADOS
- [x] `powders.py` - CRUD completo (GET list, POST, GET by id, PUT, DELETE)
- [x] `bullets.py` - CRUD completo
- [x] `cartridges.py` - CRUD completo
- [x] `rifles.py` - CRUD completo
- [x] `loads.py` - CRUD completo
- [x] `simulate.py` - POST /simulate, POST /simulate/direct, POST /simulate/ladder, GET /simulate/export/{id}
- [x] `chrono.py` - POST /chrono/import (Labradar/MagnetoSpeed CSV parser)
- [x] `router.py` - Todos los routers bajo /api/v1 + rate limiting en /simulate/*

#### Middleware y Seguridad - COMPLETADOS
- [x] `middleware.py` - Rate limiting (slowapi: 10/min simulate, 5/min ladder), error handler global, X-Process-Time-Ms
- [x] CORS configurado (origins configurables via CORS_ORIGINS env, methods restringidos, headers restringidos)
- [x] Health check: GET /api/v1/health (verifica conectividad DB)

#### Database - COMPLETADA
- [x] **Tablas auto-creadas** via `create_all()` en startup (fallback dev)
- [x] **Alembic configurado** - Migraciones async con migracion inicial de 6 tablas
- [x] **Seed data** - 22 polvoras, balas, cartuchos, 5 rifles por defecto

### FASE 4: Frontend - COMPLETADA
#### Configuracion - COMPLETADA
- [x] Next.js 14 con App Router + TypeScript 5.6.3
- [x] Tailwind CSS 3.4.13 + PostCSS
- [x] TanStack React Query 5.59.0
- [x] Recharts 2.13.0

#### Componentes UI - COMPLETADOS
- [x] Badge, Button, Card, Input, Select, Spinner, Table

#### Layout - COMPLETADO
- [x] Header, Sidebar (Dashboard, Simulacion, Ladder Test, Cargas, Polvoras, Proyectiles, Cartuchos, Rifles), AppShell

#### Paginas - COMPLETADAS
- [x] `page.tsx` - Dashboard con stats y acceso rapido
- [x] `simulate/page.tsx` - Simulacion completa con:
  - Formulario (rifle, bala, polvora, carga, COAL, seating depth)
  - ResultCards: presion pico, velocidad boca, barrel time
  - PressureTimeChart + VelocityDistanceChart
  - StructuralCards: hoop stress, case expansion, erosion
  - HarmonicsChart: OBT nodes + barrel time match
  - Boton Exportar CSV (client-side)
- [x] `ladder/page.tsx` - Ladder Test con:
  - Formulario: rifle/bala/polvora + rango de cargas (inicio, fin, paso)
  - Grafico velocidad vs carga + presion vs carga con linea SAAMI
  - Tabla de resultados por escalon con badges de seguridad
- [x] `powders/page.tsx` - CRUD con creacion y edicion inline
- [x] `bullets/page.tsx` - CRUD con creacion y edicion inline
- [x] `cartridges/page.tsx` - CRUD con creacion y edicion inline
- [x] `rifles/page.tsx` - CRUD con creacion y edicion inline
- [x] `loads/page.tsx` - CRUD con creacion y edicion inline

#### Formularios - COMPLETADOS
- [x] `SimulationForm.tsx` - Formulario de simulacion directa
- [x] `LoadForm.tsx` - Formulario de cargas
- [x] Edicion inline en todas las paginas CRUD (boton Editar -> form prellenado -> PUT)

#### Graficos - COMPLETADOS
- [x] `PressureTimeChart.tsx` - P(t) con linea SAAMI (PSI->MPa)
- [x] `VelocityDistanceChart.tsx` - V(x) (FPS->m/s)
- [x] `HarmonicsChart.tsx` - OBT nodes como lineas verticales + barrel time actual

#### Hooks - COMPLETADOS
- [x] usePowders, useBullets, useCartridges, useRifles, useLoads (CRUD completo con useCreate/useUpdate/useDelete)
- [x] useSimulation, useLadderTest

#### API Client + Types - COMPLETADOS
- [x] `api.ts` - Cliente HTTP completo (CRUD + simulate + ladder + chrono + health)
- [x] `types.ts` - Interfaces TS con campos structural/harmonics
- [x] `utils.ts` - Conversiones PSI/MPa, FPS/m/s, safety levels

### FASE 5: Testing - COMPLETADA
- [x] **127 tests totales**, 0 fallos
- [x] `test_thermodynamics.py` - 13 tests (Noble-Abel, Vieille, form function, flame temp)
- [x] `test_solver.py` - 21 tests (.308 Win simulation, curvas, overpressure, 4-var ODE)
- [x] `test_structural.py` - 28 tests (Lame hoop stress, case expansion, Lawton erosion)
- [x] `test_harmonics.py` - 17 tests (cantilever frequency, OCW, muzzle deflection)
- [x] `test_schema_validation.py` - 30 tests (limites fisicos en todos los schemas)
- [x] `test_api_integration.py` - 18 tests (CRUD, simulate, ladder, chrono, validation, async SQLite)

### FASE 6: Seguridad y QA - PARCIALMENTE COMPLETADA
- [x] Rate limiting en endpoints de simulacion (slowapi)
- [x] Validacion de inputs con limites fisicos en todos los schemas Pydantic
- [x] Middleware global de errores (JSON, no HTML 500s)
- [x] CORS restringido (origins, methods, headers configurables)
- [x] Header X-Process-Time-Ms para monitoring
- [ ] Auditoria de seguridad completa
- [ ] OWASP checks
- [ ] Tests E2E (Playwright/Cypress)

### Post-FASE: 2D SVG Technical Drawings - COMPLETADA
- [x] Drawing components: Assembly, Cross-Section, Chamber, BulletProfile
- [x] Pure computation libraries: dimension-layout, themes, title-block
- [x] Geometry engine: bullet-geometry.ts (SVG path + ProfilePoint[])
- [x] Drawings page at /drawings with tab navigation
- [x] PDF/PNG export via jsPDF + svg2pdf.js
- [x] Deep link from simulation results to drawings
- [x] Bullet preview in bullets/cartridges edit forms
- [x] Responsive SVG with viewBox + preserveAspectRatio

## Problemas Conocidos

### Resueltos
1. ~~Router no registrado en main.py~~ - COMPLETADO
2. ~~Tablas no se crean~~ - COMPLETADO (create_all + Alembic)
3. ~~No hay startup event~~ - COMPLETADO (lifespan con create_all + seed)
4. ~~Desajuste SimulationForm vs API~~ - COMPLETADO (endpoint /simulate/direct)
5. ~~Formato de curvas inconsistente~~ - COMPLETADO (frontend adaptado)
6. ~~Faltan paginas CRUD~~ - COMPLETADO (5 paginas con edicion inline)
7. ~~Tests unitarios insuficientes~~ - COMPLETADO (127 tests)
8. ~~Pagina de ladder test~~ - COMPLETADO
9. ~~Integracion structural/harmonics~~ - COMPLETADO
10. ~~HarmonicsChart~~ - COMPLETADO
11. ~~Alembic no configurado~~ - COMPLETADO
12. ~~Sobreprediccion presion ~2x~~ - MITIGADO (modelo Thornhill reduce 30-50%)

### Pendientes
- **Solver bootstrapping**: Z_PRIMER=0.01 necesario para iniciar combustion (Z=0 es equilibrio estable)
- **Calibracion heat loss**: h_coeff=2000 por defecto, puede necesitar ajuste fino por calibre
- **Tests E2E**: No hay tests end-to-end del frontend
- **Modelo de 3 curvas**: GRTools usa 3 curvas vs nuestras 2 (ver docs/grtools_analysis.md)

## Roadmap (Priorizacion de docs/grtools_analysis.md)

### Quick Wins (1-2 dias cada uno)
- [x] Toggle de unidades en UI (PSI/MPa, FPS/m/s)
- [x] Tooltips de ayuda en campos del formulario de simulacion
- [x] Calculo de retroceso/impulso
- [x] Tabla comparativa de polvoras
- [x] Modo Simple/Avanzado en formulario de simulacion

### Medio Plazo (1-2 semanas cada uno)
- [ ] Flujo de calibracion con datos de cronografo
- [x] Busqueda parametrica de polvoras
- [ ] Analisis de agrupaciones (shot groups)
- [ ] Inspector de validacion cruzada de inputs

### Largo Plazo (1+ mes)
- [ ] Modelo de combustion de 3 curvas
- [ ] Base de datos comunitaria de polvoras
- [ ] Modelado de gas port (semi-auto)
- [ ] Sensibilidad a temperatura

## Comandos de Desarrollo
```bash
# Levantar todo con Docker
docker-compose up --build

# Solo backend (dev local)
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# Solo frontend (dev local)
cd frontend && npm install && npm run dev

# Tests (127 tests, ~3s)
cd backend && python -m pytest tests/ -v

# Alembic (dentro de backend/)
alembic upgrade head              # Aplicar migraciones
alembic revision --autogenerate -m "descripcion"  # Nueva migracion
alembic downgrade -1              # Revertir una migracion

# PostgreSQL
# Host: localhost:5432 | User: balistica | Pass: balistica_dev_2024 | DB: balistica

# pgAdmin
# Host: localhost:5050 | User: admin@balistica.dev | Pass: admin
```

## Dependencias Clave
- **Backend**: FastAPI 0.115.6, SQLAlchemy 2.0.36, asyncpg, Alembic 1.14.1, NumPy 2.2.1, SciPy 1.15.0, slowapi 0.1.9
- **Frontend**: Next.js 14.2.15, React 18.3.1, TanStack Query 5.59.0, Recharts 2.13.0, Tailwind 3.4.13, jsPDF 2.x, svg2pdf.js
- **Testing**: pytest, pytest-asyncio, aiosqlite, httpx

## Convenciones
- UUIDs como primary keys en todas las tablas
- Async-first (asyncpg + AsyncSession)
- Unidades internas del solver en SI (Pa, m, kg, s)
- Unidades de API: PSI para presion, FPS para velocidad, mm para distancias, grains para masa
- Unidades de display en frontend: MPa para presion, m/s para velocidad
- Interfaz en espanol
- Schemas Pydantic con `model_config = {"from_attributes": True}`
- Validacion de limites fisicos en todos los schemas Create/Update
- Drawing computation libraries are pure (zero React imports), consumed by SVG components
- SVG drawings use viewBox + preserveAspectRatio="xMidYMid meet" (no fixed width/height)
- userSpaceOnUse for all SVG hatching patterns
- forwardRef on drawing components for SVG export serialization
