import { ref } from 'vue';
import { businessInfo } from '../config/businessInfo.js';

// Lista de UUID candidatos de servicios y de caracteristicas de comunicacion a probar

// IMPORTANTE:
// La impresora Barcode+Printer BR2551e-S expone dos características:
//
// 49535343-1e4d-4bd9-ba61-23c647249616
//   - notify=true
//   - NO sirve para impresión
//
// 49535343-6daa-4d02-abf6-19569aca69fe
//   - write=true
//   - writeWithoutResponse=true
//   - característica correcta para impresión ESC/POS
//
// Si reaparecen errores GATT, reactivar temporalmente los alert()
// de diagnóstico para listar servicios y características BLE.

const CANDIDATE_PROFILES = [
  {
    service: '0000ffe0-0000-1000-8000-00805f9b34fb',
    characteristic: '0000ffe1-0000-1000-8000-00805f9b34fb'
  },
  {
    service: '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC (impresoras con chip Microchip altamente comun)
    characteristic: '49535343-1e4d-4bd9-ba61-23c647249616'
  },
  {
    service: '000018f0-0000-1000-8000-00805f9b34fb', // Perfil general de impresion BLE
    characteristic: '00002af1-0000-1000-8000-00805f9b34fb'
  },
  {
    service: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Impresoras portatiles LeSheng
    characteristic: 'bef15cd0-f97a-47a5-8c7a-de3d7f43b5d7'
  },
  {
  service: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  characteristic: '49535343-6daa-4d02-abf6-19569aca69fe'
  }
];

// Extraer lista plana de UUIDs de servicios opcionales para declaracion en Web Bluetooth
const OPTIONAL_SERVICES = CANDIDATE_PROFILES.map(p => p.service);

const isPrinterConnected = ref(false);
const printerName = ref('');
const isConnecting = ref(false);

let cachedDevice = null;
let cachedCharacteristic = null;

// Normalizar caracteres latinos eliminando tildes y ñ para compatibilidad con set de caracteres GB18030
const cleanText = (str) => {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina tildes
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N')
    .replace(/[^\x20-\x7E\n]/g, '?'); // Deja solo caracteres ASCII imprimibles y saltos de linea
};

// Formateadores para acomodar texto a 32 columnas (impresora de 58mm)
const padRight = (str, len) => {
  const clean = cleanText(str);
  if (clean.length >= len) return clean.substring(0, len);
  return clean + ' '.repeat(len - clean.length);
};

const padLeft = (str, len) => {
  const clean = cleanText(str);
  if (clean.length >= len) return clean.substring(0, len);
  return ' '.repeat(len - clean.length) + clean;
};

const formatRowLeftRight = (leftVal, rightVal, width = 32) => {
  const cleanLeft = cleanText(leftVal);
  const cleanRight = cleanText(rightVal);
  const maxLeftLen = width - cleanRight.length - 1;

  let leftPart = cleanLeft;
  if (leftPart.length > maxLeftLen) {
    leftPart = leftPart.substring(0, maxLeftLen - 3) + '...';
  }

  const spacesCount = width - leftPart.length - cleanRight.length;
  const spaces = ' '.repeat(spacesCount > 0 ? spacesCount : 1);
  return leftPart + spaces + cleanRight;
};

