<template>
  <div class="dashboard-shell min-h-[calc(100vh-2rem)] w-full max-w-[1320px] mx-auto p-3 sm:p-4 md:p-5 lg:p-7">
    <button
      v-if="showAudioAlert"
      type="button"
      class="audio-alert-btn"
      :disabled="activatingAudio"
      @click="desbloquearAudio"
    >
      🔔 Haga clic aquí para activar sonidos
    </button>

    <section class="hero-card mb-6 md:mb-8 rounded-3xl p-6 md:p-8">
      <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-2">
          <p class="text-[11px] tracking-[0.25em] uppercase font-semibold text-cyan-100/80">Panel de control operativo</p>
          <h2 class="title text-3xl md:text-4xl xl:text-5xl font-extrabold text-white leading-tight">Buen turno, {{ user?.nombres || 'equipo' }}</h2>
          <p class="text-sm md:text-base text-cyan-100/80 max-w-xl">
            Seguimiento en tiempo real de ventas, gastos y nivel de inventario para tomar decisiones rapidas desde portatil o tablet.
          </p>
        </div>
        <div class="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 backdrop-blur-sm">
          <p class="text-[10px] uppercase tracking-[0.2em] text-cyan-100/70">Estado del dia</p>
          <p class="text-white font-bold text-lg">Operacion estable</p>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6 md:mb-8">
      <article
        v-for="card in summaryCards"
        :key="card.key"
        class="stat-card rounded-2xl p-4 md:p-5"
        :class="{ 'opacity-60 animate-pulse': statsLoading }"
      >
        <div class="flex items-start justify-between mb-3">
          <p class="text-[11px] uppercase tracking-[0.15em] admin-card-title font-semibold leading-tight">{{ card.label }}</p>
          <span class="rounded-xl p-2 flex-shrink-0 ml-2" :class="card.iconBg">
            <component :is="card.Icon" class="w-4 h-4" :class="card.iconColor" />
          </span>
        </div>
        <p class="text-2xl md:text-3xl font-extrabold text-slate-900">{{ card.value }}</p>
        <p class="text-[11px] mt-1 admin-card-title">{{ card.sub }}</p>
      </article>
    </section>

    <section class="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
      <article class="panel-card md:col-span-7 xl:col-span-8 rounded-3xl p-5 md:p-6">
        <div class="flex items-center justify-between mb-5">
          <div>
            <h3 class="panel-title text-lg md:text-xl admin-card-title">Ventas por día</h3>
            <p class="text-xs uppercase tracking-[0.16em] admin-card-title font-semibold">Últimos 7 días · Datos reales</p>
          </div>
        </div>
        <div class="relative h-[220px] sm:h-[240px] md:h-[280px]">
          <canvas ref="chartVentasRef"></canvas>
        </div>
      </article>

      <article class="panel-card md:col-span-5 xl:col-span-4 rounded-3xl p-5 md:p-6">
        <div class="mb-5">
          <h3 class="panel-title text-lg md:text-xl admin-card-title">Distribucion de gastos</h3>
          <p class="text-xs uppercase tracking-[0.16em] admin-card-title font-semibold">Por categoria</p>
        </div>
        <div class="relative h-[220px] sm:h-[240px] md:h-[280px]">
          <canvas ref="chartGastosRef"></canvas>
        </div>
      </article>

      <article class="panel-card md:col-span-12 rounded-3xl p-5 md:p-6">
        <div class="mb-5">
          <h3 class="panel-title text-lg md:text-xl admin-card-title">Estado de inventarios</h3>
          <p class="text-xs uppercase tracking-[0.16em] admin-card-title font-semibold">Alertas por stock minimo</p>
        </div>
        <div class="relative h-[210px] sm:h-[230px] md:h-[260px]">
          <canvas ref="chartInventarioRef"></canvas>
        </div>
      </article>

    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, BarElement, BarController, DoughnutController, ArcElement, Tooltip, Legend, Filler } from 'chart.js'
import { ClipboardList, ClipboardCheck, DollarSign, Heart, TrendingUp } from 'lucide-vue-next'
import { useAuthStore } from '../stores'
import { getThemeChartColors } from '../theme/palette.js'
import { buildApiUrl } from '../config/api.js'
import { createSocketDeduper } from '../utils/socketEventDedup.js'
import { SOCKET_EVENTS } from '../constants/socketEvents.js'

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  BarElement,
  BarController,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
  Filler
)

