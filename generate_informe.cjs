const ExcelJS = require('exceljs');

(async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Informe Proyecto');

    const headers = [
      'Componente / Capa',
      'Ubicación',
      'Subcomponente',
      'Función / Rol',
      'Entradas',
      'Salidas',
      'Dependencias',
      'Flujo de datos (de → hacia)',
      'Riesgos o puntos críticos',
      'Oportunidades de mejora'
    ];
    ws.addRow(headers);

    const rows = [
      ['Views (.vue)','Frontend','view','Presentación y captura de interacción usuario; orquesta llamadas a servicios y navegación','params de ruta; estado del store; eventos de usuario','Llamadas a servicios (HTTP); navegación; emisión de eventos','Components; Services; Router; Stores','Usuario → View → Frontend Service → Backend Route → Controller → DB; respuesta de vuelta a View','Contener lógica de negocio en la vista; XSS; estado inconsistente; UI lento si hay llamadas múltiples','Mover lógica a composables/services; añadir tests; caching'],
      ['Components (reutilizables)','Frontend','component','UI reutilizable (botones, modales, tarjetas)','Props y eventos','Emit events / callbacks','Views; Utils; Theme','View ↔ Component (props → render; events → view)','Mutación de props; acoplamiento elevado; duplicación de UI','Crear librería de componentes; documentarlos (Storybook); estandarizar props'],
      ['Services (cliente)','Frontend','service (API layer)','Encapsula fetch, parse, errores','parámetros de llamada; token auth','JSON responses; errores; datos normalizados','config (API_BASE), auth token, parseResult','View → Service → Backend API; Backend → Service → View','Errores inconsistentes; falta de reintentos; manejo de tokens expirados','Centralizar manejo de errores/autenticación; retry/backoff; caching'],
      ['Routes (vue-router)','Frontend','router','Ruteo SPA, lazy-loading, guards de acceso','URL, params, auth state','Instancia de componente; redirecciones; guards activados','Stores (auth); Views; Guards','Browser → Router → View; Guards → (permitir/denegar) → redirect','Guards mal configurados; carga dinámica fallida; rutas expuestas a no autorizados','Auditar rutas por roles; prefetcheo; fallback UI'],
      ['Middlewares (auth, guard, error)','Backend','middleware','Autenticación, autorización, validación y manejo de errores','Headers (Authorization), request data','Enriquecen req (req.user); bloqueos (401/403); respuestas de error','utils authToken; roles; db (para validar)','Client → Router → Middleware → Controller; respuestas de error → Client','Fallo en validación/expiración de token; bypass de permisos; manejo inconsistente de errores','Estandarizar formato de errores; centralizar logs; soporte refresh tokens'],
      ['Controllers','Backend','controller/handler','Recibir request, validar, orquestar llamadas a servicios y armar respuesta','req.params, req.query, req.body, req.user','JSON responses; códigos HTTP; inicio de transacciones','Services backend; utils; middlewares','Router → Controller → Service(s) → DB; respuestas → cliente','Lógica SQL/DB en controllers; validación pobre; transacciones mal manejadas','Separar lógica en services; usar schemas; tests unitarios; manejo consistente de errores'],
      ['Services (backend)','Backend','service','Lógica de negocio, transacciones, consultas DB reusables','parámetros desde controladores; conexión DB','Resultados de consultas; commits/rollbacks; errores','db pool/config; otros services; utils','Controller → Service → DB; Service → Service → Controller','Operaciones sin transacción; inyección SQL; queries no optimizados','Definir capa de servicios; parametrizar queries; tests; manejo de locks/retries'],
      ['Config (db, multer, env)','Backend','config','Configuración central (pool DB, uploads, env)','Variables de entorno; archivos de configuración','Objetos/configs (db pool, multer middleware)','dotenv; mysql2; multer; secret store','App start → Config → Servicios y Controladores','Exposición de secrets; config distinta por entornos; pool mal dimensionado','Validar config en arranque; gestión de secrets; separar configs por entorno'],
      ['Base de datos (MySQL)','Backend','persistencia','Schema/tablas (movimientos_contables, compras, etc.)','Consultas SQL parametrizadas desde services/controllers','Filas/resultsets; confirmación de transacciones','Services backend; migrations; índices','Backend Services → DB → Backend Services','Consultas sin índices; falta de constraints; bloqueos; datos inconsistentes','Crear migraciones; añadir índices; revisar consultas costosas; backups']
    ];

    rows.forEach(r => ws.addRow(r));

    ws.columns.forEach(col => { col.width = 30; });
    ws.getRow(1).font = { bold: true };

    const outPath = require('path').join(process.cwd(), 'informe_proyecto.xlsx');
    await workbook.xlsx.writeFile(outPath);
    console.log('informe_proyecto.xlsx creado en:', outPath);
  } catch (err) {
    console.error('Error generando informe:', err);
    process.exit(1);
  }
})();
