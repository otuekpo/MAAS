<template>
  <div class="min-h-screen bg-ivory-medium">
    <!-- Top navbar -->
    <header class="sticky top-0 z-30 border-b border-stone bg-ivory-light">
      <div class="flex items-center justify-between px-4 sm:px-6 py-3">
        <!-- Mobile hamburger -->
        <button
          class="sm:hidden flex items-center justify-center w-8 h-8 text-slate-dark"
          @click="sidebarOpen = !sidebarOpen"
          aria-label="Toggle menu"
        >
          <svg v-if="!sidebarOpen" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        <!-- Logo -->
        <NuxtLink to="/" class="font-sans text-[13px] font-semibold tracking-[0.05em] uppercase text-slate-dark">
          MaaS
        </NuxtLink>

        <!-- Right side -->
        <div class="flex items-center gap-4">
          <span class="hidden sm:inline font-sans text-[12px] text-cloud-medium">Search</span>
          <span class="hidden sm:inline font-sans text-[12px] text-cloud-medium">Notifications</span>
          <div class="w-7 h-7 rounded-full bg-oat-warm flex items-center justify-center">
            <span class="font-sans text-[11px] font-semibold text-slate-dark">{{ userInitial }}</span>
          </div>
        </div>
      </div>
    </header>

    <div class="flex">
      <!-- Sidebar -->
      <aside
        :class="[
          'fixed sm:sticky top-[49px] sm:top-[49px] left-0 z-20 h-[calc(100vh-49px)] w-[200px] border-r border-stone bg-ivory-light p-4 flex flex-col gap-2 transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
        ]"
      >
        <NuxtLink
          to="/"
          class="rounded-buttons px-3 py-2 font-sans text-[12px] font-medium text-slate-dark bg-oat-warm"
          @click="sidebarOpen = false"
        >
          Trips
        </NuxtLink>
        <NuxtLink
          v-if="isStaff"
          to="/admin"
          class="rounded-buttons px-3 py-2 font-sans text-[12px] text-cloud-medium hover:text-slate-dark transition-colors duration-150"
          @click="sidebarOpen = false"
        >
          Admin
        </NuxtLink>
        <NuxtLink
          v-if="isStaff"
          to="/admin/activity"
          class="rounded-buttons px-3 py-2 font-sans text-[12px] text-cloud-medium hover:text-slate-dark transition-colors duration-150"
          @click="sidebarOpen = false"
        >
          Activity Log
        </NuxtLink>
        <NuxtLink
          to="/profile"
          class="rounded-buttons px-3 py-2 font-sans text-[12px] text-cloud-medium hover:text-slate-dark transition-colors duration-150"
          @click="sidebarOpen = false"
        >
          Profile
        </NuxtLink>

        <div class="mt-auto border-t border-stone pt-4">
          <button
            class="w-full text-left rounded-buttons px-3 py-2 font-sans text-[12px] text-cloud-medium hover:text-slate-dark transition-colors duration-150"
            @click="handleLogout"
          >
            Log out
          </button>
        </div>
      </aside>

      <!-- Mobile overlay -->
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 top-[49px] z-10 bg-slate-dark/20 sm:hidden"
        @click="sidebarOpen = false"
      />

      <!-- Main content -->
      <main class="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const { retrieveToken, getMyDetails } = useAuth()

const sidebarOpen = ref(false)
const userName = ref('')
const userRole = ref<number | undefined>(undefined)

const isStaff = computed(() => userRole.value === 1 || userRole.value === 2)

const userInitial = computed(() => {
  if (userName.value) return userName.value[0].toUpperCase()
  return 'U'
})

onMounted(async () => {
  const { accessToken } = retrieveToken()
  if (accessToken) {
    try {
      const res = await getMyDetails(accessToken)
      if (res?.successful) {
        userName.value = res.data.firstName || res.data.email || ''
        userRole.value = res.data.role
      }
    } catch {}
  }
})

function handleLogout() {
  const accessCookie = useCookie('accessToken')
  accessCookie.value = null
  router.push('/login')
}
</script>
