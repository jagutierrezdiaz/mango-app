<template>
  <section class="space-y-4">
    <div class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Panel de Cocina</p>
      <h2 class="mt-1 text-2xl font-black uppercase tracking-tight text-slate-800">Pedidos de Cocina</h2>
      <p class="mt-2 text-sm font-semibold text-slate-500">Vista base para preparar y marcar pedidos.</p>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <article class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p class="text-[10px] font-black uppercase tracking-widest text-amber-700">Pendientes</p>
        <p class="mt-2 text-2xl font-black text-amber-800">0</p>
      </article>
      <article class="rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <p class="text-[10px] font-black uppercase tracking-widest text-blue-700">En preparación</p>
        <p class="mt-2 text-2xl font-black text-blue-800">0</p>
      </article>
      <article class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p class="text-[10px] font-black uppercase tracking-widest text-emerald-700">Listos</p>
        <p class="mt-2 text-2xl font-black text-emerald-800">0</p>
      </article>
      <article class="rounded-2xl border border-slate-200 bg-slate-100 p-4">
        <p class="text-[10px] font-black uppercase tracking-widest text-slate-600">Total</p>
        <p class="mt-2 text-2xl font-black text-slate-800">0</p>
      </article>
    </div>
  </section>
</template>

<script>
export default {
  name: 'PedidosView'
};
</script>
