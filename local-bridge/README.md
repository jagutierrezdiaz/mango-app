# Bridge local

Servicio local para el PC de caja/cocina en Windows. Expone:

- `POST /api/abrir-cajon` — compatible con `frontend/src/services/cashDrawerBridge.js`
- `POST /api/imprimir-ticket` — impresion silenciosa a la impresora predeterminada del SO
- `GET /api/health` — verificacion rapida del servicio

## Requisitos

- Windows 10/11
- Node.js 18+
- Google Chrome o Microsoft Edge instalado
- Impresora POS configurada como **predeterminada** en Windows

## Instalacion

```bash
cd local-bridge
npm install
npm start
```

Por defecto escucha en `http://127.0.0.1:4545`.

## Variables de entorno (opcional)

| Variable | Default | Descripcion |
|----------|---------|-------------|
| `LOCAL_BRIDGE_PORT` | `4545` | Puerto HTTP |
| `LOCAL_BRIDGE_HOST` | `127.0.0.1` | Host de escucha |
| `LOCAL_BRIDGE_BROWSER_PATH` | auto | Ruta a Chrome/Edge |

## Frontend

En `frontend/.env.production` o `.env.local`:

```env
VUE_APP_PRINT_BRIDGE_URL=http://127.0.0.1:4545/api/imprimir-ticket
```

Si el bridge no responde, `ProgramaCocina.vue` usa fallback con dialogo del navegador.

## Prueba manual

```bash
curl http://127.0.0.1:4545/api/health
```

```powershell
curl -Method POST http://127.0.0.1:4545/api/imprimir-ticket `
  -ContentType "application/json" `
  -Body '{"html":"<html><body><h1>Test</h1></body></html>","comandaId":1,"ticketType":"comanda-cocina"}'
```
