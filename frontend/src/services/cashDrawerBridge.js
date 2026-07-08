const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:4545/api/abrir-cajon';

const resolveBridgeUrl = () => {
  const envUrl = process.env.VUE_APP_CASH_DRAWER_BRIDGE_URL;
  const localOverride = typeof window !== 'undefined'
    ? window.localStorage.getItem('cashDrawerBridgeUrl')
    : null;

  return String(localOverride || envUrl || DEFAULT_BRIDGE_URL).trim();
};

export const openCashDrawerBridge = async (payload = {}) => {
  const bridgeUrl = resolveBridgeUrl();
  if (!bridgeUrl) {
    return { success: false, skipped: true, reason: 'bridge-url-missing' };
  }

  const response = await fetch(bridgeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      event: 'abrir-cajon',
      source: 'frontend-caja',
      timestamp: new Date().toISOString(),
      payload
    })
  });

  let result = null;
  try {
    result = await response.json();
  } catch (_error) {
    result = null;
  }

  if (!response.ok) {
    const error = new Error(result?.message || 'El bridge local rechazo la solicitud del cajon.');
    error.payload = result;
    throw error;
  }

  return result || { success: true };
};