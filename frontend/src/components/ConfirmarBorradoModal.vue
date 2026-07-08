<template>
  <!-- Modal Overlay -->
  <Teleport to="body">
    <div v-if="mostrarModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="modal-container rounded-2xl bg-white shadow-2xl max-w-md w-full animate-in">
        <!-- Header -->
        <div class="modal-header border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="fas fa-shield-halved text-red-600 text-base"></i>
            <h2 class="text-base font-black uppercase tracking-wide text-gray-800">Confirmar Eliminación</h2>
          </div>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600 transition"
            @click="cerrarModal"
            aria-label="Cerrar modal"
          >
            <i class="fas fa-times text-lg"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body px-6 py-5 space-y-4">

          <!-- Advertencia de pérdida de datos (dinámica) -->
          <div class="rounded-xl bg-red-50 border border-red-200 p-4">
            <div class="flex items-start gap-3">
              <i class="fas fa-triangle-exclamation text-red-500 text-lg mt-0.5 flex-shrink-0"></i>
              <div>
                <p class="text-xs font-black uppercase tracking-wide text-red-700 mb-1">Atención: Acción Irreversible</p>
                <p class="text-sm text-red-800 leading-relaxed">
                  {{ mensajeAdvertencia || 'Esta acción eliminará el registro de forma permanente. Esta acción es irreversible.' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Información del Admin -->
          <div class="rounded-lg bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200 px-4 py-3 flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center flex-shrink-0">
              <i class="fas fa-user-shield text-teal-700 text-xs"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-widest text-gray-500">Autoriza la eliminación</p>
              <p class="text-sm font-black text-gray-900 truncate">{{ nombreCompleto }}</p>
            </div>
            <span class="ml-auto text-[10px] font-black uppercase px-2 py-1 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">
              {{ usuarioActivo?.rol }}
            </span>
          </div>

          <!-- Password Input -->
          <label class="field-wrap">
            <span class="field-label text-xs">Confirme con su contraseña de administrador</span>
            <div class="relative">
              <input
                v-model="passwordInput"
                :type="mostrarPassword ? 'text' : 'password'"
                class="field-input w-full pr-10"
                placeholder="Contraseña..."
                :disabled="validando || confirmandoFinal"
                @keyup.enter="validarContrasena"
                autofocus
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                @click="mostrarPassword = !mostrarPassword"
                :disabled="validando || confirmandoFinal"
                tabindex="-1"
              >
                <i :class="mostrarPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
              </button>
            </div>
          </label>

          <!-- Error Message -->
          <div v-if="errorMessage" class="rounded-lg bg-red-50 border border-red-200 p-3">
            <p class="text-xs text-red-800 font-semibold flex items-start gap-2">
              <i class="fas fa-circle-xmark text-red-500 mt-0.5 flex-shrink-0"></i>
              <span>{{ errorMessage }}</span>
            </p>
          </div>

          <!-- Info Message (success feedback) -->
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
            :disabled="validando || confirmandoFinal"
            @click="cerrarModal"
          >
            <i class="fas fa-ban mr-1.5"></i> No, mantener registro
          </button>
          <button
            type="button"
            class="btn-danger px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition"
            :disabled="!passwordInput.trim() || validando || confirmandoFinal"
            @click="validarContrasena"
          >
            <i v-if="validando || confirmandoFinal" class="fas fa-spinner fa-spin mr-1.5"></i>
            <i v-else class="fas fa-trash-can mr-1.5"></i>
            {{ validando ? 'Verificando...' : confirmandoFinal ? 'Eliminando...' : 'Sí, eliminar todo' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { computed, ref, watch } from 'vue';
import { buildApiUrl } from '../config/api.js';

export default {
  name: 'ConfirmarBorradoModal',
  props: {
    /**
     * Objeto con datos del usuario administrador
     * { id, nombres, apellidos, rol, ... }
     */
    usuarioActivo: {
      type: Object,
      required: true
    },
    /**
     * Controla si el modal está abierto
     */
    modelValue: {
      type: Boolean,
      default: false
    },
    /**
     * Mensaje de advertencia específico de la acción a realizar
     * Ej: 'Al eliminar este producto, se borrará también su ficha técnica...'
     */
    mensajeAdvertencia: {
      type: String,
      default: ''
    },
    /**
     * Función o ruta para validar la contraseña
     * Por defecto: validarContrasenaPorId(id, password) → Promise
     */
    validarFn: {
      type: Function,
      default: null
    }
  },

  emits: [
    'update:modelValue',  // Control del modal desde padre
    'validacion-correcta', // Emitido cuando la contraseña es correcta
    'confirmacion-final',  // Emitido cuando el usuario confirma el borrado
    'cancelado'            // Emitido cuando se cancela
  ],

  setup(props, { emit }) {
    const mostrarModal = ref(props.modelValue);
    const passwordInput = ref('');
    const mostrarPassword = ref(false);
    const validando = ref(false);
    const confirmandoFinal = ref(false);
    const errorMessage = ref('');
    const infoMessage = ref('');
    const contrasennaValidada = ref(false);

    const nombreCompleto = computed(() => {
      const nombrePlano = String(props.usuarioActivo?.nombre || '').trim();
      if (nombrePlano) {
        return nombrePlano;
      }

      return [props.usuarioActivo?.nombres, props.usuarioActivo?.apellidos]
        .filter(Boolean)
        .join(' ')
        .trim() || 'Administrador';
    });

    // Sincronizar modalValue con prop
    watch(
      () => props.modelValue,
      (newVal) => {
        mostrarModal.value = newVal;
        if (newVal) {
          // Validar rol al abrir
          validarRol();
          passwordInput.value = '';
          errorMessage.value = '';
          infoMessage.value = '';
          contrasennaValidada.value = false;
          mostrarPassword.value = false;
        }
      }
    );

    watch(mostrarModal, (newVal) => {
      emit('update:modelValue', newVal);
    });

    /**
     * Valida el rol del usuario
     */
    const validarRol = () => {
      const rol = String(props.usuarioActivo?.rol || '').trim().toLowerCase();
      if (rol !== 'administrador') {
        alert('Acceso denegado. Solo administradores pueden ejecutar esta acción.');
        cerrarModal();
        emit('cancelado');
      }
    };

    /**
     * Cierra el modal
     */
    const cerrarModal = () => {
      mostrarModal.value = false;
      passwordInput.value = '';
      errorMessage.value = '';
      infoMessage.value = '';
      contrasennaValidada.value = false;
    };

    /**
     * Valida la contraseña contra el backend
     */
    const validarContrasena = async () => {
      if (!passwordInput.value.trim()) {
        errorMessage.value = 'Por favor ingrese su contraseña.';
        return;
      }

      validando.value = true;
      errorMessage.value = '';
      infoMessage.value = '';

      try {
        // Usar función custom o hacer la validación por defecto
        const resultado = props.validarFn
          ? await props.validarFn(passwordInput.value)
          : await validarContrasenaPorDefecto(passwordInput.value);

        if (!resultado.success) {
          errorMessage.value = resultado.message || 'La contraseña es incorrecta.';
          contrasennaValidada.value = false;
        } else {
          // Contraseña válida: ejecutar directamente sin window.confirm()
          contrasennaValidada.value = true;
          confirmandoFinal.value = true;
          infoMessage.value = 'Contraseña verificada. Procesando eliminación...';
          try {
            emit('confirmacion-final', {
              usuarioId: props.usuarioActivo?.id,
              timestamp: new Date().toISOString()
            });
            cerrarModal();
          } finally {
            confirmandoFinal.value = false;
          }
        }
      } catch (error) {
        errorMessage.value = error.message || 'Error al validar la contraseña.';
        contrasennaValidada.value = false;
      } finally {
        validando.value = false;
      }
    };

    /**
     * Validación por defecto: llamar al backend
     */
    const validarContrasenaPorDefecto = async (password) => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(buildApiUrl('/auth/validar-contrasena'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ password })
        });

        const result = await response.json();
        return {
          success: result.success,
          message: result.message
        };
      } catch (error) {
        throw new Error('Error de conexión al validar la contraseña.');
      }
    };

    return {
      mostrarModal,
      nombreCompleto,
      passwordInput,
      mostrarPassword,
      validando,
      confirmandoFinal,
      errorMessage,
      infoMessage,
      cerrarModal,
      validarContrasena
    };
  }
};
</script>

<style scoped>
.field-wrap {
  @apply flex flex-col gap-1.5;
}

.field-label {
  @apply font-bold uppercase tracking-wide text-gray-700;
}

.field-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal text-gray-700 placeholder-gray-400 transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed;
}

.btn-secondary {
  @apply bg-white text-gray-600 font-bold border border-gray-300 hover:bg-gray-100 hover:text-gray-800 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors;
}

.btn-danger {
  @apply bg-red-600 text-white font-bold hover:bg-red-700 active:bg-red-800 disabled:bg-red-300 disabled:text-red-100 disabled:cursor-not-allowed transition-colors shadow-sm;
}

.modal-container {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.animate-in {
  animation: fadeIn 0.2s ease-out;
}
</style>
