# StatArena API

Backend de **StatArena — Football Intelligence**. NestJS + TypeScript con
arquitectura modular (controllers → services → repositories → entities),
PostgreSQL + Redis, datos reales vía proveedor, tiempo real por SSE y seguridad
por defecto.

## Requisitos
- Node.js 20+
- Docker (para Postgres + Redis) **o** instancias propias
- Una API key gratuita de [API-Football](https://www.api-football.com/)

## Puesta en marcha (local)

```bash
cd server
cp .env.example .env          # edita JWT_SECRET y APIFOOTBALL_KEY
docker compose up -d db redis # levanta Postgres + Redis
npm install
npm run start:dev
```

API en `http://localhost:3001/api` · Swagger en `http://localhost:3001/api/docs`.

> Sin `APIFOOTBALL_KEY` el backend arranca igual: la sincronización queda inactiva
> y el frontend usa el modo demo. Con key, sincroniza datos reales a PostgreSQL.

### Todo con Docker

```bash
docker compose up --build
```

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Liveness |
| GET | `/api/leagues` | Ligas configuradas + temporada |
| GET | `/api/leagues/:id/standings` | Clasificación (cache → DB → proveedor) |
| GET | `/api/leagues/:id/top-scorers` | Goleadores (con foto real) |
| GET | `/api/leagues/:id/fixtures` | Calendario/resultados |
| GET | `/api/fixtures/:id` | Detalle de partido |
| GET | `/api/analysis/fixtures/:id` | **Análisis**: eventos, alineaciones, xG, momentum |
| GET | `/api/live/now` | Snapshot de partidos en vivo |
| GET | `/api/live/stream` | **SSE** de marcadores en vivo |
| POST | `/api/auth/register` · `/login` | Auth JWT |
| GET | `/api/auth/me` | Perfil (protegido) |

## Arquitectura
Ver [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Seguridad
Helmet, CORS allowlist, rate limiting (Throttler), validación estricta de entrada
(whitelist), JWT + bcrypt, filtro de errores que no filtra detalles internos,
secretos por entorno, contenedor sin root, consultas parametrizadas (ORM).

## Cambiar de proveedor de datos
Implementa `IFootballProvider` (`src/providers/football-provider.interface.ts`)
y enlázalo en `ProvidersModule`. El resto del sistema no cambia (DIP).
