// Shared UI and chart palette sourced from CSS theme variables.
export function getThemeChartColors() {
  if (typeof window === 'undefined') {
    return {
      teal700: 'rgb(15, 118, 110)',
      tealFill: 'rgba(15, 118, 110, 0.16)',
      cyan500: 'rgb(6, 182, 212)',
      borderSoft: 'rgba(148, 163, 184, 0.2)',
      slate500: '#64748b',
      slate700: '#334155',
      red500: '#ef4444',
      teal500: '#14b8a6',
      cyan700: '#155e75',
      slate400: '#94a3b8'
    }
  }

  const root = getComputedStyle(document.documentElement)
  const pick = (name, fallback) => {
    const value = root.getPropertyValue(name).trim()
    return value || fallback
  }

  const rgbTeal700 = pick('--pb-rgb-teal-700', '15, 118, 110')
  const rgbCyan500 = pick('--pb-rgb-cyan-500', '6, 182, 212')
  const borderSoft = pick('--pb-border-soft', 'rgba(148, 163, 184, 0.2)')

  return {
    teal700: `rgb(${rgbTeal700})`,
    tealFill: `rgba(${rgbTeal700}, 0.16)`,
    cyan500: `rgb(${rgbCyan500})`,
    borderSoft,
    slate500: '#64748b',
    slate700: '#334155',
    red500: '#ef4444',
    teal500: '#14b8a6',
    cyan700: '#155e75',
    slate400: '#94a3b8'
  }
}
