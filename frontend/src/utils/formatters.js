const CURRENCY_LOCALE = 'es-CO';
const CURRENCY_CODE = 'COP';

const currencyFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: 'currency',
  currency: CURRENCY_CODE,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const currencyFormatterNoDecimals = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: 'currency',
  currency: CURRENCY_CODE,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

const quantityFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatCurrency = (value) => {
  return currencyFormatter.format(toNumber(value)).replace(/\u00A0/g, ' ');
};

export const formatCurrencyNoDecimals = (value) => {
  return currencyFormatterNoDecimals.format(Math.round(toNumber(value))).replace(/\u00A0/g, ' ');
};

export const formatQuantity = (value) => {
  return quantityFormatter.format(Math.round(toNumber(value)));
};
