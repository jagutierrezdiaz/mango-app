<template>
  <div class="parametros-view admin-crud-shell min-h-screen w-full max-w-full overflow-x-hidden p-4 md:p-6">
    <section class="mb-5 rounded-3xl border border-cyan-100 bg-gradient-to-r from-cyan-50 via-white to-amber-50 p-5 md:p-6 shadow-sm">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="admin-crud-title text-3xl font-black uppercase italic tracking-tighter text-teal-700">Parametros del Sistema</h1>
          <p class="admin-crud-subtitle mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Configuracion central de valores operativos
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="pb-btn pb-btn-secondary pb-btn-unified px-4 py-2 text-[10px]"
            :disabled="loading || saving"
            @click="recargar"
          >
            <i class="fas fa-rotate-right"></i>
            <span>Recargar</span>
          </button>
          <button
            type="button"
            class="pb-btn pb-btn-new pb-btn-unified px-5 py-2 text-[10px] disabled:opacity-50"
            :disabled="!hayCambios || saving || loading"
            @click="guardarCambios"
          >
            <i :class="saving ? 'fas fa-circle-notch fa-spin' : 'fas fa-save'"></i>
            <span>{{ saving ? 'Guardando...' : 'Guardar' }}</span>
          </button>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        <span class="rounded-full border border-slate-200 bg-white px-3 py-1">{{ parametros.length }} parametros</span>
        <span v-if="hayCambios" class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
          Cambios pendientes
        </span>
      </div>
    </section>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="h-10 w-10 animate-spin rounded-full border-2 border-teal-600 border-t-transparent"></div>
    </div>

    <div v-else-if="!parametros.length" class="admin-crud-panel rounded-3xl p-14 text-center">
      <i class="fas fa-sliders-h mb-4 block text-4xl text-gray-300"></i>
      <p class="text-lg font-semibold text-gray-400">No hay parametros configurados</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-3">
      <article
        v-for="param in parametros"
        :key="param.id"
        class="param-card rounded-[1.7rem] border border-slate-200 bg-white/95 p-4 sm:p-5"
      >
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div class="min-w-0 flex-1">
            <p class="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">Nombre del parametro</p>
            <h2 class="mt-1 text-sm font-black uppercase text-slate-800">{{ prettyName(param.nombre_parametro) }}</h2>
            <p v-if="param.descripcion" class="mt-2 text-xs font-semibold text-slate-500">{{ param.descripcion }}</p>
            <p class="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Ultima actualizacion: {{ formatDateTime(param.ultima_actualizacion) }}
            </p>
          </div>

          <div class="flex w-full flex-col gap-3 lg:w-[360px]">
            <div class="flex items-center justify-between gap-3">
              <span class="type-chip" :class="getTipoClass(param.tipo_dato)">{{ param.tipo_dato }}</span>
              <button
                type="button"
                class="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-700"
                :disabled="saving"
                @click="restaurarValor(param.id)"
              >
                Restaurar
              </button>
            </div>

            <label class="field-wrap">
              <span class="field-label">Valor</span>
              <div class="field-input-wrap" :class="isNumericType(param.tipo_dato) ? 'field-input-wrap-numeric' : ''">
                <span v-if="param.tipo_dato === 'moneda'" class="field-prefix">$</span>
                <input
                  v-model="draft[param.id]"
                  :type="param.tipo_dato === 'texto' ? 'text' : 'text'"
                  :inputmode="isNumericType(param.tipo_dato) ? 'decimal' : 'text'"
                  class="field-input"
                  :class="isNumericType(param.tipo_dato) ? 'text-right' : ''"
                  :placeholder="getPlaceholder(param.tipo_dato)"
                  :disabled="saving"
                >
                <span v-if="param.tipo_dato === 'porcentaje'" class="field-suffix">%</span>
              </div>
            </label>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue';
import { parametrosSistemaService } from '../services/parametrosSistemaService.js';

