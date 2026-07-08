<template>
  <!-- Vista de Caja para CAJERO -->
  <div class="caja-view">
    <h1>Caja - Cajero</h1>
    <p>Interfaz para gestionar cobros y cierres (pendiente de desarrollo)</p>
    <!-- TODO: Mostrar comandas listas para cobrar -->
  </div>
</template>

<script>
import { useComandasStore } from '../stores'

export default {
  name: 'Caja',
  setup() {
    const comandasStore = useComandasStore()
    return {}
  }
}
</script>