// Enviar comandos en "chunks" de 20 bytes para evitar buffer overflow sobre BLE (Web Bluetooth)
const sendEscPosData = async (characteristic, uint8Array) => {
  const CHUNK_SIZE = 20;

  console.log(
    'Bytes totales a enviar:',
    uint8Array.length
  );

  const hasWriteWithoutResponse =
    characteristic.properties?.writeWithoutResponse;

  const hasWriteWithResponse =
    characteristic.properties?.write;

  console.log('Propiedades BLE:', {
    write: hasWriteWithResponse,
    writeWithoutResponse: hasWriteWithoutResponse
  });

  const totalChunks = Math.ceil(
    uint8Array.length / CHUNK_SIZE
  );

  for (
    let i = 0;
    i < uint8Array.length;
    i += CHUNK_SIZE
  ) {
    const chunk = uint8Array.slice(
      i,
      i + CHUNK_SIZE
    );

    const chunkNumber =
      Math.floor(i / CHUNK_SIZE) + 1;

    try {
      console.log(
        `Enviando chunk ${chunkNumber}/${totalChunks}`,
        chunk.length,
        'bytes'
      );

      if (
        hasWriteWithoutResponse &&
        typeof characteristic.writeValueWithoutResponse === 'function'
      ) {
        await characteristic.writeValueWithoutResponse(
          chunk
        );

      } else if (
        hasWriteWithResponse &&
        typeof characteristic.writeValueWithResponse === 'function'
      ) {
        await characteristic.writeValueWithResponse(
          chunk
        );

      } else if (
        typeof characteristic.writeValueWithResponse === 'function'
      ) {
        await characteristic.writeValueWithResponse(
          chunk
        );

      } else if (
        typeof characteristic.writeValue === 'function'
      ) {
        await characteristic.writeValue(chunk);

      } else {
        throw new Error(
          'La característica BLE no soporta escritura'
        );
      }

      // Las BR2551e-S suelen requerir más tiempo
      await new Promise((resolve) =>
        setTimeout(resolve, 100)
      );

    } catch (err) {

      console.error(
        `Fallo en chunk ${chunkNumber}/${totalChunks}`,
        err
      );

      throw new Error(
        `Error BLE en chunk ${chunkNumber}: ${
          err?.message || err
        }`
      );
    }
  }

  console.log(
    'Todos los chunks fueron enviados correctamente'
  );
};

const handleDeviceDisconnected = () => {
  console.log('🔌 Impresora Bluetooth desconectada.');
  isPrinterConnected.value = false;
  printerName.value = '';
  cachedDevice = null;
  cachedCharacteristic = null;
};

const findWritableCharacteristic = async (server) => {
  const services = await server.getPrimaryServices();

  for (const service of services) {
    try {
      const characteristics = await service.getCharacteristics();

      for (const characteristic of characteristics) {
        if (
          characteristic.properties?.write ||
          characteristic.properties?.writeWithoutResponse
        ) {
          return characteristic;
        }
      }
    } catch (err) {
      console.error('Error leyendo servicio:', service.uuid, err);
    }
  }

  return null;
};

const ensurePrinterReady = async () => {
  if (cachedDevice && (!cachedDevice.gatt || !cachedDevice.gatt.connected)) {
    console.log('🔄 Detectada desconexion GATT. Reconectando impresora en caliente...');
    isPrinterConnected.value = false;

    try {
      const server = await cachedDevice.gatt.connect();
      const foundCharacteristic = await findWritableCharacteristic(server);

      if (foundCharacteristic) {
        cachedCharacteristic = foundCharacteristic;
        isPrinterConnected.value = true;
        console.log('✅ Reconexion GATT en caliente exitosa.');
      }
    } catch (err) {
      console.warn('⚠️ No se pudo reconectar en caliente ante fallo GATT:', err);
      isPrinterConnected.value = false;
      throw new Error('La impresora se desconecto fisicamente (Stale GATT). Por favor enciendala y reconectela desde el panel superior.');
    }
  }

  if (!isPrinterConnected.value || !cachedCharacteristic) {
    throw new Error('La impresora no esta conectada.');
  }
};

