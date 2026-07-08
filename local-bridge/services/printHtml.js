import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import puppeteer from 'puppeteer-core';
import { findBrowserExecutable } from './findBrowser.js';

const require = createRequire(import.meta.url);
const { print } = require('pdf-to-printer');

const cleanupDir = async (dirPath) => {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch {
    // ignore
  }
};

export const printHtmlSilently = async (html, meta = {}) => {
  const browserPath = findBrowserExecutable();
  if (!browserPath) {
    throw new Error(
      'No se encontro Chrome ni Edge en el equipo. Instale uno de ellos para impresion silenciosa.'
    );
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pb-print-'));
  const htmlPath = path.join(tmpDir, 'ticket.html');
  const pdfPath = path.join(tmpDir, 'ticket.pdf');

  let browser = null;

  try {
    await fs.writeFile(htmlPath, html, 'utf8');

    browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('print');

    await page.pdf({
      path: pdfPath,
      width: '48mm',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
    });

    await browser.close();
    browser = null;

    await print(pdfPath, {
      silent: true,
      printDialog: false
    });

    console.log('[local-bridge] impresion silenciosa OK', meta);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    await cleanupDir(tmpDir);
  }
};
