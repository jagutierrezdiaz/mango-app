const fs = require('fs');
const { join } = require('path');
const dotenv = require('dotenv');

const pkg = JSON.parse(fs.readFileSync(join(__dirname, 'package.json'), 'utf-8'));
const version = pkg.version || '1.0.0';

const now = new Date();
const buildDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(now);

const buildTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Bogota',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
}).format(now).toLowerCase();

process.env.VUE_APP_BUILD_INFO = `v ${version} ${buildDate} ${buildTime}`;

const loadFrontendEnv = () => {
  const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  const envFiles = [
    join(__dirname, 'frontend', `.env.${mode}.local`),
    join(__dirname, 'frontend', `.env.${mode}`),
    join(__dirname, 'frontend', '.env.local'),
    join(__dirname, 'frontend', '.env')
  ];

  envFiles.forEach((envPath) => {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  });
};

loadFrontendEnv();

const DEFAULT_RAZON_SOCIAL = 'HAZLO SOFTWARE S.A.S.';
const appDocumentTitle =
  String(process.env.VUE_APP_BUSINESS_RAZON_SOCIAL || DEFAULT_RAZON_SOCIAL).trim() ||
  DEFAULT_RAZON_SOCIAL;

const devBackendHost = String(process.env.VUE_APP_DEV_BACKEND_HOST || 'localhost').trim() || 'localhost';
const devBackendPort = Number(process.env.VUE_APP_DEV_BACKEND_PORT || process.env.PORT || 3000) || 3000;
const devFrontendPort = Number(process.env.VUE_APP_DEV_FRONTEND_PORT || 5173) || 5173;

module.exports = {
  lintOnSave: false,
  publicPath: '/',
  // Vue CLI copia assets desde public/ en la raíz (img/, sounds/, favicon.ico)
  outputDir: join(__dirname, 'frontend/dist'),
  pages: {
    index: {
      entry: join(__dirname, 'frontend/src/main.js'),
      template: join(__dirname, 'frontend/public/index.html'),
      filename: 'index.html',
      title: appDocumentTitle
    }
  },
  configureWebpack: {
    performance: process.env.NODE_ENV === 'production'
      ? { hints: false }
      : undefined
  },
  chainWebpack: (config) => {
    config.plugins.delete('prefetch');
  },
  devServer: {
    host: '0.0.0.0',
    port: devFrontendPort,
    server: 'http',
    hot: true,
    liveReload: true,
    historyApiFallback: true,
    allowedHosts: 'all',
    proxy: {
      '/api': {
        target: `http://${devBackendHost}:${devBackendPort}`,
        changeOrigin: true,
        secure: false
      }
    }
  }
};