// Acciones del servicio
export const bluetoothPrinterService = {
  isPrinterConnected,
  printerName,
  isConnecting,

  /**
   * Intenta enlazarse a un dispositivo Bluetooth emparejado previamente si el navegador lo permite (autoconnect)
   */
  autoconnect: async () => {
    if (isPrinterConnected.value || isConnecting.value) return;
    if (!navigator.bluetooth || !navigator.bluetooth.getDevices) {
      console.warn('⚠️ Web Bluetooth getDevices() no esta soportado en este navegador/dispositivo.');
      return;
    }

    isConnecting.value = true;
    try {
      const devices = await navigator.bluetooth.getDevices();
      const printerDevice = devices.find((d) => {
        const name = d.name || '';
        return name.toLowerCase().includes('printer') || name.toLowerCase().includes('barcode');
      });

      if (printerDevice) {
        console.log('🔄 Autoconectando a la impresora guardada:', printerDevice.name);
        cachedDevice = printerDevice;
        printerDevice.addEventListener('gattserverdisconnected', handleDeviceDisconnected);

        const server = await printerDevice.gatt.connect();
        
        // Buscar cual de los servicios candidatos esta disponible físicamente en el hardware
        let foundService = null;
        let foundCharacteristic = null;
        let lastError = null;

const services = await server.getPrimaryServices();

for (const service of services) {

  /* debugger */
  /*
  alert(`SERVICE:\n${service.uuid}`);
  */

  try {

    const characteristics =
      await service.getCharacteristics();

    for (const characteristic of characteristics) {

      /* debugger */  
      /*
      alert(
        JSON.stringify({
          service: service.uuid,
          uuid: characteristic.uuid,
          write: characteristic.properties?.write,
          writeWithoutResponse:
            characteristic.properties?.writeWithoutResponse,
          notify:
            characteristic.properties?.notify,
          indicate:
            characteristic.properties?.indicate
        }, null, 2)
      );
      */

      if (
        characteristic.properties?.write ||
        characteristic.properties?.writeWithoutResponse
      ) {
        foundService = service;
        foundCharacteristic = characteristic;
        
        /* debugger */
        /*
        alert(
          'CARACTERISTICA DE ESCRITURA ENCONTRADA:\n' +
          characteristic.uuid
        );
        */

        break;
      }
    }

    if (foundCharacteristic) {
      break;
    }

  } catch (err) {
    console.error(
      'Error leyendo servicio:',
      service.uuid,
      err
    );
  }
}

        if (!foundCharacteristic) {
          throw lastError || new Error('No se encontro ningun servicio de impresion compatible en la impresora.');
        }

        cachedCharacteristic = foundCharacteristic;

        console.log(
          'Característica encontrada:',
          {
            uuid: foundCharacteristic.uuid,
            write: foundCharacteristic.properties?.write,
            writeWithoutResponse:
              foundCharacteristic.properties?.writeWithoutResponse,
            notify:
              foundCharacteristic.properties?.notify,
            indicate:
              foundCharacteristic.properties?.indicate
          }
        );

        isPrinterConnected.value = true;

        printerName.value = printerDevice.name || 'Impresora Bluetooth';
        console.log('✅ Reconnect exitoso.');
      }
    } catch (err) {
      console.warn('⚠️ No se pudo realizar el autoconexion Bluetooth en segundo plano:', err);
      isPrinterConnected.value = false;
      printerName.value = '';
      cachedDevice = null;
      cachedCharacteristic = null;
    } finally {
      isConnecting.value = false;
    }
  },

  /**
   * Activa el escaneo nativo del navegador para buscar y conectar el dispositivo manual POS
   */
  connect: async () => {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth no esta disponible en este navegador o requiere conexion HTTPS.');
    }

    isConnecting.value = true;
    try {
      // Filtrar por el nombre específico o el servicio estándar del chip de la impresora
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { name: 'Barcode+Printer' },
          { namePrefix: 'Barcode' },
          { namePrefix: 'Printer' }
        ],
        optionalServices: OPTIONAL_SERVICES
      });

      console.log('🔄 Conectando a:', device.name);
      cachedDevice = device;
      device.addEventListener('gattserverdisconnected', handleDeviceDisconnected);

      const server = await device.gatt.connect();
      
      // Intentar descubrir secuencialmente cual puerto de datos posee este hardware
      let foundService = null;
      let foundCharacteristic = null;
      let lastError = null;

const services = await server.getPrimaryServices();

