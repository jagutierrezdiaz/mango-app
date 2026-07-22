import { businessInfo as defaultBusinessInfo } from '../config/businessInfo.js';

const THERMAL_TICKET_STYLES = `
  @page { size: 48mm auto; margin: 0; }
  body, div, td, span, p {
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    font-weight: 700;
  }
  body {
    font-size: 11px;
    margin: 4px;
    padding: 0;
    background: #fff;
    line-height: 1.3;
  }
  .wrapper { width: 44mm; max-width: 44mm; padding: 0; box-sizing: border-box; }
  .center { text-align: center; font-weight: bold; }
  .small { font-size: 10px; }
  .very-small { font-size: 9px; line-height: 1.2; }
  .item-block { margin: 0; padding: 0; }
  .item-name { font-weight: bold; margin-top: 5px; font-size: 11px; }
  .logo-row { text-align: center; margin-bottom: 2px; }
  .logo { display: block; max-width: 32mm; width: 100%; height: auto; max-height: 14mm; margin: 0 auto; object-fit: contain; }
  .item-line { margin: 3px 0; }
  hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
  .right { float: right; font-weight: bold; }
  .clear { clear: both; }
  @media print { html, body { width: 48mm !important; } }
`;

const roundMoney = (value) => Number((Number(value) || 0).toFixed(0));

function formatCurrency(value) {
  return Number(roundMoney(value)).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('es-CO', { hour12: false });
}

function resolveBusinessInfo(businessInfo) {
  return businessInfo || defaultBusinessInfo;
}

/** Convierte FAC-45 (u otro prefijo) a C.I.V.-45 para comercio no responsable de IVA. */
function formatNumeroControl(numeroFactura) {
  if (numeroFactura == null || numeroFactura === '') return '—';
  let raw = String(numeroFactura).trim();
  raw = raw.replace(/^FAC[-\s]*/i, '');
  raw = raw.replace(/^C\.?\s*I\.?\s*V\.?[-\s]*/i, '');
  raw = raw.replace(/^Factura\s*/i, '');
  const suffix = raw || String(numeroFactura).trim();
  return `C.I.V.-${suffix}`;
}

function buildFiscalFooterHtml(businessInfo) {
  const info = resolveBusinessInfo(businessInfo);
  return `
    <div class="center very-small">
      ${info.identificacion.razonSocial} | ${info.identificacion.tipoDocumento}: ${info.identificacion.numeroDocumento || ''}<br>
      ${info.tributario.regimen}<br>
      <div style="font-size:8px;line-height:1.05;margin-top:6px">${info.tributario.actividadEconomica}<br><br>
      ${info.ubicacion.direccion}<br>
      ${info.ubicacion.municipio}, ${info.ubicacion.departamento}</div>
    </div>
  `;
}

function buildDetallesHtml(detalles) {
  return (detalles || []).map((item) => {
    const cantidad = Number(item.cantidad) || 0;
    const valorSubtotal = Number(item.valor_subtotal) || 0;
    const valorUnitario = item.valor_unitario != null
      ? Number(item.valor_unitario)
      : (item.precio_unitario != null
          ? Number(item.precio_unitario)
          : (cantidad > 0 ? valorSubtotal / cantidad : 0));

    return `
      <div class="item-block">
        <div class="item-name">${item.producto_nombre}</div>
        <div class="item-line">Cant: <span class="right">${cantidad}</span></div>
        <div class="item-line">Precio Unit: <span class="right">${formatCurrency(valorUnitario)}</span></div>
        <div class="item-line">Subtotal: <span class="right">${formatCurrency(valorSubtotal)}</span></div>
        <hr style="border-top: 1px dashed #000">
      </div>`;
  }).join('\n');
}

function buildTotalRow(label, value, bold = false) {
  const style = bold ? ' style="font-weight:700"' : '';
  return `<div${style}>${label} <span class="right">${value}</span><div class="clear"></div></div>`;
}

