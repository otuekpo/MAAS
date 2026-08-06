<template>
  <div>
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border border-stone rounded-cards px-6 py-5">
      <h1 class="font-sans text-[24px] font-semibold text-slate-dark leading-[1.3] tracking-[-0.05em]">
        Admin overview
      </h1>
      <span class="font-sans text-[12px] text-cloud-dark">All trips across users</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <svg class="animate-spin size-6 text-cloud-medium" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <!-- Empty state -->
    <div v-else-if="trips.length === 0" class="flex flex-col items-center justify-center py-20">
      <p class="font-serif text-[20px] text-cloud-medium">No trips have been planned yet</p>
    </div>

    <!-- Trip list -->
    <div v-else class="flex flex-col gap-3">
      <div
        v-for="trip in trips"
        :key="trip._id"
        class="bg-ivory-light border border-stone rounded-cards p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
      >
        <div class="flex flex-col gap-1.5 min-w-0">
          <div class="font-sans text-[14px] font-semibold text-slate-dark leading-[1.25]">
            {{ trip.route }}
          </div>
          <div class="font-serif text-[14px] text-slate-dark">
            {{ trip.transport }}<span v-if="trip.date"> · {{ formatDate(trip.date) }}</span>
          </div>
          <div v-if="trip.eta" class="font-sans text-[11px] font-semibold uppercase tracking-[0.05em] text-cloud-dark">
            ETA {{ trip.eta }}
          </div>
          <div class="font-sans text-[12px] text-cloud-dark mt-1">
            <span v-if="trip.user">{{ displayName(trip.user) }}</span>
            <span v-else>Unknown user</span>
          </div>
        </div>
        <div class="font-serif text-[16px] text-slate-dark shrink-0">
          ${{ trip.cost?.toFixed(2) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminTrip } from '~/composables/useAdmin'

definePageMeta({
  layout: 'dashboard',
  middleware: 'admin',
})

const toast = useToast()
const { getAllTrips } = useAdmin()

const trips = ref<AdminTrip[]>([])
const loading = ref(true)

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function displayName(user: { email: string; firstName?: string; lastName?: string }): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return name ? `${name} · ${user.email}` : user.email
}

onMounted(async () => {
  try {
    const res = await getAllTrips()
    if (res?.successful) {
      trips.value = res.data || []
    } else {
      toast.addToast('Failed to load trips', res?.message || 'Please try again.', 'error')
    }
  } catch {
    toast.addToast('Connection error', 'Unable to connect. Please check your network.', 'error')
  } finally {
    loading.value = false
  }
})
</script>
