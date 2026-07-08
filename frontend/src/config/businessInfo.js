const fromEnv = (key, fallback = '') =>
  String(process.env[key] ?? fallback).trim() || fallback;

export const businessInfo = {
  identificacion: {
    razonSocial: fromEnv('VUE_APP_BUSINESS_RAZON_SOCIAL', 'HAZLO SOFTWARE S.A.S.'),
    tipoDocumento: fromEnv('VUE_APP_BUSINESS_TIPO_DOCUMENTO', 'NIT'),
    numeroDocumento: fromEnv('VUE_APP_BUSINESS_NUMERO_DOCUMENTO', '901339850-9')
  },
  ubicacion: {
    direccion: fromEnv('VUE_APP_BUSINESS_DIRECCION', 'Barrio Alta Suiza'),
    municipio: fromEnv('VUE_APP_BUSINESS_MUNICIPIO', 'Manizales'),
    departamento: fromEnv('VUE_APP_BUSINESS_DEPARTAMENTO', 'Caldas')
  },
  tributario: {
    regimen: fromEnv('VUE_APP_BUSINESS_REGIMEN', 'Responsable de IVA'),
    actividadEconomica: fromEnv('VUE_APP_BUSINESS_ACTIVIDAD_ECONOMICA', 'Desarrollo de Sistemas Informáticos')
  },
  contacto: {
    telefono: fromEnv('VUE_APP_BUSINESS_TELEFONO', '+57 3182204367'),
    email: fromEnv('VUE_APP_BUSINESS_EMAIL', 'contacto@hazlosoftware.com')
  }
};

/** Título de la pestaña del navegador (dev y producción). */
export const appDocumentTitle = businessInfo.identificacion.razonSocial;
