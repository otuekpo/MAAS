<template>
  <div>
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border border-stone rounded-cards px-6 py-5">
      <div class="flex flex-col gap-1">
        <h1 class="font-sans text-[24px] font-semibold text-slate-dark leading-[1.3] tracking-[-0.05em]">
          Activity Log
        </h1>
        <span class="font-sans text-[12px] text-cloud-dark">
          Track every action taken across the platform — see who did what, and when.
        </span>
      </div>
      <button
        class="inline-flex items-center gap-2 rounded-buttons px-4 py-2 font-sans text-[12px] font-medium text-ivory-light bg-slate-dark hover:bg-slate-medium transition-colors duration-150 disabled:opacity-50"
        :disabled="exporting"
        @click="handleExport"
      >
        <svg v-if="exporting" class="animate-spin size-3.5" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Export CSV
      </button>
    </div>

    <!-- Filters -->
    <div class="mb-4 border border-stone rounded-cards bg-ivory-light px-6 py-5 flex flex-col gap-4">
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-cloud-dark" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" stroke-linecap="round" />
        </svg>
        <input
          v-model="filters.search"
          type="text"
          placeholder="Search logs..."
          class="w-full rounded-inputs border border-stone bg-ivory-light pl-9 pr-3 py-2 font-sans text-[13px] text-slate-dark placeholder:text-cloud-dark focus:outline-none focus:ring-1 focus:ring-slate-medium"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <label class="flex flex-col gap-1">
          <span class="font-sans text-[11px] font-semibold uppercase tracking-[0.05em] text-cloud-dark">User</span>
          <input
            v-model="filters.user"
            type="text"
            placeholder="jane.doe@company.com"
            class="rounded-inputs border border-stone bg-ivory-light px-3 py-2 font-sans text-[13px] text-slate-dark placeholder:text-cloud-dark focus:outline-none focus:ring-1 focus:ring-slate-medium"
          />
        </label>

        <label class="flex flex-col gap-1">
          <span class="font-sans text-[11px] font-semibold uppercase tracking-[0.05em] text-cloud-dark">Action Type</span>
          <select
            v-model="filters.actionType"
            class="rounded-inputs border border-stone bg-ivory-light px-3 py-2 font-sans text-[13px] text-slate-dark focus:outline-none focus:ring-1 focus:ring-slate-medium"
          >
            <option value="">All</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="blocked">Blocked</option>
          </select>
        </label>

        <label class="flex flex-col gap-1">
          <span class="font-sans text-[11px] font-semibold uppercase tracking-[0.05em] text-cloud-dark">Module</span>
          <select
            v-model="filters.module"
            class="rounded-inputs border border-stone bg-ivory-light px-3 py-2 font-sans text-[13px] text-slate-dark focus:outline-none focus:ring-1 focus:ring-slate-medium"
          >
            <option value="">All</option>
            <option value="Auth">Auth</option>
            <option value="Trips">Trips</option>
            <option value="Admin">Admin</option>
            <option value="Profile">Profile</option>
            <option value="Other">Other</option>
          </select>
        </label>

        <label class="flex flex-col gap-1">
          <span class="font-sans text-[11px] font-semibold uppercase tracking-[0.05em] text-cloud-dark">From</span>
          <input
            v-model="filters.from"
            type="date"
            class="rounded-inputs border border-stone bg-ivory-light px-3 py-2 font-sans text-[13px] text-slate-dark focus:outline-none focus:ring-1 focus:ring-slate-medium"
          />
        </label>

        <label class="flex flex-col gap-1">
          <span class="font-sans text-[11px] font-semibold uppercase tracking-[0.05em] text-cloud-dark">To</span>
          <input
            v-model="filters.to"
            type="date"
            class="rounded-inputs border border-stone bg-ivory-light px-3 py-2 font-sans text-[13px] text-slate-dark focus:outline-none focus:ring-1 focus:ring-slate-medium"
          />
        </label>
      </div>
    </div>

    <!-- Log table -->
    <div class="border border-stone rounded-cards bg-ivory-light overflow-hidden">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <svg class="animate-spin size-6 text-cloud-medium" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>

      <!-- Empty state -->
      <div v-else-if="logs.length === 0" class="flex flex-col items-center justify-center py-20 gap-2">
        <p class="font-serif text-[20px] text-cloud-medium">No results found.</p>
        <p class="font-sans text-[12px] text-cloud-dark">Try adjusting your filters or search terms.</p>
      </div>

      <!-- Table -->
      <template v-else>
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-stone">
              <th class="px-6 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.05em] text-cloud-dark">Timestamp</th>
              <th class="px-6 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.05em] text-cloud-dark">User</th>
              <th class="px-6 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.05em] text-cloud-dark">Action</th>
              <th class="px-6 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.05em] text-cloud-dark">Details</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in logs"
              :key="log._id"
              class="border-b border-stone last:border-b-0 hover:bg-ivory-medium/60 cursor-pointer transition-colors duration-150"
              @click="openDetail(log)"
            >
              <td class="px-6 py-4 font-sans text-[12px] text-slate-dark whitespace-nowrap">
                {{ formatTimestamp(log.createdAt) }}
              </td>
              <td class="px-6 py-4 font-sans text-[12px] text-slate-dark">
                {{ log.email ?? log.user_id ?? '—' }}
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <span class="inline-block w-2 h-2 rounded-full" :class="statusDotClass(log.status)" />
                  <span class="font-sans text-[12px] font-medium text-slate-dark">{{ log.action }}</span>
                </div>
              </td>
              <td class="px-6 py-4 font-serif text-[13px] text-slate-dark">
                {{ log.message ?? '—' }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination footer -->
        <div class="flex items-center justify-between px-6 py-4 border-t border-stone bg-ivory-medium/40">
          <span class="font-sans text-[12px] text-cloud-dark">
            Showing {{ paginationStart }}–{{ paginationEnd }} of {{ total }} entries
          </span>
          <div class="flex items-center gap-2">
            <button
              class="rounded-buttons border border-stone px-3 py-1.5 font-sans text-[12px] text-slate-dark hover:bg-ivory-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="page <= 1"
              @click="changePage(page - 1)"
            >
              Prev
            </button>
            <span class="font-sans text-[12px] text-cloud-dark">Page {{ page }} of {{ totalPages }}</span>
            <button
              class="rounded-buttons border border-stone px-3 py-1.5 font-sans text-[12px] text-slate-dark hover:bg-ivory-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="page >= totalPages"
              @click="changePage(page + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Retention note -->
    <p class="mt-4 font-sans text-[11px] text-cloud-dark">
      Logs are retained for 90 days and cannot be edited or deleted.
    </p>

    <!-- Detail modal -->
    <div
      v-if="selected"
      class="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-dark/40"
      @click.self="selected = null"
    >
      <div class="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-cards bg-ivory-light border border-stone p-6 flex flex-col gap-4">
        <div class="flex items-start justify-between gap-4">
          <div class="flex flex-col gap-1">
            <h2 class="font-sans text-[18px] font-semibold text-slate-dark tracking-[-0.03em]">
              {{ selected.action }}
            </h2>
            <span class="font-sans text-[12px] text-cloud-dark">
              {{ formatTimestamp(selected.createdAt) }} · {{ selected.email ?? selected.user_id ?? 'Unknown user' }}
            </span>
          </div>
          <button class="text-cloud-dark hover:text-slate-dark transition-colors duration-150" @click="selected = null" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" /></svg>
          </button>
        </div>

        <dl class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-0.5">
            <dt class="font-sans text-[10px] font-semibold uppercase tracking-[0.05em] text-cloud-dark">Status</dt>
            <dd class="font-sans text-[13px] text-slate-dark capitalize">{{ selected.status }}</dd>
          </div>
          <div class="flex flex-col gap-0.5">
            <dt class="font-sans text-[10px] font-semibold uppercase tracking-[0.05em] text-cloud-dark">Module</dt>
            <dd class="font-sans text-[13px] text-slate-dark">{{ selected.module ?? '—' }}</dd>
          </div>
          <div class="flex flex-col gap-0.5">
            <dt class="font-sans text-[10px] font-semibold uppercase tracking-[0.05em] text-cloud-dark">Status code</dt>
            <dd class="font-sans text-[13px] text-slate-dark">{{ selected.status_code ?? '—' }}</dd>
          </div>
          <div class="flex flex-col gap-0.5">
            <dt class="font-sans text-[10px] font-semibold uppercase tracking-[0.05em] text-cloud-dark">Duration</dt>
            <dd class="font-sans text-[13px] text-slate-dark">{{ selected.duration_ms ?? '—' }} ms</dd>
          </div>
          <div class="flex flex-col gap-0.5">
            <dt class="font-sans text-[10px] font-semibold uppercase tracking-[0.05em] text-cloud-dark">IP address</dt>
            <dd class="font-sans text-[13px] text-slate-dark">{{ selected.ip_address ?? '—' }}</dd>
          </div>
          <div class="flex flex-col gap-0.5">
            <dt class="font-sans text-[10px] font-semibold uppercase tracking-[0.05em] text-cloud-dark">User agent</dt>
            <dd class="font-sans text-[13px] text-slate-dark truncate">{{ selected.user_agent ?? '—' }}</dd>
          </div>
          <div class="flex flex-col gap-0.5 col-span-2">
            <dt class="font-sans text-[10px] font-semibold uppercase tracking-[0.05em] text-cloud-dark">Message</dt>
            <dd class="font-sans text-[13px] text-slate-dark">{{ selected.message ?? '—' }}</dd>
          </div>
          <div class="flex flex-col gap-0.5 col-span-2">
            <dt class="font-sans text-[10px] font-semibold uppercase tracking-[0.05em] text-cloud-dark">Path</dt>
            <dd class="font-mono text-[12px] text-slate-dark">{{ selected.method }} {{ selected.path ?? '—' }}</dd>
          </div>
          <div v-if="selected.data !== undefined && selected.data !== null" class="flex flex-col gap-1 col-span-2">
            <dt class="font-sans text-[10px] font-semibold uppercase tracking-[0.05em] text-cloud-dark">Data</dt>
            <dd class="rounded-inputs bg-ivory-medium border border-stone p-3 overflow-x-auto">
              <pre class="font-mono text-[11px] text-slate-dark whitespace-pre-wrap break-words">{{ prettyData(selected.data) }}</pre>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminLog, AdminLogFilters } from '~/composables/useAdmin'

