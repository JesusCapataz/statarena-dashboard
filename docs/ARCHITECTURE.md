# StatArena — Arquitectura del sistema

Plataforma profesional de inteligencia de fútbol: datos reales (clasificaciones,
equipos, jugadores con foto, partidos, eventos, análisis) con actualización cercana
al tiempo real.

## 1. Visión general

```
                ┌───────────────────────────────────────────────┐
                │                  Frontend (web)                │
                │  Vanilla JS + SSE  ·  api-client (real|demo)   │
                └───────────────┬───────────────────────────────┘
                                │ HTTPS / SSE
                ┌───────────────▼───────────────────────────────┐
                │                Backend (NestJS)                │
                │  Controllers → Services → Repositories         │
                │  Auth(JWT) · Throttler · Helmet · Validation   │
                │  Cache (Redis) · Scheduler (ETL) · SSE         │
                └───────┬───────────────────────┬───────────────┘
                        │                       │
              ┌─────────▼────────┐     ┌────────▼─────────┐
              │  PostgreSQL      │     │   Redis           │
              │  (system of      │     │  cache + pub/sub  │
              │   record + JSONB)│     │  de live          │
              └──────────────────┘     └───────────────────┘
                        ▲
                        │ ETL / sync (cron + backoff)
              ┌─────────┴───────────────────────────────────────┐
              │   Proveedores (adapter IFootballProvider)        │
              │   API-Football (primario) · football-data.org    │
              │   · StatsBomb open-data (análisis histórico)     │
              └──────────────────────────────────────────────────┘
```

## 2. ¿Tiempo real? La verdad

No existe API **gratuita** con tiempo real **continuo** de todas las grandes ligas.
Los planes gratis tienen rate-limit y retraso. Estrategia profesional:

1. **Sincronizar** del proveedor a PostgreSQL con jobs programados (frecuencia alta en
   ventanas de partido, baja fuera de ellas) → nuestro sistema deja de depender del
   rate-limit.
2. **Cachear** en Redis (cache-aside) las respuestas calientes.
3. **Empujar** cambios a los clientes por **SSE** (`/live/stream`). El backend hace
   polling al proveedor y difunde sólo los deltas.
4. Para producción real-time-real: cambiar el adapter a Sportmonks/Opta/Sportradar
   (de pago) sin tocar la app.

## 3. ¿SQL o NoSQL? → PostgreSQL

El dominio es altamente relacional (League → Season → Team → Player → Fixture →
Event → Standing) y requiere joins y agregaciones (goleadores, xG acumulado, rankings
con window functions) e integridad ACID. **PostgreSQL** como sistema de registro, con
columnas **JSONB** para estadísticas variables (híbrido), y **Redis** para caché y
pub/sub de live. NoSQL se descarta como fuente de verdad (peor integridad/joins).

## 4. Capas (SOLID)

- **Controller**: HTTP, validación (DTO), auth/guards, documentación (Swagger). Sin lógica.
- **Service**: reglas de negocio, orquestación, caché. Depende de abstracciones.
- **Repository**: acceso a datos (TypeORM). Único que conoce la persistencia.
- **Provider (adapter)**: integración externa detrás de `IFootballProvider` (DIP).
- **Entity / DTO**: modelo de dominio y contratos de E/S.

## 5. Ciberseguridad (buenas prácticas)

- Secretos por entorno (`.env`, nunca en el repo) + validación de env al arrancar.
- `helmet` (cabeceras), CORS allowlist, `@nestjs/throttler` (rate limiting).
- Validación/whitelisting de entrada (`class-validator`, `ValidationPipe` global).
- Auth con **JWT** firmado + `bcrypt` para contraseñas; guards por rol.
- Sin secretos en logs; filtro global de excepciones que no filtra detalles internos.
- Consultas parametrizadas (ORM) → sin SQL injection.

## 6. Apartados del producto (roadmap amplio)

Ligas · Clasificación · Equipos (perfil, plantilla, calendario, stats) · Jugadores
(perfil con foto real, heatmap, percentiles) · Partidos · **Análisis de partido**
(eventos minuto a minuto, alineaciones/formación, posesión, tiros, xG, momentum, H2H) ·
Comparador (equipos y jugadores) · Goleadores/Asistentes · Estadísticas avanzadas ·
Predicciones · Buscador global. Todos los paneles aplican el sistema de diseño
(`.kiro/steering/statarena-design-system.md`) y las 5 skills.