const parseLocaleNumber = (value) => {
  if (value === null || value === undefined || value === '') return NaN;
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;

  const raw = String(value).trim();
  if (!raw) return NaN;

  let normalized = raw;
  if (raw.includes(',') && raw.includes('.')) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if (raw.includes(',')) {
    normalized = raw.replace(',', '.');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const normalizeValueByType = (value, tipoDato) => {
  if (tipoDato === 'texto') {
    const text = String(value ?? '').trim();
    if (!text) throw new Error('El valor de texto no puede estar vacio.');
    return text;
  }

  const numeric = parseLocaleNumber(value);
  if (!Number.isFinite(numeric)) {
    throw new Error('El valor numerico no es valido.');
  }

  if (tipoDato === 'porcentaje') {
    if (numeric < 0 || numeric > 100) {
      throw new Error('El porcentaje debe estar entre 0 y 100.');
    }
    return String(Number(numeric.toFixed(4)));
  }

  if (tipoDato === 'moneda') {
    if (numeric < 0) {
      throw new Error('El valor de moneda no puede ser negativo.');
    }
    return String(Number(numeric.toFixed(2)));
  }

  return String(Number(numeric));
};

export default {
  name: 'ParametrosSistema',
  setup() {
    const loading = ref(true);
    const saving = ref(false);
    const parametros = ref([]);
    const draft = ref({});
    const original = ref({});

    const hydrateDraft = (rows) => {
      const nextDraft = {};
      const nextOriginal = {};
      rows.forEach((item) => {
        const value = String(item.valor_parametro ?? '');
        nextDraft[item.id] = value;
        nextOriginal[item.id] = value;
      });
      draft.value = nextDraft;
      original.value = nextOriginal;
    };

    const cargar = async () => {
      loading.value = true;
      try {
        const rows = await parametrosSistemaService.getAll();
        parametros.value = rows;
        hydrateDraft(rows);
      } catch (error) {
        alert(error.message || 'No se pudieron cargar los parametros.');
      } finally {
        loading.value = false;
      }
    };

    const hayCambios = computed(() => {
      return parametros.value.some((item) => {
        const id = item.id;
        return String(draft.value[id] ?? '').trim() !== String(original.value[id] ?? '').trim();
      });
    });

    const recargar = async () => {
      if (saving.value) return;
      await cargar();
    };

    const restaurarValor = (id) => {
      draft.value[id] = String(original.value[id] ?? '');
    };

    const prettyName = (value = '') => String(value).replace(/_/g, ' ');

    const formatDateTime = (value) => {
      if (!value) return 'Sin fecha';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    };

    const isNumericType = (tipoDato) => ['porcentaje', 'moneda', 'numero'].includes(String(tipoDato || '').toLowerCase());

    const getTipoClass = (tipoDato) => {
      const t = String(tipoDato || '').toLowerCase();
      if (t === 'porcentaje') return 'type-chip-porcentaje';
      if (t === 'moneda') return 'type-chip-moneda';
      if (t === 'numero') return 'type-chip-numero';
      return 'type-chip-texto';
    };

    const getPlaceholder = (tipoDato) => {
      const t = String(tipoDato || '').toLowerCase();
      if (t === 'porcentaje') return '0 - 100';
      if (t === 'moneda') return '0.00';
      if (t === 'numero') return '0';
      return 'Escribe un valor';
    };

    const guardarCambios = async () => {
      if (!hayCambios.value || saving.value) return;

      const cambios = parametros.value.filter((item) => {
        const id = item.id;
        return String(draft.value[id] ?? '').trim() !== String(original.value[id] ?? '').trim();
      });

      if (!cambios.length) return;

      saving.value = true;
      try {
        for (const item of cambios) {
          const nextValue = normalizeValueByType(draft.value[item.id], item.tipo_dato);
          await parametrosSistemaService.update(item.id, {
            valor_parametro: nextValue,
            tipo_dato: item.tipo_dato,
            descripcion: item.descripcion
          });
        }

        alert('Parametros actualizados correctamente.');
        await cargar();
      } catch (error) {
        alert(error.message || 'No se pudieron guardar los cambios.');
      } finally {
        saving.value = false;
      }
    };

    onMounted(() => {
      cargar();
    });

    return {
      loading,
      saving,
      parametros,
      draft,
      hayCambios,
      recargar,
      restaurarValor,
      prettyName,
      formatDateTime,
      isNumericType,
      getTipoClass,
      getPlaceholder,
      guardarCambios
    };
  }
};
</script>

<style scoped>
.parametros-view {
  background:
    radial-gradient(circle at 8% 10%, rgba(20, 184, 166, 0.1) 0, transparent 36%),
    radial-gradient(circle at 92% 8%, rgba(251, 191, 36, 0.1) 0, transparent 34%),
    linear-gradient(180deg, #f8fafc, #fdfdfd);
  border-radius: 1.8rem;
}

.param-card {
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.type-chip {
  border-radius: 999px;
  border: 1px solid;
  padding: 0.3rem 0.7rem;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.type-chip-porcentaje {
  background: #fef3c7;
  border-color: #fcd34d;
  color: #92400e;
}

.type-chip-moneda {
  background: #dcfce7;
  border-color: #86efac;
  color: #166534;
}

.type-chip-numero {
  background: #dbeafe;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.type-chip-texto {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #334155;
}

.field-wrap {
  display: block;
}

.field-label {
  margin-bottom: 0.45rem;
  display: block;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(100 116 139 / 1);
}

.field-input-wrap {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid rgb(226 232 240 / 1);
  border-radius: 1rem;
  background: white;
  padding: 0.3rem 0.65rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.field-input-wrap:focus-within {
  border-color: rgb(20 184 166 / 1);
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.12);
}

.field-input-wrap-numeric {
  justify-content: flex-end;
}

.field-prefix,
.field-suffix {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 900;
  color: rgb(71 85 105 / 1);
}

.field-input {
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  padding: 0.55rem 0.35rem;
  font-size: 0.92rem;
  font-weight: 800;
  color: rgb(15 23 42 / 1);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 1024px) {
  .parametros-view {
    border-radius: 1.2rem;
  }
}
</style>
