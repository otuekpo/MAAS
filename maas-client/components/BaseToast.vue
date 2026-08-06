<template>
  <ul
    class="fixed inset-x-0 md:inset-x-auto md:right-4 bottom-4 z-[99999] flex flex-col items-center gap-3 md:px-0 px-4"
  >
    <li
      v-for="toast in toasts"
      :key="toast.id"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      tabindex="0"
      class="pointer-events-auto relative md:w-96 w-full max-w-full cursor-default rounded-cards overflow-hidden bg-ivory-light border border-stone p-4 flex gap-3 items-start focus:outline-none"
      @mouseenter="pause(toast.id)"
      @mouseleave="resume(toast.id)"
    >
      <!-- Icon -->
      <div class="mt-0.5 shrink-0">
        <!-- Error -->
        <svg
          v-if="toast.type === 'error'"
          class="size-5 text-clay-deep"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <!-- Success -->
        <svg
          v-else-if="toast.type === 'success'"
          class="size-5 text-clay"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="9 12 11.5 14.5 16 9.5" />
        </svg>
        <!-- Warning -->
        <svg
          v-else-if="toast.type === 'warning'"
          class="size-5 text-clay"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <!-- Info -->
        <svg
          v-else
          class="size-5 text-cloud-dark"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </div>

      <!-- Content -->
      <div class="flex-1 flex flex-col gap-0.5 min-w-0">
        <div class="font-sans text-[15px] font-semibold text-slate-dark leading-[1.2]">
          {{ toast.title }}
        </div>
        <p class="font-serif text-[16px] text-cloud-medium leading-[1.4]">
          {{ toast.message }}
        </p>
      </div>

      <!-- Close -->
      <button
        type="button"
        aria-label="Close notification"
        class="shrink-0 rounded-md p-1 text-cloud-medium hover:text-slate-dark hover:bg-oat-warm transition-colors duration-150 focus:outline-none"
        @click="removeToast(toast.id)"
      >
        <svg
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <!-- Progress Bar -->
      <div class="absolute left-0 right-0 bottom-0 h-1 overflow-hidden rounded-b-cards">
        <div
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="Math.round(toast.progress)"
          class="h-full transition-[width] duration-75 linear"
          :class="{
            'bg-clay-deep': toast.type === 'error',
            'bg-clay': toast.type === 'success' || toast.type === 'warning',
            'bg-cloud-dark': toast.type === 'info',
          }"
          :style="{ width: toast.progress + '%' }"
        />
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
const { toasts, removeToast, pause, resume } = useToast()
</script>
