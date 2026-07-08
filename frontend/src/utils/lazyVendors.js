let xlsxModulePromise = null;
let pdfToolsPromise = null;
let fullCalendarDepsPromise = null;

export const getXLSX = async () => {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('xlsx');
  }
  return xlsxModulePromise;
};

export const getPdfTools = async () => {
  if (!pdfToolsPromise) {
    pdfToolsPromise = Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]).then(([jspdfModule, autoTableModule]) => ({
      jsPDF: jspdfModule.jsPDF,
      autoTable: autoTableModule.default
    }));
  }

  return pdfToolsPromise;
};

export const getFullCalendarDeps = async () => {
  if (!fullCalendarDepsPromise) {
    fullCalendarDepsPromise = Promise.all([
      import('@fullcalendar/daygrid'),
      import('@fullcalendar/timegrid'),
      import('@fullcalendar/interaction'),
      import('@fullcalendar/core/locales/es')
    ]).then(([dayGridModule, timeGridModule, interactionModule, localeModule]) => ({
      plugins: [dayGridModule.default, timeGridModule.default, interactionModule.default],
      locale: localeModule.default
    }));
  }

  return fullCalendarDepsPromise;
};
