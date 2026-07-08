export const canAccessComanda = async (queryable, comandaId, personalId) => {
  const idComanda = Number(comandaId || 0);
  const idPersonal = Number(personalId || 0);
  if (!idComanda || !idPersonal) return false;

  const [rows] = await queryable.query(
    'SELECT id FROM comandas WHERE id = ? AND personal_id = ? LIMIT 1',
    [idComanda, idPersonal]
  );

  return rows.length > 0;
};

export const canAccessDetalleComandaById = async (queryable, detalleId, personalId) => {
  const idDetalle = Number(detalleId || 0);
  const idPersonal = Number(personalId || 0);
  if (!idDetalle || !idPersonal) return false;

  const [rows] = await queryable.query(
    `SELECT cd.id
     FROM comandas_detalle cd
     INNER JOIN comandas c ON c.id = cd.comanda_id
     WHERE cd.id = ? AND c.personal_id = ?
     LIMIT 1`,
    [idDetalle, idPersonal]
  );

  return rows.length > 0;
};
