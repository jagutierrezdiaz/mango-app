<template>
  <div class="mesero-layout min-h-screen w-full bg-slate-50 text-slate-800 overflow-x-hidden">
    <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-5 lg:px-6">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 shrink-0">
            <UtensilsCrossed :size="20" />
          </div>
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-full overflow-hidden border-2 border-teal-300 bg-slate-100 shrink-0 flex items-center justify-center">
              <img
                :src="avatarSrc"
                :alt="currentUser?.nombre || 'Usuario'"
                class="w-full h-full object-cover"
                @error="onAvatarError"
              >
            </div>
            <div class="leading-tight">
              <p class="text-xs font-black uppercase tracking-wide text-slate-800">{{ currentUser ? currentUser.nombre : 'Usuario' }}</p>
              <p class="text-[9px] font-bold uppercase tracking-widest text-teal-600">{{ currentUser ? currentUser.rol : '' }}</p>
            </div>
          </div>
        </div>

        <button
          @click="logout"
          class="btn-icon-text rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-600 transition hover:bg-slate-100"
        >
          <LogOut :size="15" />
          <span>Salir</span>
        </button>
      </div>
    </header>

    <main class="mesero-main px-4 pb-24 pt-4 md:px-6 lg:px-8">
      <div class="mesero-content-shell">
        <router-view />
      </div>
    </main>

    <nav class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
      <div class="mx-auto grid h-16 w-full max-w-6xl grid-cols-1 px-4 md:px-6 lg:px-8">
        <router-link
          to="/mesero/pedidos"
          class="btn-icon-text h-full rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 transition"
          active-class="text-teal-700"
        >
          <ClipboardList :size="18" />
          <span>Comanda</span>
        </router-link>
      </div>
    </nav>
  </div>
</template>

<script>
import { ClipboardList, LogOut, UtensilsCrossed } from 'lucide-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores';
import { API_BASE_URL as API_BASE, buildApiUrl } from '../config/api.js';

const UPLOADS_BASE = (process.env.VUE_APP_UPLOADS_BASE_URL || API_BASE.replace(/\/api\/?$/, '')).replace(/\/$/, '');

export default {
  name: 'MeseroLayout',
  components: {
    ClipboardList,
    LogOut,
    UtensilsCrossed
  },
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();

    const currentUser = computed(() => authStore.user);
    const userPhoto = ref(authStore.user?.url_foto || null);

    const getFallbackAvatar = (name = 'Usuario') => {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f1f5f9&color=64748b`;
    };

    const getUserPhotoUrl = (filename, name = 'Usuario') => {
      if (!filename) return getFallbackAvatar(name);
      if (/^https?:\/\//i.test(filename)) return filename;
      if (filename.startsWith('/uploads/')) return `${UPLOADS_BASE}${filename}`;
      return `${UPLOADS_BASE}/uploads/personal/${filename}`;
    };

    const avatarSrc = computed(() => getUserPhotoUrl(userPhoto.value, currentUser.value?.nombre || 'Usuario'));

    const fetchMyPhoto = async () => {
      const userId = currentUser.value?.id;
      if (!userId || userPhoto.value) return;
      try {
        const response = await fetch(buildApiUrl(`/personal/${userId}`), {
          headers: {
            Authorization: `Bearer ${authStore.token}`
          }
        });
        const result = await response.json();
        if (result?.success && result?.data?.url_foto) {
          userPhoto.value = result.data.url_foto;
        }
      } catch (error) {
        console.warn('No se pudo cargar la foto del mesero:', error);
      }
    };

    const onAvatarError = (event) => {
      event.target.src = getFallbackAvatar(currentUser.value?.nombre || 'Usuario');
    };

    const logout = async () => {
      await authStore.logout();
      router.push('/login');
    };

    onMounted(() => {
      fetchMyPhoto();
    });

    return {
      currentUser,
      avatarSrc,
      getUserPhotoUrl,
      onAvatarError,
      logout
    };
  }
};
</script>

<style scoped>
.mesero-layout {
  min-height: 100svh;
}

.mesero-main {
  width: 100%;
  max-width: 100%;
  margin-inline: auto;
  padding-left: clamp(1rem, 3vw, 2rem);
  padding-right: clamp(1rem, 3vw, 2rem);
  padding-bottom: calc(6rem + env(safe-area-inset-bottom));
  overflow-x: hidden;
  overflow-y: visible;
  overscroll-behavior-y: auto;
}

.mesero-content-shell {
  width: min(100%, 1200px);
  margin-inline: auto;
}

@media (min-width: 768px) and (max-width: 1366px) {
  .mesero-main {
    padding-left: clamp(1rem, 2.2vw, 1.65rem);
    padding-right: clamp(1rem, 2.2vw, 1.65rem);
  }

  .mesero-content-shell {
    width: min(100%, 1060px);
  }
}

/* --- FIX: Visibilidad encabezado y botones en tablets (700px-1200px) --- */
@media (min-width: 700px) and (max-width: 1200px) {
  .mesero-layout header {
    min-height: 64px !important;
    height: auto !important;
    display: block !important;
    opacity: 1 !important;
    position: sticky !important;
    top: 0 !important;
    z-index: 30 !important;
    background: rgba(255,255,255,0.97) !important;
    box-shadow: 0 2px 8px 0 rgba(0,0,0,0.03);
  }
  .mesero-layout header * {
    visibility: visible !important;
    opacity: 1 !important;
    color: inherit !important;
    font-size: 1em !important;
    text-indent: 0 !important;
    text-transform: none !important;
  }
  .btn-icon-text span {
    display: inline !important;
    font-size: 0.95em !important;
    font-weight: 700 !important;
    letter-spacing: 0.04em !important;
    text-transform: uppercase !important;
    margin-left: 0.4em !important;
  }
  .btn-icon-text {
    min-width: 64px !important;
    min-height: 36px !important;
    padding: 0.5em 1.2em !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 0.4em !important;
  }
  nav .btn-icon-text span {
    display: inline !important;
  }
}
</style>