export default {
  name: 'Dashboard',
  components: { ClipboardList, ClipboardCheck, DollarSign, Heart, TrendingUp },
  setup() {
    const chartVentasRef = ref(null)
    const chartGastosRef = ref(null)
    const chartInventarioRef = ref(null)

    const authStore = useAuthStore()
    const shouldProcessSocketEvent = createSocketDeduper(2200)

    const statsHoy = ref({ abiertas: 0, cerradas: 0, ventas: 0, servicio: 0, ingresos: 0 })
    const statsLoading = ref(false)
    const showAudioAlert = ref(false)
    const activatingAudio = ref(false)

    const formatCurrency = (value) =>
      Number(value || 0).toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })

    const summaryCards = computed(() => [
      { key: 'abiertas', label: 'Abiertas hoy',      value: statsHoy.value.abiertas,                      Icon: ClipboardList,  iconColor: 'text-amber-500',   iconBg: 'bg-amber-50',   sub: 'comandas activas' },
      { key: 'cerradas', label: 'En Caja',           value: statsHoy.value.cerradas,                      Icon: ClipboardCheck, iconColor: 'text-blue-500',    iconBg: 'bg-blue-50',    sub: 'pendientes de cobro' },
      { key: 'ventas',   label: 'Ventas',            value: formatCurrency(statsHoy.value.ventas),         Icon: DollarSign,     iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50', sub: 'sin servicio voluntario' },
      { key: 'servicio', label: 'Servicio',          value: formatCurrency(statsHoy.value.servicio),       Icon: Heart,          iconColor: 'text-rose-500',    iconBg: 'bg-rose-50',    sub: 'cargo de servicio' },
      { key: 'ingresos', label: 'Ingresos Totales',  value: formatCurrency(statsHoy.value.ingresos),       Icon: TrendingUp,     iconColor: 'text-teal-600',    iconBg: 'bg-teal-50',    sub: 'del día de hoy' },
    ])

    const fetchStatsHoy = async () => {
      if (statsLoading.value) return
      statsLoading.value = true
      try {
        const response = await fetch(buildApiUrl('/admin/stats-hoy'), {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        if (!response.ok) throw new Error(`Error ${response.status}`)
        const data = await response.json()
        statsHoy.value = data
      } catch (error) {
        console.error('Error al cargar stats del día:', error)
      } finally {
        statsLoading.value = false
      }
    }

    let chartVentas = null
    let chartGastos = null
    let chartInventario = null

    const resolveSocketEventData = (data = {}) => {
      const envelope = (data && typeof data === 'object') ? data : {}
      const payload = (envelope.payload && typeof envelope.payload === 'object') ? envelope.payload : envelope
      const sound = payload?.sonido || payload?.sound || envelope?.sonido || envelope?.sound || null
      return { payload, sound }
    }

    const reproducirSonidoSocket = async (data = {}, fallback = 'system_update.mp3') => {
      console.log('Intentando reproducir sonido:', data?.payload?.sonido)
      const { payload, sound } = resolveSocketEventData(data)
      const nombreArchivo = String(sound || fallback || '').trim()
      if (!nombreArchivo || payload?.__pbSoundHandled) return true

      try {
        const audio = new Audio('/sounds/' + nombreArchivo)
        await audio.play()
        return true
      } catch (error) {
        showAudioAlert.value = true
        console.warn('🔇 [Dashboard] Error reproduciendo sonido:', error?.message || error)
        return false
      }
    }

    const desbloquearAudio = async () => {
      if (activatingAudio.value) return
      activatingAudio.value = true

      try {
        const audio = new Audio('/sounds/system_update.mp3')
        audio.volume = 0
        await audio.play()
        audio.pause()
        audio.currentTime = 0
        showAudioAlert.value = false
      } catch (error) {
        showAudioAlert.value = true
        console.warn('🔇 [Dashboard] No fue posible desbloquear audio:', error?.message || error)
      } finally {
        activatingAudio.value = false
      }
    }

    const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const reporteSemanal = ref(null)
    let reporteLoading = false

    const buildWeekData = (rows) => {
      const labels = [], subtotals = [], servicios = [], totales = []
      const today = new Date()
      const pad = n => String(n).padStart(2, '0')
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
        const row = (rows || []).find(r => r.fecha === iso)
        labels.push(`${DAYS_ES[d.getDay()]} ${d.getDate()}`)
        subtotals.push(row ? Number(row.sub_total)       : 0)
        servicios.push(row ? Number(row.aporte_servicio) : 0)
        totales.push(row   ? Number(row.total_pagado)    : 0)
      }
      return { labels, subtotals, servicios, totales }
    }

    const renderChartVentas = () => {
      if (!chartVentasRef.value) return
      if (chartVentas) chartVentas.destroy()

      const c = getThemeChartColors()
      const { labels, subtotals, servicios, totales } = buildWeekData(reporteSemanal.value)

      chartVentas = new Chart(chartVentasRef.value, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Subtotal',
              data: subtotals,
              backgroundColor: 'rgba(59, 130, 246, 0.82)',
              borderRadius: 6,
              borderSkipped: false
            },
            {
              label: 'Servicio',
              data: servicios,
              backgroundColor: 'rgba(16, 185, 129, 0.82)',
              borderRadius: 6,
              borderSkipped: false
            },
            {
              label: 'Total Pagado',
              data: totales,
              backgroundColor: 'rgba(245, 158, 11, 0.85)',
              borderRadius: 6,
              borderSkipped: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              align: 'end',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                padding: 14,
                color: c.slate700,
                font: { weight: '600', size: 11 }
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = Number(ctx.raw || 0)
                  return ` ${ctx.dataset.label}: $ ${val.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: c.slate500, font: { weight: '600', size: 11 } }
            },
            y: {
              beginAtZero: true,
              grid: { color: c.borderSoft },
              ticks: {
                color: c.slate500,
                callback: (v) => {
                  if (v >= 1000000) return '$ ' + (v / 1000000).toFixed(1) + 'M'
                  if (v >= 1000)    return '$ ' + (v / 1000).toFixed(0) + 'k'
                  return '$ ' + v
                }
              }
            }
          }
        }
      })
    }

    const fetchReporteSemanal = async () => {
      if (reporteLoading) return
      reporteLoading = true
      try {
        const response = await fetch(buildApiUrl('/admin/reporte-semanal'), {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        if (!response.ok) throw new Error(`Error ${response.status}`)
        reporteSemanal.value = await response.json()
        renderChartVentas()
      } catch (error) {
        console.error('Error al cargar reporte semanal:', error)
      } finally {
        reporteLoading = false
      }
    }

    const initCharts = () => {
      if (chartGastos) chartGastos.destroy()
      if (chartInventario) chartInventario.destroy()

      if (!chartGastosRef.value || !chartInventarioRef.value) return

      const c = getThemeChartColors()

      chartGastos = new Chart(chartGastosRef.value, {
        type: 'doughnut',
        data: {
          labels: ['Insumos', 'Nomina', 'Servicios', 'Otros'],
          datasets: [{
            data: [40, 30, 20, 10],
            backgroundColor: [c.teal700, c.cyan500, c.cyan700, c.slate400],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                padding: 16,
                color: c.slate700,
                font: { weight: '600' }
              }
            }
          }
        }
      })

      chartInventario = new Chart(chartInventarioRef.value, {
        type: 'bar',
        data: {
          labels: ['Carne', 'Cerveza', 'Vino', 'Harina', 'Aceite'],
          datasets: [{
            label: 'Stock',
            data: [5, 45, 12, 4, 22],
            borderRadius: 12,
            borderSkipped: false,
            backgroundColor: (context) => {
              const value = context.raw
              return value < 10 ? c.red500 : c.teal500
            }
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: c.slate500, font: { weight: '700' } }
            },
            y: {
              beginAtZero: true,
              grid: { color: c.borderSoft },
              ticks: { color: c.slate500 }
            }
          }
        }
      })
    }

    const destroyCharts = () => {
      if (chartVentas)    chartVentas.destroy()
      if (chartGastos)    chartGastos.destroy()
      if (chartInventario) chartInventario.destroy()
    }

    const handleSystemCatalogUpdate = async (data = {}) => {
      const { payload, sound } = resolveSocketEventData(data)
      console.log('Intentando reproducir sonido:', data?.payload?.sonido)
      const notify = window.notifyUi || (() => {})

      await reproducirSonidoSocket(data, sound || 'system_update.mp3')
      notify({
        message: 'Sistema Actualizado',
        type: 'info',
        duration: 2600
      })

      initCharts()
    }

    const handleComandaPagada = () => {
      fetchStatsHoy()
      fetchReporteSemanal()
    }

    const handleComandaCerrada = async (data = {}) => {
      const { payload } = resolveSocketEventData(data)
      const comandaId = Number(payload?.id_comanda || payload?.comanda_id || payload?.id || 0)
      const notificationId = Number(payload?.notification_id || 0)
      const dedupKey = `transition:cerrada:${comandaId}:${notificationId}`
      if (!shouldProcessSocketEvent(SOCKET_EVENTS.COMANDA_CERRADA, payload, dedupKey)) return

      fetchStatsHoy()
    }

    const handleComandaPagadaRealtime = async (data = {}) => {
      const { payload } = resolveSocketEventData(data)
      const comandaId = Number(payload?.id_comanda || payload?.comanda_id || payload?.id || 0)
      const notificationId = Number(payload?.notification_id || 0)
      const dedupKey = `transition:pagada:${comandaId}:${notificationId}`
      if (!shouldProcessSocketEvent(SOCKET_EVENTS.COMANDA_PAGADA, payload, dedupKey)) return

      handleComandaPagada()
    }

    onMounted(() => {
      fetchStatsHoy()
      fetchReporteSemanal()
      setTimeout(initCharts, 160)
      if (window.socket) {
        window.socket.on(SOCKET_EVENTS.CATEGORIAS_ACTUALIZADAS, handleSystemCatalogUpdate)
        window.socket.on(SOCKET_EVENTS.PRODUCTOS_ACTUALIZADOS, handleSystemCatalogUpdate)
        window.socket.on(SOCKET_EVENTS.SOLICITUD_CUENTA, handleComandaCerrada)
        window.socket.on(SOCKET_EVENTS.COMANDA_CERRADA, handleComandaCerrada)
        window.socket.on(SOCKET_EVENTS.COMANDA_PAGADA, handleComandaPagadaRealtime)
      }
    })

    onUnmounted(() => {
      destroyCharts()
      if (window.socket) {
        window.socket.off(SOCKET_EVENTS.CATEGORIAS_ACTUALIZADAS, handleSystemCatalogUpdate)
        window.socket.off(SOCKET_EVENTS.PRODUCTOS_ACTUALIZADOS, handleSystemCatalogUpdate)
        window.socket.off(SOCKET_EVENTS.SOLICITUD_CUENTA, handleComandaCerrada)
        window.socket.off(SOCKET_EVENTS.COMANDA_CERRADA, handleComandaCerrada)
        window.socket.off(SOCKET_EVENTS.COMANDA_PAGADA, handleComandaPagadaRealtime)
      }
    })

    return {
      chartVentasRef,
      chartGastosRef,
      chartInventarioRef,
      summaryCards,
      statsLoading,
      showAudioAlert,
      activatingAudio,
      desbloquearAudio,
      user: authStore.user
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Sora:wght@600;700;800&display=swap');

.dashboard-shell {
  --bg-a: var(--pb-bg-a);
  --bg-b: var(--pb-bg-b);
  --panel: var(--pb-panel);
  font-family: var(--pb-font-ui);
  width: 100%;
  max-width: 1320px;
  min-width: 0;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 5% 5%, rgba(var(--pb-rgb-teal-700), 0.2) 0, transparent 36%),
    radial-gradient(circle at 90% 10%, rgba(var(--pb-rgb-cyan-500), 0.2) 0, transparent 30%),
    linear-gradient(180deg, var(--bg-a), var(--bg-b));
  border-radius: 2rem;
}

.audio-alert-btn {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 70;
  border: 1px solid #f59e0b;
  background: #fef3c7;
  color: #92400e;
  border-radius: 999px;
  padding: 0.45rem 0.75rem;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.hero-card {
  background:
    linear-gradient(130deg, rgba(var(--pb-rgb-sky-950), 0.92), rgba(var(--pb-rgb-teal-700), 0.9)),
    radial-gradient(circle at 80% 20%, rgba(var(--pb-rgb-cyan-300), 0.35), transparent 50%);
  box-shadow: var(--pb-shadow-hero);
}

.title,
.panel-title {
  font-family: var(--pb-font-title);
  letter-spacing: -0.02em;
}

.stat-card {
  background: var(--panel);
  border: 1px solid var(--pb-border-soft);
  box-shadow: var(--pb-shadow-soft);
  backdrop-filter: blur(6px);
}

.panel-card {
  background: var(--pb-panel-strong);
  border: 1px solid var(--pb-border-soft-2);
  box-shadow: var(--pb-shadow-panel);
}

@media (max-width: 1024px) {
  .dashboard-shell {
    border-radius: 1.5rem;
  }
}

@media (max-width: 820px) {
  .hero-card {
    padding: 1.1rem;
  }

  .title {
    font-size: clamp(1.55rem, 6vw, 2rem);
  }
}
</style>