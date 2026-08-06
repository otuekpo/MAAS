<template>
  <div class="min-h-screen flex items-center py-12 sm:py-16 lg:py-20">
    <div class="max-w-[520px] mx-auto px-5 sm:px-6 w-full">
      <!-- Back to login -->
      <NuxtLink
        to="/login"
        class="inline-flex items-center gap-1.5 font-sans text-[14px] text-cloud-medium hover:text-slate-dark transition-colors duration-150 mb-8"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
        Back to sign in
      </NuxtLink>

      <h1 class="font-sans text-[22px] sm:text-[24px] font-semibold text-slate-dark leading-[1.2] tracking-[-0.02em] mb-2">
        Forgot your password?
      </h1>
      <p class="font-serif text-[16px] sm:text-[17px] text-cloud-medium leading-[1.5] mb-8">
        Enter your email and we'll send you a code to reset your password.
      </p>

      <form @submit.prevent="handleSubmit" novalidate>
        <div class="flex flex-col gap-4 mb-6">
          <!-- Email -->
          <div class="flex flex-col gap-2">
            <label for="forgot-email" class="font-sans text-[14px] sm:text-[15px] text-slate-dark">Email <span class="text-clay">*</span></label>
            <input
              id="forgot-email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="ada@company.com"
              :class="[
                'bg-ivory-light border rounded-inputs text-slate-dark placeholder:text-cloud-medium px-3.5 py-3 text-[16px] font-serif outline-none transition-colors duration-150 w-full',
                fieldErrors.email ? 'border-clay-deep' : 'border-stone focus:border-clay'
              ]"
            />
            <p v-if="fieldErrors.email" class="font-serif text-[13px] sm:text-[14px] text-clay-deep leading-[1.4]">{{ fieldErrors.email }}</p>
          </div>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full font-sans font-medium text-[15px] text-white bg-clay hover:bg-clay-deep rounded-buttons px-5 py-3.5 transition-colors duration-150 mb-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg v-if="loading" class="animate-spin size-4" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <span v-if="loading">Sending code...</span>
          <span v-else>Send reset code</span>
        </button>

        <p class="font-serif text-[15px] sm:text-[16px] text-cloud-medium text-center">
          Remember your password?
          <NuxtLink to="/login" class="text-clay hover:text-clay-deep underline transition-colors duration-150">Sign in</NuxtLink>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const router = useRouter()
const { forgotPassword, saveEmail } = useAuth()
const toast = useToast()

const email = ref('')
const loading = ref(false)

const fieldErrors = ref<Record<string, string>>({})

function validate(): boolean {
  const errors: Record<string, string> = {}

  if (!email.value.trim()) {
    errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    errors.email = 'Please enter a valid email address.'
  }

  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function handleSubmit() {
  if (loading.value) return
  fieldErrors.value = {}

  if (!validate()) return

  loading.value = true

  try {
    const res = await forgotPassword(email.value)

    if (res?.successful === true) {
      saveEmail(email.value)
      toast.addToast('Code sent', 'Check your email for the reset code.', 'success')
      await router.push('/reset-password')
    } else {
      toast.addToast('Failed to send code', res?.message || 'Please try again.', 'error')
    }
  } catch {
    toast.addToast('Connection error', 'Unable to connect. Please check your network.', 'error')
  } finally {
    loading.value = false
  }
}
</script>
