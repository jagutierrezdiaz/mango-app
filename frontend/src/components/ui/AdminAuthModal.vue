<template>
  <Teleport to="body">
    <div
      v-if="mostrarModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      @keydown.esc.stop="cerrarModal"
    >
      <div class="modal-container rounded-2xl bg-white shadow-2xl max-w-md w-full animate-in">

        <!-- Header -->
        <div class="modal-header border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="fas fa-shield-halved text-red-600 text-base"></i>
            <h2 class="text-base font-black uppercase tracking-wide text-gray-800">
              {{ titulo || 'Confirmar Acción Crítica' }}
            </h2>
          </div>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600 transition"
            :disabled="validando || procesando"
            @click="cerrarModal"
            aria-label="Cerrar modal"
          >
            <i class="fas fa-times text-lg"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body px-6 py-5 space-y-4">

          <!-- Bloque de advertencia configurable -->
          <div class="rounded-xl bg-red-50 border border-red-200 p-4">
            <div class="flex items-start gap-3">
              <i class="fas fa-triangle-exclamation text-red-500 text-lg mt-0.5 flex-shrink-0"></i>
              <div>
                <p class="text-xs font-black uppercase tracking-wide text-red-700 mb-1">
                  Atención: Acción Crítica
                </p>
                <p class="text-sm text-red-800 leading-relaxed">
                  {{ mensajeAlerta || 'Esta operación modificará datos críticos del sistema.' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Información del administrador logueado -->
          <div class="rounded-lg bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200 px-4 py-3 flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center flex-shrink-0">
              <i class="fas fa-user-shield text-teal-700 text-xs"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-widest text-gray-500">Autoriza la acción</p>
              <p class="text-sm font-black text-gray-900 truncate">{{ nombreAdmin }}</p>
            </div>
            <span class="ml-auto text-[10px] font-black uppercase px-2 py-1 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">
              {{ rolAdmin }}
            </span>
          </div>

          <!-- Input de contraseña -->
          <label class="field-wrap">
            <span class="field-label text-xs">Confirme con su contraseña de administrador</span>
            <div class="relative">
              <input
                ref="passwordRef"
                v-model="passwordInput"
                :type="mostrarPassword ? 'text' : 'password'"
                class="field-input w-full pr-10"
                placeholder="Contraseña..."
                :disabled="validando || procesando"
                @keyup.enter="validarYConfirmar"
                autocomplete="current-password"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                :disabled="validando || procesando"
                @click="mostrarPassword = !mostrarPassword"
                tabindex="-1"
                aria-label="Mostrar u ocultar contraseña"
              >
                <i :class="mostrarPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
              </button>
            </div>
          </label>

          <!-- Error -->
          <div v-if="errorMessage" class="rounded-lg bg-red-50 border border-red-200 p-3">
            <p class="text-xs text-red-800 font-semibold flex items-start gap-2">
              <i class="fas fa-circle-xmark text-red-500 mt-0.5 flex-shrink-0"></i>
              <span>{{ errorMessage }}</span>
            </p>
          </div>

          <!-- Info / éxito -->
          <div v-if="infoMessage" class="rounded-lg bg-green-50 border border-green-200 p-3">
            <p class="text-xs text-green-800 font-semibold flex items-start gap-2">
              <i class="fas fa-circle-check text-green-600 mt-0.5 flex-shrink-0"></i>
              <span>{{ infoMessage }}</span>
            </p>
          </div>

        </div>

        <!-- Footer -->
        <div class="modal-footer border-t border-gray-100 bg-gray-50 rounded-b-2xl px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            class="btn-secondary px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition"
            :disabled="validando || procesando"
            @click="cerrarModal"
          >
            <i class="fas fa-ban mr-1.5"></i>
            {{ textoCancelar || 'Cancelar' }}
          </button>
          <button
            type="button"
            class="btn-danger px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition disabled:opacity-50"
            :disabled="!passwordInput.trim() || validando || procesando"
            @click="validarYConfirmar"
          >
            <i
              :class="(validando || procesando)
                ? 'fas fa-spinner fa-spin mr-1.5'
                : `${iconoBoton || 'fas fa-check'} mr-1.5`"
            ></i>
            {{ validando ? 'Verificando...' : procesando ? 'Procesando...' : (textoConfirmar || 'Sí, Proceder') }}
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script>
import { computed, nextTick, ref, watch } from 'vue';
import { buildApiUrl } from '../../config/api.js';
import { useAuthStore } from '../../stores/index.js';

export default {
  name: 'AdminAuthModal',

  props: {
    /** Controla visibilidad via v-model */
    modelValue: {
      type: Boolean,
      default: false
    },
    /** Título del header del modal */
    titulo: {
      type: String,
      default: 'Confirmar Acción Crítica'
    },
    /** Cuerpo del bloque de advertencia roja */
    mensajeAlerta: {
      type: String,
      default: ''
    },
    /** Texto del botón de confirmación */
    textoConfirmar: {
      type: String,
      default: 'Sí, Proceder'
    },
    /** Texto del botón de cancelación */
    textoCancelar: {
      type: String,
      default: 'Cancelar'
    },
    /** Clase del ícono FA para el botón de confirmación */
    iconoBoton: {
      type: String,
      default: 'fas fa-check'
    },
    /**
     * Función custom de validación de contraseña.
     * Recibe (password: string) → Promise<{ success: boolean, message?: string }>
     * Si no se provee, usa POST /api/auth/validar-contrasena.
     */
    validarFn: {
      type: Function,
      default: null
    }
  },

  emits: [
    'update:modelValue',
    'confirmacion-final', // { usuarioId, timestamp } — emitido solo tras auth exitosa
    'cancelado'
  ],

  setup(props, { emit }) {
    const authStore = useAuthStore();
    const passwordRef = ref(null);
    const mostrarModal = ref(props.modelValue);
    const passwordInput = ref('');
    const mostrarPassword = ref(false);
    const validando = ref(false);
    const procesando = ref(false);
    const errorMessage = ref('');
    const infoMessage = ref('');

    // ── Datos del admin logueado ────────────────────────────────────────────
    const nombreAdmin = computed(() => {
      const u = authStore.user;
      if (!u) return 'Administrador';
      const simple = String(u.nombre || '').trim();
      if (simple) return simple;
      return [u.nombres, u.apellidos].filter(Boolean).join(' ').trim() || u.usuario || 'Administrador';
    });

    const rolAdmin = computed(() =>
      String(authStore.user?.rol || '').trim() || 'ADMINISTRADOR'
    );

    // ── Sincronización v-model ──────────────────────────────────────────────
    watch(() => props.modelValue, (newVal) => {
      mostrarModal.value = newVal;
      if (newVal) {
        resetState();
        // Foco automático en el input de contraseña
        nextTick(() => passwordRef.value?.focus());
      }
    });

    watch(mostrarModal, (newVal) => emit('update:modelValue', newVal));

    // ── Helpers ────────────────────────────────────────────────────────────
    const resetState = () => {
      passwordInput.value = '';
      mostrarPassword.value = false;
      validando.value = false;
      procesando.value = false;
      errorMessage.value = '';
      infoMessage.value = '';
    };

    const cerrarModal = () => {
      if (validando.value || procesando.value) return;
      mostrarModal.value = false;
      resetState();
      emit('cancelado');
    };

    const validarContrasenaPorDefecto = async (password) => {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('/auth/validar-contrasena'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password })
      });
      const result = await response.json().catch(() => ({}));
      return { success: result.success === true, message: result.message };
    };

    // ── Acción principal ───────────────────────────────────────────────────
    const validarYConfirmar = async () => {
      if (!passwordInput.value.trim()) {
        errorMessage.value = 'Por favor ingrese su contraseña.';
        return;
      }
      if (validando.value || procesando.value) return;

      validando.value = true;
      errorMessage.value = '';
      infoMessage.value = '';

      try {
        const resultado = props.validarFn
          ? await props.validarFn(passwordInput.value)
          : await validarContrasenaPorDefecto(passwordInput.value);

        if (!resultado.success) {
          errorMessage.value = resultado.message || 'La contraseña ingresada es incorrecta.';
          passwordInput.value = '';
          nextTick(() => passwordRef.value?.focus());
          return;
        }

        // Contraseña válida → dar feedback e invocar al padre
        validando.value = false;
        procesando.value = true;
        infoMessage.value = 'Contraseña verificada. Procesando...';

        try {
          emit('confirmacion-final', {
            usuarioId: authStore.user?.id,
            usuario: authStore.user?.usuario,
            timestamp: new Date().toISOString(),
            token: localStorage.getItem('token')
          });
          mostrarModal.value = false;
          resetState();
        } finally {
          procesando.value = false;
        }
      } catch (error) {
        errorMessage.value = error.message || 'Error al validar la contraseña.';
      } finally {
        validando.value = false;
      }
    };

    return {
      passwordRef,
      mostrarModal,
      passwordInput,
      mostrarPassword,
      validando,
      procesando,
      errorMessage,
      infoMessage,
      nombreAdmin,
      rolAdmin,
      cerrarModal,
      validarYConfirmar
    };
  }
};
</script>

<style scoped>
.animate-in {
  animation: fadeScaleIn 180ms ease both;
}

@keyframes fadeScaleIn {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(-6px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
