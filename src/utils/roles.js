
// Normaliza el rol para uso interno y mapping a rooms de socket.
// Devuelve una forma CANÓNICA en mayúsculas: ADMIN, MESERO, CAJERO, COCINERO, BARISTA, BARTENDER, u otra cadena en mayúsculas.
export const normalizeRole = (role) => {
  const raw = String(role || '').trim();
  if (!raw) return '';
  const low = raw.toLowerCase();

  if (low === 'administrador' || low === 'admin') return 'ADMIN';
  if (low === 'mesero') return 'MESERO';
  if (low === 'cajero' || low === 'caja') return 'CAJERO';
  if (low === 'cocinero' || low === 'cocina') return 'COCINERO';
  if (low === 'barista') return 'BARISTA';
  if (low === 'bartender') return 'BARTENDER';

  return raw.toUpperCase();
};

export const normalizeRoles = (roles = []) => roles.map(normalizeRole).filter(Boolean);

export const resolveSocketRoomFromRole = (role) => {
  const normalized = normalizeRole(role);
  if (!normalized) return null;

  if (normalized === 'CAJERO') return 'CAJA';
  if (normalized === 'COCINERO') return 'COCINA';
  if (normalized === 'ADMIN' || normalized === 'ADMINISTRADOR') return 'ADMIN';
  if (normalized === 'MESERO') return 'MESERO';
  if (normalized === 'BARISTA') return 'BARISTA';
  if (normalized === 'BARTENDER') return 'BARTENDER';

  return normalized;
};

export const normalizeSocketRoom = (roomOrRole) => {
  const raw = String(roomOrRole || '').trim().toUpperCase();
  if (!raw) return null;

  if (raw === 'CAJA' || raw === 'CAJERO' || raw === 'CAJERO(A)') return 'CAJA';
  if (raw === 'COCINA' || raw === 'COCINERO') return 'COCINA';
  if (raw === 'ADMINISTRADOR' || raw === 'ADMIN') return 'ADMIN';
  if (raw === 'MESERO') return 'MESERO';
  if (raw === 'BARISTA') return 'BARISTA';
  if (raw === 'BARTENDER') return 'BARTENDER';

  return resolveSocketRoomFromRole(raw);
};
