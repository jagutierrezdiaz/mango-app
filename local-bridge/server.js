import cors from 'cors';
import express from 'express';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { printHtmlSilently } from './services/printHtml.js';

const PORT = Number(process.env.LOCAL_BRIDGE_PORT || 4545);
const HOST = String(process.env.LOCAL_BRIDGE_HOST || '127.0.0.1').trim();

const app = express();
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  }
}));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    service: 'patio-bohemio-local-bridge',
    port: PORT,
    platform: process.platform,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/abrir-cajon', async (req, res) => {
  const body = req.body || {};
  console.log('[local-bridge] abrir-cajon', {
    event: body.event || 'abrir-cajon',
    source: body.source || 'unknown',
    timestamp: body.timestamp || new Date().toISOString()
  });

  // Punto de extension: integrar apertura fisica del cajon (ESC/POS, serial, etc.)
  res.json({
    success: true,
    message: 'Solicitud de apertura de cajon recibida.',
    handled: false
  });
});

app.post('/api/imprimir-ticket', async (req, res) => {
  const body = req.body || {};
  const html = String(body.html || '').trim();
  const comandaId = Number(body.comandaId || body.comanda_id || 0) || null;
  const ticketType = String(body.ticketType || body.ticket_type || 'ticket').trim();

  if (!html) {
    return res.status(400).json({
      success: false,
      message: 'El campo html es obligatorio para imprimir.'
    });
  }

  if (process.platform !== 'win32') {
    return res.status(501).json({
      success: false,
      message: 'La impresion silenciosa del bridge solo esta disponible en Windows por ahora.'
    });
  }

  try {
    await printHtmlSilently(html, {
      comandaId,
      ticketType,
      source: String(body.source || 'frontend').trim()
    });

    return res.json({
      success: true,
      message: comandaId
        ? `Ticket de comanda #${comandaId} enviado a la impresora predeterminada.`
        : 'Ticket enviado a la impresora predeterminada.',
      comandaId,
      ticketType
    });
  } catch (error) {
    console.error('[local-bridge] imprimir-ticket error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'No se pudo imprimir el ticket en la impresora predeterminada.'
    });
  }
});

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada en el bridge local.' });
});

app.listen(PORT, HOST, () => {
  console.log(`[local-bridge] Escuchando en http://${HOST}:${PORT}`);
  console.log('[local-bridge] Endpoints: GET /api/health, POST /api/abrir-cajon, POST /api/imprimir-ticket');
});

process.on('SIGINT', async () => {
  const tmpRoot = path.join(os.tmpdir(), 'pb-print-');
  try {
    const entries = await fs.readdir(os.tmpdir());
    await Promise.all(
      entries
        .filter((name) => name.startsWith('pb-print-'))
        .map((name) => fs.rm(path.join(os.tmpdir(), name), { recursive: true, force: true }))
    );
  } catch {
    // limpieza best-effort
  }
  process.exit(0);
});
