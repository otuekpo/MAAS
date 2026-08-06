<template>
  <div>
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border border-stone rounded-cards px-6 py-5">
      <h1 class="font-sans text-[24px] font-semibold text-slate-dark leading-[1.3] tracking-[-0.05em]">
        Trips
      </h1>
      <button
        class="self-start font-sans text-[13px] font-medium text-slate-dark bg-ivory-light px-6 py-3 hover:bg-oat-warm transition-colors duration-150"
        style="border-radius: 0 0 8px 8px"
        @click="openCreateForm"
      >
        New trip
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <svg class="animate-spin size-6 text-cloud-medium" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <!-- Empty state -->
    <div v-else-if="trips.length === 0 && !showForm" class="flex flex-col items-center justify-center py-20">
      <p class="font-serif text-[20px] text-cloud-medium mb-6">
        No trips yet — plan your first one
      </p>
      <button
        class="font-sans text-[13px] font-medium text-slate-dark bg-ivory-light px-6 py-3 hover:bg-oat-warm transition-colors duration-150"
        style="border-radius: 0 0 8px 8px"
        @click="openCreateForm"
      >
        New trip
      </button>
    </div>

    <!-- Trip cards grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
      <div
        v-for="trip in trips"
        :key="trip._id"
        class="bg-ivory-light border border-stone rounded-cards p-6 flex flex-col gap-2"
      >
        <div class="font-sans text-[14px] font-semibold text-slate-dark leading-[1.25]">
          {{ trip.route }}
        </div>
        <div class="font-serif text-[16px] leading-[1.4] text-slate-dark">
          {{ trip.transport }}<span v-if="trip.date"> · {{ formatDate(trip.date) }}</span>
        </div>
        <div class="font-sans text-[11px] font-semibold uppercase tracking-[0.05em] text-cloud-dark">
          {{ tripStatus(trip.date) }}
        </div>
        <div class="font-serif text-[16px] text-slate-dark">
          ${{ trip.cost?.toFixed(2) }}
        </div>
        <div class="flex gap-3 mt-2">
          <button
            class="font-sans text-[12px] text-slate-dark underline hover:text-clay transition-colors duration-150"
            @click="openEditForm(trip)"
          >
            Edit
          </button>
          <button
            class="font-sans text-[12px] text-slate-dark underline hover:text-clay-deep transition-colors duration-150"
            @click="startDelete(trip)"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Delete confirmation bar -->
    <div
      v-if="deletingTrip"
      class="bg-slate-dark rounded-cards p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4"
    >
      <span class="font-serif text-[16px] text-ivory-light">
        Delete <span class="font-semibold">{{ deletingTrip.route }}</span>?
      </span>
      <div class="flex gap-2">
        <button
          class="font-sans text-[12px] text-ivory-light border border-cloud-dark rounded-buttons-outlined px-4 py-2 hover:bg-slate-medium transition-colors duration-150"
          @click="deletingTrip = null"
        >
          Cancel
        </button>
        <button
          class="font-sans text-[12px] font-medium text-white bg-clay hover:bg-clay-deep px-5 py-2 transition-colors duration-150 disabled:opacity-50"
          style="border-radius: 0 0 8px 8px"
          :disabled="deleteLoading"
          @click="confirmDelete"
        >
          <span v-if="deleteLoading">Deleting...</span>
          <span v-else>Confirm</span>
        </button>
      </div>
    </div>

    <!-- Create / Edit form panel -->
    <div
      v-if="showForm"
      class="border border-dashed border-stone rounded-cards p-6 sm:p-8 mb-4 bg-ivory-light"
    >
      <div class="font-sans text-[12px] text-cloud-medium mb-5">
        {{ editingTrip ? 'Edit trip' : 'New trip' }}
      </div>

      <form @submit.prevent="handleSubmit" novalidate>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <!-- From -->
          <div class="flex flex-col gap-1.5">
            <label class="font-sans text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-dark">From</label>
            <select
              v-model="form.from"
              required
              :class="[
                'bg-ivory-light border rounded-inputs text-slate-dark px-3 py-2.5 font-serif text-[16px] outline-none transition-colors duration-150 w-full',
                fieldErrors.from ? 'border-clay-deep' : 'border-stone focus:border-clay'
              ]"
            >
              <option value="" disabled>Select origin</option>
              <option v-for="loc in locations" :key="loc" :value="loc">{{ loc }}</option>
            </select>
            <p v-if="fieldErrors.from" class="font-serif text-[13px] text-clay-deep">{{ fieldErrors.from }}</p>
          </div>

          <!-- To -->
          <div class="flex flex-col gap-1.5">
            <label class="font-sans text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-dark">To</label>
            <select
              v-model="form.to"
              required
              :class="[
                'bg-ivory-light border rounded-inputs text-slate-dark px-3 py-2.5 font-serif text-[16px] outline-none transition-colors duration-150 w-full',
                fieldErrors.to ? 'border-clay-deep' : 'border-stone focus:border-clay'
              ]"
            >
              <option value="" disabled>Select destination</option>
              <option v-for="loc in locations" :key="loc" :value="loc">{{ loc }}</option>
            </select>
            <p v-if="fieldErrors.to" class="font-serif text-[13px] text-clay-deep">{{ fieldErrors.to }}</p>
          </div>

          <!-- Transport -->
          <div class="flex flex-col gap-1.5">
            <label class="font-sans text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-dark">Transport</label>
            <select
              v-model="form.transport"
              required
              :class="[
                'bg-ivory-light border rounded-inputs text-slate-dark px-3 py-2.5 font-serif text-[16px] outline-none transition-colors duration-150 w-full',
                fieldErrors.transport ? 'border-clay-deep' : 'border-stone focus:border-clay'
              ]"
            >
              <option value="" disabled>Select transport</option>
              <option v-for="t in transportTypes" :key="t.name" :value="t.name">{{ t.name }}</option>
            </select>
            <p v-if="fieldErrors.transport" class="font-serif text-[13px] text-clay-deep">{{ fieldErrors.transport }}</p>
          </div>

          <!-- Date -->
          <div class="flex flex-col gap-1.5">
            <label class="font-sans text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-dark">Date</label>
            <input
              v-model="form.date"
              type="date"
              required
              :class="[
                'bg-ivory-light border rounded-inputs text-slate-dark px-3 py-2.5 font-serif text-[16px] outline-none transition-colors duration-150 w-full',
                fieldErrors.date ? 'border-clay-deep' : 'border-stone focus:border-clay'
              ]"
            />
            <p v-if="fieldErrors.date" class="font-serif text-[13px] text-clay-deep">{{ fieldErrors.date }}</p>
          </div>
        </div>

        <!-- Computed trip info -->
        <div v-if="computedDistance > 0" class="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-3 font-serif text-[14px] text-cloud-dark">
          <span>{{ computedDistance.toLocaleString() }} miles</span>
          <span>·</span>
          <span>{{ computedHours }}h travel time</span>
          <span>·</span>
          <span class="font-semibold text-slate-dark">${{ computedCost.toFixed(2) }}</span>
        </div>

        <!-- Notes -->
        <div class="flex flex-col gap-1.5 mb-5">
          <label class="font-sans text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-dark">Notes <span class="text-cloud-medium">(optional)</span></label>
          <textarea
            v-model="form.description"
            rows="3"
            placeholder="Any additional notes..."
            class="bg-ivory-light border border-stone rounded-inputs text-slate-dark placeholder:text-cloud-medium px-3 py-2.5 font-serif text-[16px] outline-none transition-colors duration-150 w-full focus:border-clay resize-none"
          />
        </div>

        <div class="flex items-center gap-3">
          <button
            type="submit"
            :disabled="formLoading"
            class="font-sans text-[13px] font-medium text-white bg-clay hover:bg-clay-deep px-6 py-3 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style="border-radius: 0 0 8px 8px"
          >
            <svg v-if="formLoading" class="animate-spin size-4" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{{ editingTrip ? 'Update' : 'Save' }}</span>
          </button>
          <button
            type="button"
            class="font-sans text-[12px] text-slate-dark underline hover:text-clay transition-colors duration-150"
            @click="closeForm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Trip, CreateTripPayload, UpdateTripPayload } from '~/composables/useTrips'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const toast = useToast()