function buildComandaCocinaItemsHtml(items = []) {
  return items.map((item, index) => {
    const cantidad = Number(item.cantidad) || 0;
    const nombre = item.producto_nombre || 'Producto';
    const obsMesero = String(item.observaciones_mesero || '').trim();
    const obsCocina = String(item.observaciones_cocina || '').trim();
    const qtyPrefix = cantidad > 1 ? `${cantidad}x ` : '';
    const separator = index < items.length - 1
      ? '<hr style="border-top: 1px dashed #000">'
      : '';

    return `
      <div class="item-block">
        <div class="item-name">${qtyPrefix}${nombre}</div>
        ${obsMesero ? `<div class="item-line very-small">Obs: ${obsMesero}</div>` : ''}
        ${obsCocina ? `<div class="item-line very-small">Cocina: ${obsCocina}</div>` : ''}
        ${separator}
      </div>`;
  }).join('\n');
}

function buildComandaCocinaHtml(ticket, businessInfo, logoSrc, opts = {}) {
  const info = resolveBusinessInfo(businessInfo);
  const bodyOnload = opts.skipAutoPrint ? '' : ' onload="window.print();"';
  const items = Array.isArray(ticket.items)
    ? ticket.items
    : (Array.isArray(ticket.detalles) ? ticket.detalles : []);
  const itemsHtml = buildComandaCocinaItemsHtml(items);

  const mesaText = ticket.mesa_nombre || ticket.mesaNombre || `Mesa ${ticket.numero_mesa || ticket.mesa_id || 'S/A'}`;
  const meseroText = ticket.mesero_nombre || ticket.meseroNombre || ticket.mesero || 'Mesero';
  const horaText = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const fechaText = new Date().toLocaleDateString('es-CO');
  const totalUnidades = items.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0);

  return `<!doctype html>
        <html>
        <head>
        <meta charset="utf-8">
        <title>Comanda Cocina ${ticket.id || ''}</title>
        <style>${THERMAL_TICKET_STYLES}</style>
        </head>
        <body${bodyOnload}>
        <div class="wrapper">
          <div class="logo-row">
            <img src="${logoSrc}" alt="Logo ${info.identificacion.razonSocial}" class="logo" onerror="this.style.display='none'" />
          </div>
          <div class="center">${info.identificacion.razonSocial}</div>
          <div class="center" style="font-size:10px;margin-top:4px;font-weight:900">*** COMANDA COCINA ***</div>
          <hr>
          <div>Mesa:    ${mesaText}</div>
          <div>Mesero:  ${meseroText}</div>
          <div>Fecha:   ${fechaText} - ${horaText}</div>
          ${ticket.id ? `<div>Comanda: #${ticket.id}</div>` : ''}
          <hr>
          ${itemsHtml}
          <div class="clear"></div>
          <hr>
          ${buildTotalRow(`${items.length} partida(s)`, `${totalUnidades} uds`)}
          <hr>
          <div class="center small">--- FIN COMANDA ---</div>
        </div>
        </body>
        </html>`;
}

function buildTicketHtml(ticket, businessInfo, logoSrc, opts = {}) {
  const info = resolveBusinessInfo(businessInfo);
  const autoClose = opts.autoClose !== false;
  const detallesHtml = buildDetallesHtml(ticket.detalles || []);
  const fiscalFooterHtml = buildFiscalFooterHtml(info);
  const pct = ticket.aporte_servicio_porcentaje != null ? `${ticket.aporte_servicio_porcentaje}%` : '';
  const servicioLabel = pct ? `Servicio (${pct})` : 'Servicio';
  const efectivoBlock = ticket.monto_efectivo > 0
    ? buildTotalRow('Efectivo Recibido', formatCurrency(ticket.monto_efectivo))
    : '';
  const transferenciaBlock = ticket.monto_digital > 0
    ? buildTotalRow('Transferencia Recibida', formatCurrency(ticket.monto_digital))
    : '';
  const totalRecibido = ticket.total_recibido != null ? ticket.total_recibido : (ticket.monto_efectivo + ticket.monto_digital);
  const devuelta = ticket.cambio != null ? ticket.cambio : Math.max(0, totalRecibido - ticket.total_pagado);
  const notasBlock = ticket.notas
    ? buildTotalRow('Notas', ticket.notas)
    : '';
  const devueltaBlock = opts.hideDevuelta
    ? ''
    : buildTotalRow('Devuelta', formatCurrency(devuelta), true);

  return `<!doctype html>
        <html>
        <head>
        <meta charset="utf-8">
        <title>Comprobante ${formatNumeroControl(ticket.numero_factura)}</title>
        <style>${THERMAL_TICKET_STYLES}</style>
        </head>
        <body onload="window.print();${autoClose ? ' setTimeout(() => window.close(), 3000);' : ''}">
        <div class="wrapper">
          <div class="logo-row">
            <img src="${logoSrc}" alt="Logo ${info.identificacion.razonSocial}" class="logo" onerror="this.style.display='none'" />
          </div>
          <div class="center">${info.identificacion.razonSocial}</div>
          <div class="center" style="font-size:10px;margin-top:4px">COMPROBANTE INTERNO DE VENTA</div>
          <div class="center"><span class="very-small">(NO ES FACTURA)</span></div>
          <div class="center"><span class="small">Número de Control: ${formatNumeroControl(ticket.numero_factura)}</span></div>
          <hr>
          <div>Fecha:   ${formatDateTime(ticket.fecha_venta)}</div>
          <div>Mesa:    ${ticket.id_mesa} - ${ticket.mesa_nombre || ''}</div>
          <div>Comanda: #${ticket.comanda_id}</div>
          <div>Mesero:  ${ticket.mesero_nombre || 'Sin asignar'}</div>
          <hr>
          <div class="center">PRODUCTOS:</div>
          <hr>
          ${detallesHtml}
          <div class="clear"></div>
          <hr>
          ${buildTotalRow('Subtotal', formatCurrency(ticket.total_venta))}
          ${buildTotalRow(servicioLabel, formatCurrency(ticket.aporte_servicio))}
          <hr>
          ${buildTotalRow('TOTAL', formatCurrency(ticket.total_pagado), true)}
          <hr>
          ${buildTotalRow('Metodo de Pago', ticket.metodo_pago || '')}
          ${efectivoBlock}
          ${transferenciaBlock}
          ${buildTotalRow('Total Recibido', formatCurrency(totalRecibido))}
          ${devueltaBlock}
          ${notasBlock}
          <hr>
          ${fiscalFooterHtml}
        </div>
        </body>
        </html>`;
}

function buildPrecuentaHtml(ticket, businessInfo, logoSrc, opts = {}) {
  const info = resolveBusinessInfo(businessInfo);
  const getMeseroNombre = opts.getMeseroNombre || (() => ticket.mesero_nombre || '');
  const bodyOnload = opts.skipAutoPrint ? '' : ' onload="window.print();"';
  const detalles = Array.isArray(ticket.detalles) ? ticket.detalles : (ticket.items || []);
  const detallesHtml = buildDetallesHtml(detalles);

  const mesaText = ticket.mesa_nombre ? `${ticket.mesa_nombre || ''}` : 'sin asignar';
  const meseroText = ticket.mesero_nombre || getMeseroNombre(ticket) || '';
  const fechaText = new Date().toLocaleDateString('es-CO');

  let subtotal = Number(ticket.total_sin_servicio ?? ticket.total_venta ?? ticket.total_final ?? 0) || 0;
  if (!subtotal || subtotal === 0) {
    subtotal = detalles.reduce((acc, it) => acc + (Number(it.valor_subtotal) || 0), 0);
  }
  subtotal = roundMoney(subtotal);
  const servicio = roundMoney(Math.round(subtotal * 0.10));
  const total = roundMoney(subtotal + servicio);
  const fiscalFooterHtml = buildFiscalFooterHtml(info);

  return `<!doctype html>
        <html>
        <head>
        <meta charset="utf-8">
        <title>Precuenta ${ticket.id || ''}</title>
        <style>${THERMAL_TICKET_STYLES}</style>
        </head>
        <body${bodyOnload}>
        <div class="wrapper">
          <div class="logo-row">
            <img src="${logoSrc}" alt="Logo ${info.identificacion.razonSocial}" class="logo" onerror="this.style.display='none'" />
          </div>
          <div class="center">${info.identificacion.razonSocial}<br><span class="small">Precuenta</span></div>
          <hr>
          <div>Mesa:    ${mesaText}</div>
          <div>Mesero:  ${meseroText}</div>
          <div>Fecha:   ${fechaText}</div>
          <hr>
          <div class="center">PRODUCTOS:</div>
          <hr>
          ${detallesHtml}
          <div class="clear"></div>
          <hr>
          ${buildTotalRow('Subtotal', formatCurrency(subtotal))}
          ${buildTotalRow('Servicio (10%)', formatCurrency(servicio))}
          <hr>
          ${buildTotalRow('TOTAL', formatCurrency(total), true)}
          <hr>
          ${fiscalFooterHtml}
        </div>
        </body>
        </html>`;
}

function buildReporteCajaHtml(reporte, businessInfo, logoSrc, opts = {}) {
  const info = resolveBusinessInfo(businessInfo);
  const filas = Array.isArray(reporte?.filas) ? reporte.filas : [];
  const fechaText = reporte?.fecha
    ? new Date(`${reporte.fecha}T12:00:00`).toLocaleDateString('es-CO')
    : new Date().toLocaleDateString('es-CO');
  const sum = (key) => filas.reduce((acc, row) => acc + roundMoney(row[key]), 0);

  const filasHtml = filas.map((row) => `
    <div class="item-block">
      <div class="item-name">${row.Metodo_Pago || 'Sin metodo'}</div>
      ${buildTotalRow('Total pagado', formatCurrency(row.Total_Pagado))}
      ${buildTotalRow('Venta efectivo', formatCurrency(row.Venta_Efectivo))}
      ${buildTotalRow('Servicio efectivo', formatCurrency(row.Servicio_Efectivo))}
      ${buildTotalRow('Venta transferencia', formatCurrency(row.Venta_Transferencia))}
      ${buildTotalRow('Servicio transferencia', formatCurrency(row.Servicio_Transferencia))}
      <hr style="border-top: 1px dashed #000">
    </div>
  `).join('\n');

  const bodyOnload = opts.skipAutoPrint ? '' : ' onload="window.print();"';

  return `<!doctype html>
        <html>
        <head>
        <meta charset="utf-8">
        <title>Reporte de Caja ${fechaText}</title>
        <style>${THERMAL_TICKET_STYLES}</style>
        </head>
        <body${bodyOnload}>
        <div class="wrapper">
          <div class="logo-row">
            <img src="${logoSrc}" alt="Logo ${info.identificacion.razonSocial}" class="logo" onerror="this.style.display='none'" />
          </div>
          <div class="center">${info.identificacion.razonSocial}<br><span class="small">Reporte de Caja</span></div>
          <hr>
          <div>Fecha: ${fechaText}</div>
          <div>Cajero: ${reporte?.cajero_nombre || 'Turno activo'}</div>
          <hr>
          <div class="center">RESUMEN POR METODO DE PAGO</div>
          <hr>
          ${filasHtml || '<div class="center small">Sin ventas registradas hoy.</div>'}
          <div class="clear"></div>
          <hr>
          ${buildTotalRow('Total pagado', formatCurrency(sum('Total_Pagado')), true)}
          ${buildTotalRow('Venta efectivo', formatCurrency(sum('Venta_Efectivo')))}
          ${buildTotalRow('Servicio efectivo', formatCurrency(sum('Servicio_Efectivo')))}
          ${buildTotalRow('Venta transferencia', formatCurrency(sum('Venta_Transferencia')))}
          ${buildTotalRow('Servicio transferencia', formatCurrency(sum('Servicio_Transferencia')))}
          <hr>
          ${buildFiscalFooterHtml(info)}
        </div>
        </body>
        </html>`;
}

export { buildTicketHtml, buildPrecuentaHtml, buildComandaCocinaHtml, buildReporteCajaHtml, buildFiscalFooterHtml, formatNumeroControl };