for (const service of services) {

  /*  debugger */
 /*
  alert(`SERVICE:\n${service.uuid}`);
  */

  try {

    const characteristics =
      await service.getCharacteristics();

    for (const characteristic of characteristics) {

    /* debugger */
     /*
      alert(
        JSON.stringify({
          service: service.uuid,
          uuid: characteristic.uuid,
          write: characteristic.properties?.write,
          writeWithoutResponse:
            characteristic.properties?.writeWithoutResponse,
          notify:
            characteristic.properties?.notify,
          indicate:
            characteristic.properties?.indicate
        }, null, 2)
      );
      */

      if (
        characteristic.properties?.write ||
        characteristic.properties?.writeWithoutResponse
      ) {
        foundService = service;
        foundCharacteristic = characteristic;

        /*
        alert(
          'CARACTERISTICA DE ESCRITURA ENCONTRADA:\n' +
          characteristic.uuid
        );
        */

        break;
      }
    }

    if (foundCharacteristic) {
      break;
    }

  } catch (err) {
    console.error(
      'Error leyendo servicio:',
      service.uuid,
      err
    );
  }
}

      if (!foundCharacteristic) {
        throw lastError || new Error('No se detecto ningun canal de impresion ESC/POS valido en este dispositivo.');
      }

      cachedCharacteristic = foundCharacteristic;


    /* debugger */
        /*
        alert(
          JSON.stringify({
            uuid: foundCharacteristic.uuid,
            write: foundCharacteristic.properties?.write,
            writeWithoutResponse:
              foundCharacteristic.properties?.writeWithoutResponse,
            notify:
              foundCharacteristic.properties?.notify,
            indicate:
              foundCharacteristic.properties?.indicate
          }, null, 2)
        );
    */
   
      isPrinterConnected.value = true;

      printerName.value = device.name || 'Impresora Bluetooth';
      console.log('✅ Impresora Bluetooth conectada exitosamente.');
      return { success: true, name: device.name };
    } catch (err) {
      console.error('❌ Error de conexion Bluetooth:', err);
      handleDeviceDisconnected();
      throw err;
    } finally {
      isConnecting.value = false;
    }
  },

  /**
   * Desconecta manualmente el dispositivo enlazado
   */
  disconnect: async () => {
    if (cachedDevice && cachedDevice.gatt.connected) {
      cachedDevice.gatt.disconnect();
    }
    handleDeviceDisconnected();
  },

  /**
   * Formatea un ticket de pre-cuenta y lo imprime enviando bytes ESC/POS directos
   */
  imprimirPrecuenta: async (ticket) => {
    await ensurePrinterReady();

    try {
      const textEncoder = new TextEncoder();
      const commands = [];

      // Comandos basicos de control ESC/POS
      const ESC_INIT = [0x1B, 0x40]; // Inicializar impresora
      const ESC_ALIGN_CENTER = [0x1B, 0x61, 0x01]; // Centrado
      const ESC_ALIGN_LEFT = [0x1B, 0x61, 0x00]; // Izquierda
      const ESC_BOLD_ON = [0x1B, 0x45, 0x01]; // Negrita activada
      const ESC_BOLD_OFF = [0x1B, 0x45, 0x00]; // Negrita desactivada

      commands.push(...ESC_INIT);

      // --- TITULO DE PRECUENTA ---
      commands.push(...ESC_ALIGN_CENTER);
      commands.push(...ESC_BOLD_ON);
      commands.push(...textEncoder.encode(`${cleanText(businessInfo.identificacion.razonSocial)}\n`));

      commands.push(...textEncoder.encode('*** PRECUENTA ***\n'));
      commands.push(...ESC_BOLD_OFF);
      commands.push(...textEncoder.encode('--------------------------------\n')); // 32 caracteres

      // --- DATOS CABECERA ---
      commands.push(...ESC_ALIGN_LEFT);
      const mesaText = ticket.mesa_nombre || `Mesa ${ticket.numero_mesa || ticket.mesa_id || 'S/A'}`;
      commands.push(...textEncoder.encode(`Mesa: ${cleanText(mesaText)}\n`));
      
      const meseroText = ticket.mesero_nombre || ticket.mesero || 'Mesero';
      commands.push(...textEncoder.encode(`Mesero: ${cleanText(meseroText)}\n`));

      const horaText = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      const fechaText = new Date().toLocaleDateString('es-CO');
      commands.push(...textEncoder.encode(`Fecha: ${fechaText} - ${horaText}\n`));
      
      if (ticket.id) {
        commands.push(...textEncoder.encode(`Comanda ID: #${ticket.id}\n`));
      }
      commands.push(...textEncoder.encode('================================\n'));

      // --- LISTA DE PRODUCTOS ---
      const detalles = Array.isArray(ticket.detalles) ? ticket.detalles : [];
      let subtotal = 0;

      detalles.forEach((item) => {
        const cantidad = Number(item.cantidad) || 0;
        const nombre = item.producto_nombre || 'Producto';
        const sub = Math.round(Number(item.valor_subtotal ?? (cantidad * (item.precio_unitario ?? 0))));
        subtotal += sub;

        // Fila 1: Pepsi Cola (o nombre de producto)
        commands.push(...textEncoder.encode(`${cleanText(nombre)}\n`));
        
        // Fila 2: 2 x $5.000               $10.000
        const qtyRate = `${cantidad} x $${Number(item.precio_unitario ?? 0).toLocaleString('es-CO')}`;
        const totalLine = `$${sub.toLocaleString('es-CO')}`;
        const detailRow = formatRowLeftRight(qtyRate, totalLine, 32);
        commands.push(...textEncoder.encode(`${detailRow}\n`));
      });

      commands.push(...textEncoder.encode('--------------------------------\n'));

      // --- TOTALES Y SERVICIO ---
      // Subtotal
      const subtotalRow = formatRowLeftRight('Subtotal:', `$${subtotal.toLocaleString('es-CO')}`, 32);
      commands.push(...textEncoder.encode(`${subtotalRow}\n`));

      // Servicio voluntario (10% fijo para precuenta)
      const servicio = Math.round(subtotal * 0.10);
      const servicioRow = formatRowLeftRight('Propina Sug. (10%):', `$${servicio.toLocaleString('es-CO')}`, 32);
      commands.push(...textEncoder.encode(`${servicioRow}\n`));

      // Total Final
      const totalFinalVal = subtotal + servicio;
      commands.push(...ESC_BOLD_ON);
      const totalRow = formatRowLeftRight('TOTAL A PAGAR:', `$${totalFinalVal.toLocaleString('es-CO')}`, 32);
      commands.push(...textEncoder.encode(`${totalRow}\n`));
      commands.push(...ESC_BOLD_OFF);

      commands.push(...textEncoder.encode('================================\n'));
      
      // --- PIE FISCAL ---
      commands.push(...ESC_ALIGN_CENTER);
      commands.push(...textEncoder.encode(`${cleanText(businessInfo.identificacion.razonSocial)} | ${businessInfo.identificacion.tipoDocumento}: ${businessInfo.identificacion.numeroDocumento}\n`));
      commands.push(...textEncoder.encode(`${cleanText(businessInfo.tributario.regimen)}\n`));
      commands.push(...textEncoder.encode(`${cleanText(businessInfo.tributario.actividadEconomica)}\n`));
      commands.push(...textEncoder.encode(`${cleanText(businessInfo.ubicacion.direccion)}\n`));
      commands.push(...textEncoder.encode(`${cleanText(businessInfo.ubicacion.municipio)}, ${cleanText(businessInfo.ubicacion.departamento)}\n`));
      commands.push(...textEncoder.encode('--------------------------------\n'));

      // --- MENSAJE INFORMATIVO ---
      commands.push(...ESC_ALIGN_CENTER);
      commands.push(...textEncoder.encode('Este documento no es una factura\n'));
      commands.push(...textEncoder.encode('Gracias por su visita!\n'));
      
      // Alimentacion final (4 lineas) para poder cortar manualmente la hoja en el movil
      commands.push(...textEncoder.encode('\n\n\n\n'));

      // Convertir a uint8array final y enviar secuencialmente al Bluetooth
      const finalByteArray = new Uint8Array(commands);
      console.log(
        'Tamaño final del ticket:',
        finalByteArray.length
      );

    console.log(
      'UUID característica usada:',
      cachedCharacteristic?.uuid
    );

    await sendEscPosData(
      cachedCharacteristic,
      finalByteArray
    );

      console.log('✅ Precuenta impresa exitosamente en dispositivo Bluetooth.');
    } catch (err) {
      console.error('❌ Error al imprimir precuenta via Bluetooth:', err);
      throw err;
    }
  }
};
