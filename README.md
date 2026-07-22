# Mango App

Sistema de gestión para restaurante: backend Node.js/Express + frontend Vue 3.

## Estructura

| Carpeta | Rol |
|---------|-----|
| `src/` | Backend (API REST, WebSockets, PeerJS) |
| `frontend/src/` | Frontend Vue 3 (SPA) |
| `public/` | Assets estáticos compartidos (`img/`, `sounds/`, `favicon.ico`) |
| `frontend/dist/` | Build de producción (generado) |

La configuración de Vue CLI vive en la raíz (`vue.config.cjs`) y compila el código de `frontend/src/` hacia `frontend/dist/`. Los assets estáticos se copian desde `public/` en la raíz del proyecto.

## Requisitos

- Node.js 18+
- MySQL
- Redis (opcional, para realtime distribuido)

## Configuración

1. Copiar variables de entorno del backend a `.env` en la raíz.
2. Configurar `frontend/.env.development` y `frontend/.env.production` según `frontend/.env.example`.

## Desarrollo

Desde la raíz del proyecto:

```bash
npm install
npm run backend      # API en http://localhost:3000
npm run vue:serve    # Frontend en http://localhost:5173
```

El dev server de Vue hace proxy de `/api` al backend.

## Producción

```bash
npm run build
NODE_ENV=production npm run backend
```

El backend sirve `frontend/dist/` cuando `NODE_ENV=production`. Los logos y sonidos también están disponibles vía `/img` y `/sounds` desde `public/`.

## Scripts útiles

| Script | Descripción |
|--------|-------------|
| `npm run kill:ports` | Libera puertos de dev (3000, 5173) |
| `npm run lint` (en `frontend/`) | ESLint del frontend |
