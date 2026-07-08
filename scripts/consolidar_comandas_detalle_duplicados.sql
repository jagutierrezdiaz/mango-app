-- Consolidación de filas duplicadas en comandas_detalle
-- Causa: cantidad registrada como N filas con cantidad=1 en lugar de 1 fila con cantidad=N.
--
-- Ejecutar en entorno de prueba primero. Revisar el SELECT de preview antes del UPDATE.
-- Afecta grupos con mismo comanda, producto, precio, estado y observaciones.

START TRANSACTION;

-- 1) Preview: grupos con más de una fila
SELECT
  cd.comanda_id,
  cd.producto_id,
  cd.precio_unitario,
  cd.estado_producto,
  COALESCE(cd.observaciones_mesero, '') AS observaciones_mesero,
  COALESCE(cd.observaciones_cocina, '') AS observaciones_cocina,
  COUNT(*) AS filas,
  SUM(cd.cantidad) AS cantidad_total,
  SUM(cd.valor_subtotal) AS subtotal_total,
  MIN(cd.id) AS id_conservar,
  GROUP_CONCAT(cd.id ORDER BY cd.id) AS ids_grupo
FROM comandas_detalle cd
GROUP BY
  cd.comanda_id,
  cd.producto_id,
  cd.precio_unitario,
  cd.estado_producto,
  COALESCE(cd.observaciones_mesero, ''),
  COALESCE(cd.observaciones_cocina, '')
HAVING COUNT(*) > 1
ORDER BY cd.comanda_id, cd.producto_id;

-- 2) Actualizar fila conservada (MIN id) con cantidades sumadas
UPDATE comandas_detalle cd
INNER JOIN (
  SELECT
    MIN(id) AS id_conservar,
    SUM(cantidad) AS cantidad_total,
    SUM(valor_subtotal) AS subtotal_total
  FROM comandas_detalle
  GROUP BY
    comanda_id,
    producto_id,
    precio_unitario,
    estado_producto,
    COALESCE(observaciones_mesero, ''),
    COALESCE(observaciones_cocina, '')
  HAVING COUNT(*) > 1
) grp ON cd.id = grp.id_conservar
SET
  cd.cantidad = grp.cantidad_total,
  cd.valor_subtotal = grp.subtotal_total;

-- 3) Eliminar filas duplicadas (conserva MIN id por grupo)
DELETE cd
FROM comandas_detalle cd
INNER JOIN (
  SELECT
    comanda_id,
    producto_id,
    precio_unitario,
    estado_producto,
    COALESCE(observaciones_mesero, '') AS obs_m,
    COALESCE(observaciones_cocina, '') AS obs_c,
    MIN(id) AS id_conservar
  FROM comandas_detalle
  GROUP BY
    comanda_id,
    producto_id,
    precio_unitario,
    estado_producto,
    COALESCE(observaciones_mesero, ''),
    COALESCE(observaciones_cocina, '')
  HAVING COUNT(*) > 1
) grp
  ON cd.comanda_id = grp.comanda_id
 AND cd.producto_id = grp.producto_id
 AND cd.precio_unitario = grp.precio_unitario
 AND cd.estado_producto = grp.estado_producto
 AND COALESCE(cd.observaciones_mesero, '') = grp.obs_m
 AND COALESCE(cd.observaciones_cocina, '') = grp.obs_c
WHERE cd.id <> grp.id_conservar;

-- 4) Recalcular totales de comandas afectadas
UPDATE comandas c
INNER JOIN (
  SELECT comanda_id, COALESCE(SUM(valor_subtotal), 0) AS total_sin_servicio
  FROM comandas_detalle
  GROUP BY comanda_id
) t ON t.comanda_id = c.id
SET
  c.total_sin_servicio = t.total_sin_servicio,
  c.total_final = t.total_sin_servicio + COALESCE(c.servicio_voluntario, 0);

-- Verificación puntual (ej. comanda 1088, producto 33)
-- SELECT id, comanda_id, producto_id, cantidad, valor_subtotal, estado_producto
-- FROM comandas_detalle
-- WHERE comanda_id = 1088 AND producto_id = 33;

COMMIT;
