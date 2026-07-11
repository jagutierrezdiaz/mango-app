<template>
  <div class="flex h-[100dvh] flex-col overflow-hidden bg-slate-50 text-slate-800">
    <main class="min-h-0 w-full flex-1 overflow-hidden">
      <router-view />
    </main>

    <nav class="shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
      <div class="grid h-16 w-full grid-cols-1 px-3 md:px-6 lg:px-8">
        <router-link
          to="/cajero/arqueo"
          class="btn-icon-text h-full rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 transition"
          active-class="text-emerald-700"
        >
          <ReceiptText :size="18" />
          <span>Cobros</span>
        </router-link>
      </div>
    </nav>

    <RemoteSupportWidget />
  </div>
</template>

<script>
import { ReceiptText } from 'lucide-vue-next';
import RemoteSupportWidget from '../components/RemoteSupportWidget.vue';

export default {
  name: 'CajeroLayout',
  components: {
    ReceiptText,
    RemoteSupportWidget
  }
};
</script>