definePageMeta({
  layout: 'dashboard',
  middleware: 'admin',
})

const toast = useToast()
const { getLogs, getLogDetail, exportLogs } = useAdmin()

const filters = reactive<AdminLogFilters>({
  search: '',
  user: '',
  actionType: '',
  module: 'Auth',
  from: '',
  to: '',
})

const logs = ref<AdminLog[]>([])
const total = ref(0)
const totalPages = ref(0)
const page = ref(1)
const limit = 20
const loading = ref(true)
const exporting = ref(false)
const selected = ref<AdminLog | null>(null)

const paginationStart = computed(() => (total.value === 0 ? 0 : (page.value - 1) * limit + 1))
const paginationEnd = computed(() => Math.min(page.value * limit, total.value))

const statusDotClass = (status: string) => {
  if (status === 'success') return 'bg-green-600'
  if (status === 'blocked') return 'bg-clay'
  return 'bg-red-500'
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function loadLogs() {
  loading.value = true
  try {
    const res = await getLogs({
      ...filters,
      page: page.value,
      limit,
    })
    if (res?.successful) {
      logs.value = res.data?.data || []
      total.value = res.data?.total || 0
      totalPages.value = res.data?.totalPages || 0
    } else {
      toast.addToast('Failed to load logs', res?.message || 'Please try again.', 'error')
    }
  } catch {
    toast.addToast('Connection error', 'Unable to connect. Please check your network.', 'error')
  } finally {
    loading.value = false
  }
}

function changePage(next: number) {
  if (next < 1 || (totalPages.value > 0 && next > totalPages.value)) return
  page.value = next
  loadLogs()
}

async function openDetail(log: AdminLog) {
  try {
    const res = await getLogDetail(log._id)
    if (res?.successful) {
      selected.value = res.data
    } else {
      toast.addToast('Failed to load log details', res?.message || 'Please try again.', 'error')
    }
  } catch {
    toast.addToast('Connection error', 'Unable to connect. Please check your network.', 'error')
  }
}

async function handleExport() {
  exporting.value = true
  try {
    const response = await exportLogs({ ...filters })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      toast.addToast('Export failed', body?.message || 'Please try again.', 'error')
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch {
    toast.addToast('Connection error', 'Unable to connect. Please check your network.', 'error')
  } finally {
    exporting.value = false
  }
}

function formatTimestamp(value?: string): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function prettyData(data: unknown): string {
  if (typeof data === 'string') return data
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

watch(
  () => ({ ...filters }),
  () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      page.value = 1
      loadLogs()
    }, 400)
  },
)

onMounted(() => {
  loadLogs()
})

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>
