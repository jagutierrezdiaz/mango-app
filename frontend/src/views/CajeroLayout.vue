<template>
  <div class="min-h-screen bg-slate-50 text-slate-800">
    <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div class="flex h-16 w-full items-center justify-between px-4 md:px-6 lg:px-8">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 shrink-0">
            <Wallet :size="20" />
          </div>
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-full overflow-hidden border-2 border-rose-300 bg-slate-100 shrink-0 flex items-center justify-center">
              <img
                :src="avatarSrc"
                :alt="displayName"
                class="w-full h-full object-cover"
                @error="onAvatarError"
              >
            </div>
            <div class="leading-tight">
              <p class="text-xs font-black uppercase tracking-wide text-slate-800">{{ displayName }}</p>
              <p class="text-[9px] font-bold uppercase tracking-widest text-rose-600">{{ displayRole }}</p>
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

    <main class="w-full px-3 pb-24 pt-4 md:px-6 lg:px-8">
      <router-view />
    </main>

    <nav class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
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
import { LogOut, ReceiptText, Wallet } from 'lucide-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores';
import RemoteSupportWidget from '../components/RemoteSupportWidget.vue';
import { API_BASE_URL as API_BASE, buildApiUrl } from '../config/api.js';

const UPLOADS_BASE = (process.env.VUE_APP_UPLOADS_BASE_URL || API_BASE.replace(/\/api\/?$/, '')).replace(/\/$/, '');

export default {
  name: 'CajeroLayout',
  components: {
    LogOut,
    ReceiptText,
    Wallet,
    RemoteSupportWidget
  },
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    const currentUser = computed(() => authStore.user);
    const personalProfile = ref({
      nombres: authStore.user?.nombres || authStore.user?.nombre || '',
      apellidos: authStore.user?.apellidos || '',
      rol: authStore.user?.rol || '',
      url_foto: authStore.user?.url_foto || null
    });
    const userPhoto = ref(personalProfile.value.url_foto);

    const getFallbackAvatar = (name = 'Usuario') => {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ffe4e6&color=9f1239`;
    };

    const getUserPhotoUrl = (filename, name = 'Usuario') => {
      if (!filename) return getFallbackAvatar(name);
      if (/^https?:\/\//i.test(filename)) return filename;
      if (filename.startsWith('/uploads/')) return `${UPLOADS_BASE}${filename}`;
      return `${UPLOADS_BASE}/uploads/personal/${filename}`;
    };

    const displayName = computed(() => {
      const fullName = [personalProfile.value.nombres, personalProfile.value.apellidos].filter(Boolean).join(' ').trim();
      return fullName || currentUser.value?.nombre || currentUser.value?.username || 'Usuario';
    });

    const displayRole = computed(() => personalProfile.value.rol || currentUser.value?.rol || 'Sin rol');

    const avatarSrc = computed(() => getUserPhotoUrl(userPhoto.value, displayName.value));

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
        if (result?.success && result?.data) {
          personalProfile.value = {
            nombres: result.data.nombres || currentUser.value?.nombres || currentUser.value?.nombre || '',
            apellidos: result.data.apellidos || currentUser.value?.apellidos || '',
            rol: result.data.rol || currentUser.value?.rol || '',
            url_foto: result.data.url_foto || currentUser.value?.url_foto || null
          };
          userPhoto.value = personalProfile.value.url_foto;
        }
      } catch (error) {
        console.warn('No se pudo cargar la foto del cajero:', error);
      }
    };

    const onAvatarError = (event) => {
      event.target.src = getFallbackAvatar(displayName.value);
    };

    const logout = async () => {
      await authStore.logout();
      router.push('/login');
    };

    onMounted(() => {
      fetchMyPhoto();
    });

    return { logout, currentUser, avatarSrc, onAvatarError, displayName, displayRole };
  }
};
</script>
