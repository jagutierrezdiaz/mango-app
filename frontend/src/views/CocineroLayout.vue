<template>
  <div class="min-h-screen bg-slate-50 text-slate-800">
    <main class="pb-24">
      <router-view />
    </main>

    <nav class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
      <div class="mx-auto grid h-16 w-full max-w-5xl grid-cols-1 px-3">
        <router-link
          to="/cocina/pedidos"
          class="btn-icon-text h-full rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 transition"
          active-class="text-blue-700"
        >
          <ClipboardCheck :size="18" />
          <span>Programacion</span>
        </router-link>
      </div>
    </nav>

    <RemoteSupportWidget />
  </div>
</template>

<script>
import { ClipboardCheck } from 'lucide-vue-next';
import RemoteSupportWidget from '../components/RemoteSupportWidget.vue';

export default {
  name: 'CocineroLayout',
  components: {
    ClipboardCheck,
    RemoteSupportWidget
  }
};
</script>
