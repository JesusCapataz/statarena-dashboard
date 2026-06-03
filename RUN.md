# Cómo encender StatArena (frontend + backend)

## Frontend (estático, sin dependencias)
Abre `index.html` en el navegador, o sírvelo:
```bash
python3 -m http.server 8080
# http://localhost:8080
```
Es **responsive** (móvil, tablet y ventana minimizada). En modo demo usa datos
simulados deterministas + escudos/fotos reales por CDN.

## Backend (datos reales + tiempo real) — lo encendemos juntos

Requisitos: Docker + Node 20. Tienes una API key gratis en https://www.api-football.com/

```bash
cd server
cp .env.example .env
#  edita .env:
#   JWT_SECRET=  (genera uno: openssl rand -hex 48)
#   APIFOOTBALL_KEY=  (tu clave de API-Football)

# 1) Base de datos + caché en contenedores
docker compose up -d db redis

# 2) Dependencias y arranque en desarrollo
npm install
npm run start:dev
```
- API:    http://localhost:3001/api
- Swagger: http://localhost:3001/api/docs
- Health:  http://localhost:3001/api/health

### O todo con Docker (API incluida)
```bash
cd server
cp .env.example .env   # rellena las claves
docker compose up --build
```

## Conectar el frontend al backend (modo live)
En la consola del navegador (una vez):
```js
localStorage.setItem('sa-api-base', 'http://localhost:3001/api');
location.reload();
```
El footer del menú mostrará **“EN VIVO · N en juego”** vía SSE.
Para volver a demo: `localStorage.removeItem('sa-api-base')`.

## Notas
- Sin `APIFOOTBALL_KEY` el backend arranca igual (sin sincronizar) y el frontend
  sigue en demo. Con clave, sincroniza clasificación, goleadores y partidos a
  PostgreSQL y sirve live por SSE.
- Seguridad lista por defecto: Helmet, CORS allowlist, rate limiting, validación
  estricta, JWT + bcrypt. Revisa `.env` antes de exponer en producción.