const { getTrips, createTrip, updateTrip, deleteTrip } = useTrips()

const trips = ref<Trip[]>([])
const loading = ref(true)
const showForm = ref(false)
const editingTrip = ref<Trip | null>(null)
const deletingTrip = ref<Trip | null>(null)
const formLoading = ref(false)
const deleteLoading = ref(false)

const locations = [
  'New York',
  'Los Angeles',
  'Chicago',
  'Miami',
  'San Francisco',
  'Seattle',
  'Boston',
  'Denver',
  'Atlanta',
  'Dallas',
  'Houston',
  'Phoenix',
  'Las Vegas',
  'Washington DC',
  'Portland',
]

const transportTypes = [
  { name: 'Car', speed: 60, ratePerMile: 0.15 },
  { name: 'Bus', speed: 45, ratePerMile: 0.10 },
  { name: 'Train', speed: 100, ratePerMile: 0.25 },
  { name: 'Plane', speed: 500, ratePerMile: 0.35 },
  { name: 'Ferry', speed: 30, ratePerMile: 0.20 },
]

const distances: Record<string, Record<string, number>> = {
  'New York': { 'Los Angeles': 2450, 'Chicago': 790, 'Miami': 1280, 'San Francisco': 2900, 'Seattle': 2850, 'Boston': 215, 'Denver': 1770, 'Atlanta': 880, 'Dallas': 1550, 'Houston': 1630, 'Phoenix': 2400, 'Las Vegas': 2580, 'Washington DC': 230, 'Portland': 2850 },
  'Los Angeles': { 'New York': 2450, 'Chicago': 2015, 'Miami': 2750, 'San Francisco': 380, 'Seattle': 1135, 'Boston': 2605, 'Denver': 1025, 'Atlanta': 2175, 'Dallas': 1435, 'Houston': 1545, 'Phoenix': 370, 'Las Vegas': 270, 'Washington DC': 2300, 'Portland': 960 },
  'Chicago': { 'New York': 790, 'Los Angeles': 2015, 'Miami': 1380, 'San Francisco': 2130, 'Seattle': 2060, 'Boston': 980, 'Denver': 1000, 'Atlanta': 715, 'Dallas': 920, 'Houston': 1090, 'Phoenix': 1730, 'Las Vegas': 1750, 'Washington DC': 700, 'Portland': 2080 },
  'Miami': { 'New York': 1280, 'Los Angeles': 2750, 'Chicago': 1380, 'San Francisco': 3020, 'Seattle': 3340, 'Boston': 1500, 'Denver': 2070, 'Atlanta': 660, 'Dallas': 1310, 'Houston': 1190, 'Phoenix': 2350, 'Las Vegas': 2550, 'Washington DC': 1060, 'Portland': 3280 },
  'San Francisco': { 'New York': 2900, 'Los Angeles': 380, 'Chicago': 2130, 'Miami': 3020, 'Seattle': 808, 'Boston': 2700, 'Denver': 1235, 'Atlanta': 2440, 'Dallas': 1740, 'Houston': 1900, 'Phoenix': 750, 'Las Vegas': 570, 'Washington DC': 2400, 'Portland': 640 },
  'Seattle': { 'New York': 2850, 'Los Angeles': 1135, 'Chicago': 2060, 'Miami': 3340, 'San Francisco': 808, 'Boston': 2980, 'Denver': 1315, 'Atlanta': 2620, 'Dallas': 2170, 'Houston': 2300, 'Phoenix': 1400, 'Las Vegas': 1120, 'Washington DC': 2350, 'Portland': 175 },
  'Boston': { 'New York': 215, 'Los Angeles': 2605, 'Chicago': 980, 'Miami': 1500, 'San Francisco': 2700, 'Seattle': 2980, 'Denver': 1965, 'Atlanta': 1100, 'Dallas': 1770, 'Houston': 1850, 'Phoenix': 2600, 'Las Vegas': 2750, 'Washington DC': 440, 'Portland': 3020 },
  'Denver': { 'New York': 1770, 'Los Angeles': 1025, 'Chicago': 1000, 'Miami': 2070, 'San Francisco': 1235, 'Seattle': 1315, 'Boston': 1965, 'Atlanta': 1395, 'Dallas': 780, 'Houston': 1030, 'Phoenix': 600, 'Las Vegas': 750, 'Washington DC': 1700, 'Portland': 1280 },
  'Atlanta': { 'New York': 880, 'Los Angeles': 2175, 'Chicago': 715, 'Miami': 660, 'San Francisco': 2440, 'Seattle': 2620, 'Boston': 1100, 'Denver': 1395, 'Dallas': 781, 'Houston': 790, 'Phoenix': 1850, 'Las Vegas': 1970, 'Washington DC': 640, 'Portland': 2600 },
  'Dallas': { 'New York': 1550, 'Los Angeles': 1435, 'Chicago': 920, 'Miami': 1310, 'San Francisco': 1740, 'Seattle': 2170, 'Boston': 1770, 'Denver': 780, 'Atlanta': 781, 'Houston': 240, 'Phoenix': 1065, 'Las Vegas': 1230, 'Washington DC': 1310, 'Portland': 1950 },
  'Houston': { 'New York': 1630, 'Los Angeles': 1545, 'Chicago': 1090, 'Miami': 1190, 'San Francisco': 1900, 'Seattle': 2300, 'Boston': 1850, 'Denver': 1030, 'Atlanta': 790, 'Dallas': 240, 'Phoenix': 1180, 'Las Vegas': 1350, 'Washington DC': 1370, 'Portland': 2080 },
  'Phoenix': { 'New York': 2400, 'Los Angeles': 370, 'Chicago': 1730, 'Miami': 2350, 'San Francisco': 750, 'Seattle': 1400, 'Boston': 2600, 'Denver': 600, 'Atlanta': 1850, 'Dallas': 1065, 'Houston': 1180, 'Las Vegas': 300, 'Washington DC': 2350, 'Portland': 1150 },
  'Las Vegas': { 'New York': 2580, 'Los Angeles': 270, 'Chicago': 1750, 'Miami': 2550, 'San Francisco': 570, 'Seattle': 1120, 'Boston': 2750, 'Denver': 750, 'Atlanta': 1970, 'Dallas': 1230, 'Houston': 1350, 'Phoenix': 300, 'Washington DC': 2450, 'Portland': 1050 },
  'Washington DC': { 'New York': 230, 'Los Angeles': 2300, 'Chicago': 700, 'Miami': 1060, 'San Francisco': 2400, 'Seattle': 2350, 'Boston': 440, 'Denver': 1700, 'Atlanta': 640, 'Dallas': 1310, 'Houston': 1370, 'Phoenix': 2350, 'Las Vegas': 2450, 'Portland': 2380 },
  'Portland': { 'New York': 2850, 'Los Angeles': 960, 'Chicago': 2080, 'Miami': 3280, 'San Francisco': 640, 'Seattle': 175, 'Boston': 3020, 'Denver': 1280, 'Atlanta': 2600, 'Dallas': 1950, 'Houston': 2080, 'Phoenix': 1150, 'Las Vegas': 1050, 'Washington DC': 2380 },
}

