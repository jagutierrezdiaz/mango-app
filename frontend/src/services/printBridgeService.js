const DEFAULT_PRINT_BRIDGE_URL = 'http://127.0.0.1:4545/api/imprimir-ticket';
const DEFAULT_TIMEOUT_MS = 15000;

const resolvePrintBridgeUrl = () => {
  const envUrl = process.env.VUE_APP_PRINT_BRIDGE_URL;
  const localOverride = typeof window !== 'undefined'
    ? window.localStorage.getItem('printBridgeUrl')
    : null;

  return String(localOverride || envUrl || DEFAULT_PRINT_BRIDGE_URL).trim();
};

const isBridgeUnavailableError = (error) => {
  if (!error) return true;
  if (error.name === 'AbortError') return true;
  if (error.code === 'BRIDGE_UNAVAILABLE') return true;
  const message = String(error.message || '').toLowerCase();
  return (
    message.includes('failed to fetch')
    || message.includes('networkerror')
    || message.includes('network request failed')
    || message.includes('fetch failed')
  );
};

export const printTicketSilently = async ({
  html,
  comandaId = null,
  ticketType = 'comanda-cocina',
  source = 'programa-cocina',
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) => {
  const bridgeUrl = resolvePrintBridgeUrl();
  if (!bridgeUrl) {
    const error = new Error('No hay URL configurada para el bridge de impresion.');
    error.code = 'BRIDGE_UNAVAILABLE';
    throw error;
  }

  const htmlContent = String(html || '').trim();
  if (!htmlContent) {
    throw new Error('No hay contenido HTML para imprimir.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response = null;
  let result = null;

  try {
    response = await fetch(bridgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        html: htmlContent,
        comandaId,
        ticketType,
        source,
        timestamp: new Date().toISOString()
      }),
      signal: controller.signal
    });

    try {
      result = await response.json();
    } catch (_error) {
      result = null;
    }

    if (!response.ok || result?.success === false) {
      const error = new Error(
        result?.message || 'El bridge local rechazo la solicitud de impresion.'
      );
      error.code = 'PRINT_FAILED';
      error.payload = result;
      throw error;
    }

    return result || { success: true };
  } catch (error) {
    if (isBridgeUnavailableError(error)) {
      const bridgeError = new Error(
        'El bridge de impresion local no esta disponible en este equipo.'
      );
      bridgeError.code = 'BRIDGE_UNAVAILABLE';
      bridgeError.cause = error;
      throw bridgeError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export { isBridgeUnavailableError };
