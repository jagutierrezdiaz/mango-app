<template>
  <div class="relative w-full max-w-xs">
    <button
      type="button"
      class="w-full flex items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
      @click="toggleDropdown"
      :aria-expanded="open ? 'true' : 'false'"
    >
      <span class="truncate text-slate-800 font-semibold">{{ displayValue }}</span>
      <svg class="w-5 h-5 text-slate-400 ml-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <transition name="fade">
      <ul
        v-if="open"
        class="absolute z-20 mt-1 w-full rounded-lg bg-white shadow-lg border border-slate-200 max-h-60 overflow-auto"
      >
        <li
          v-for="date in dates"
          :key="date"
          @click="selectDate(date)"
          class="px-4 py-2 cursor-pointer hover:bg-teal-50 text-slate-700"
          :class="{ 'bg-teal-100 font-bold': date === modelValue }"
        >
          {{ date }}
        </li>
      </ul>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';

const props = defineProps({
  modelValue: { type: String, required: true },
  year: { type: Number, default: new Date().getFullYear() }
});
const emit = defineEmits(['update:modelValue']);

const open = ref(false);
const dates = ref([]);

const displayValue = computed(() => props.modelValue || 'Selecciona una fecha');

function toggleDropdown() {
  open.value = !open.value;
}

function selectDate(date) {
  emit('update:modelValue', date);
  open.value = false;
}

function generateDates(year) {
  const today = new Date();
  const start = new Date(year, 0, 1);
  const end = year === today.getFullYear() ? today : new Date(year, 11, 31);
  const result = [];
  let d = new Date(start);
  while (d <= end) {
    result.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return result.reverse(); // Más reciente primero
}

onMounted(() => {
  dates.value = generateDates(props.year);
});

watch(() => props.year, (newYear) => {
  dates.value = generateDates(newYear);
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.15s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