interface TripForm {
  from: string
  to: string
  transport: string
  date: string
  description: string
}

const form = ref<TripForm>({
  from: '',
  to: '',
  transport: '',
  date: '',
  description: '',
})

const fieldErrors = ref<Record<string, string>>({})

const computedDistance = computed(() => {
  if (!form.value.from || !form.value.to || form.value.from === form.value.to) return 0
  return distances[form.value.from]?.[form.value.to] ?? 0
})

const activeTransport = computed(() => {
  return transportTypes.find(t => t.name === form.value.transport) ?? null
})

const computedHours = computed(() => {
  if (!activeTransport.value || computedDistance.value === 0) return 0
  return Number((computedDistance.value / activeTransport.value.speed).toFixed(1))
})

const computedCost = computed(() => {
  if (!activeTransport.value || computedDistance.value === 0) return 0
  return computedDistance.value * activeTransport.value.ratePerMile
})

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function tripStatus(dateStr: string): string {
  const tripDate = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const td = new Date(tripDate)
  td.setHours(0, 0, 0, 0)
  if (td > now) return 'Upcoming'
  if (td.getTime() === now.getTime()) return 'Today'
  return 'Completed'
}

function openCreateForm() {
  editingTrip.value = null
  form.value = { from: '', to: '', transport: '', date: '', description: '' }
  fieldErrors.value = {}
  showForm.value = true
}

function openEditForm(trip: Trip) {
  editingTrip.value = trip
  const parts = trip.route.split(' to ')
  form.value = {
    from: parts[0] ?? '',
    to: parts[1] ?? '',
    transport: trip.transport,
    date: trip.date ? trip.date.split('T')[0] : '',
    description: trip.description ?? '',
  }
  fieldErrors.value = {}
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingTrip.value = null
  fieldErrors.value = {}
}

function validate(): boolean {
  const errors: Record<string, string> = {}
  if (!form.value.from) errors.from = 'Origin is required.'
  if (!form.value.to) errors.to = 'Destination is required.'
  if (form.value.from && form.value.to && form.value.from === form.value.to) {
    errors.to = 'Origin and destination must be different.'
  }
  if (!form.value.transport) errors.transport = 'Transport is required.'
  if (!form.value.date) errors.date = 'Date is required.'
  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function handleSubmit() {
  if (formLoading.value) return
  if (!validate()) return

  formLoading.value = true

  try {
    const route = `${form.value.from} to ${form.value.to}`
    const cost = computedCost.value

    if (editingTrip.value) {
      const payload: UpdateTripPayload = {
        route,
        transport: form.value.transport,
        date: form.value.date,
        cost,
        description: form.value.description || undefined,
      }
      const res = await updateTrip(editingTrip.value._id, payload)
      if (res?.successful) {
        toast.addToast('Trip updated', 'Your trip has been updated.', 'success')
        await fetchTrips()
      } else {
        toast.addToast('Update failed', res?.message || 'Please try again.', 'error')
      }
    } else {
      const payload: CreateTripPayload = {
        route,
        transport: form.value.transport,
        date: form.value.date,
        cost,
        description: form.value.description || undefined,
      }
      const res = await createTrip(payload)
      if (res?.successful) {
        toast.addToast('Trip created', 'Your new trip has been saved.', 'success')
        await fetchTrips()
      } else {
        toast.addToast('Create failed', res?.message || 'Please try again.', 'error')
      }
    }
    closeForm()
  } catch {
    toast.addToast('Connection error', 'Unable to connect. Please check your network.', 'error')
  } finally {
    formLoading.value = false
  }
}

function startDelete(trip: Trip) {
  deletingTrip.value = trip
}

async function confirmDelete() {
  if (!deletingTrip.value || deleteLoading.value) return

  deleteLoading.value = true

  try {
    const res = await deleteTrip(deletingTrip.value._id)
    if (res?.successful) {
      toast.addToast('Trip deleted', 'The trip has been removed.', 'success')
      deletingTrip.value = null
      await fetchTrips()
    } else {
      toast.addToast('Delete failed', res?.message || 'Please try again.', 'error')
    }
  } catch {
    toast.addToast('Connection error', 'Unable to connect. Please check your network.', 'error')
  } finally {
    deleteLoading.value = false
  }
}

async function fetchTrips() {
  loading.value = true
  try {
    const res = await getTrips()
    if (res?.successful) {
      trips.value = res.data || []
    }
  } catch {
    toast.addToast('Error', 'Failed to load trips.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchTrips()
})
</script>
