<template>
  <div class="min-h-screen flex items-center py-12 sm:py-16 lg:py-20">
    <div class="max-w-[520px] mx-auto px-5 sm:px-6 w-full">
      <!-- Back to login -->
      <NuxtLink
        to="/forgot-password"
        class="inline-flex items-center gap-1.5 font-sans text-[14px] text-cloud-medium hover:text-slate-dark transition-colors duration-150 mb-8"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
        Back
      </NuxtLink>

      <h1 class="font-sans text-[22px] sm:text-[24px] font-semibold text-slate-dark leading-[1.2] tracking-[-0.02em] mb-2">
        Reset your password
      </h1>
      <p class="font-serif text-[16px] sm:text-[17px] text-cloud-medium leading-[1.5] mb-8">
        Enter the 6-digit code sent to
        <span class="font-semibold text-slate-dark">{{ displayEmail }}</span>
        and choose a new password.
      </p>

      <form @submit.prevent="handleSubmit" novalidate>
        <div class="flex flex-col gap-5 mb-6">
          <!-- OTP Code -->
          <div class="flex flex-col gap-2">
            <label class="font-sans text-[14px] sm:text-[15px] text-slate-dark">Verification code <span class="text-clay">*</span></label>
            <div class="flex items-center justify-between gap-2">
              <input
                v-for="(_, i) in 6"
                :key="i"
                :ref="(el) => { if (el) otpRefs[i] = el as HTMLInputElement }"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="1"
                :value="otp[i]"
                @input="handleOtpInput(i, $event)"
                @keydown="handleOtpKeydown(i, $event)"
                @paste="handleOtpPaste"
                :class="[
                  'w-full max-w-[48px] h-12 bg-ivory-light border rounded-inputs text-slate-dark text-center text-[18px] font-sans font-semibold outline-none transition-colors duration-150',
                  fieldErrors.otp ? 'border-clay-deep' : 'border-stone focus:border-clay'
                ]"
              />
            </div>
            <p v-if="fieldErrors.otp" class="font-serif text-[13px] sm:text-[14px] text-clay-deep leading-[1.4]">{{ fieldErrors.otp }}</p>
          </div>

          <!-- New Password -->
          <div class="flex flex-col gap-2">
            <label for="reset-password" class="font-sans text-[14px] sm:text-[15px] text-slate-dark">New password <span class="text-clay">*</span></label>
            <div class="relative">
              <input
                id="reset-password"
                v-model="newPassword"
                :type="newPasswordVisible ? 'text' : 'password'"
                required
                autocomplete="new-password"
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                :class="[
                  'bg-ivory-light border rounded-inputs text-slate-dark placeholder:text-cloud-medium px-3.5 py-3 pr-10 text-[16px] font-serif outline-none transition-colors duration-150 w-full',
                  fieldErrors.newPassword ? 'border-clay-deep' : 'border-stone focus:border-clay'
                ]"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-cloud-medium hover:text-slate-dark transition-colors duration-150"
                :aria-label="newPasswordVisible ? 'Hide password' : 'Show password'"
                @click="newPasswordVisible = !newPasswordVisible"
              >
                <svg v-if="!newPasswordVisible" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="M17 3 2 20"/><path d="m21 3-5 5"/></svg>
              </button>
            </div>
            <p v-if="fieldErrors.newPassword" class="font-serif text-[13px] sm:text-[14px] text-clay-deep leading-[1.4]">{{ fieldErrors.newPassword }}</p>
          </div>

          <!-- Confirm Password -->
          <div class="flex flex-col gap-2">
            <label for="reset-confirm" class="font-sans text-[14px] sm:text-[15px] text-slate-dark">Confirm new password <span class="text-clay">*</span></label>
            <div class="relative">
              <input
                id="reset-confirm"
                v-model="confirmPassword"
                :type="confirmVisible ? 'text' : 'password'"
                required
                autocomplete="new-password"
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                :class="[
                  'bg-ivory-light border rounded-inputs text-slate-dark placeholder:text-cloud-medium px-3.5 py-3 pr-10 text-[16px] font-serif outline-none transition-colors duration-150 w-full',
                  fieldErrors.confirmPassword ? 'border-clay-deep' : 'border-stone focus:border-clay'
                ]"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-cloud-medium hover:text-slate-dark transition-colors duration-150"
                :aria-label="confirmVisible ? 'Hide password' : 'Show password'"
                @click="confirmVisible = !confirmVisible"
              >
                <svg v-if="!confirmVisible" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="M17 3 2 20"/><path d="m21 3-5 5"/></svg>
              </button>
            </div>
            <p v-if="fieldErrors.confirmPassword" class="font-serif text-[13px] sm:text-[14px] text-clay-deep leading-[1.4]">{{ fieldErrors.confirmPassword }}</p>
          </div>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full font-sans font-medium text-[15px] text-white bg-clay hover:bg-clay-deep rounded-buttons px-5 py-3.5 transition-colors duration-150 mb-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg v-if="loading" class="animate-spin size-4" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <span v-if="loading">Resetting password...</span>
          <span v-else>Reset password</span>
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
const { resetPassword, getEmail } = useAuth()
const toast = useToast()

const storedEmail = getEmail()
const displayEmail = computed(() => {
  if (!storedEmail) return 'your email'
  const [local, domain] = storedEmail.split('@')
  if (!domain) return storedEmail
  const masked = local.length > 2
    ? local[0] + '***' + local[local.length - 1]
    : local[0] + '***'
  return `${masked}@${domain}`
})

const otp = ref(['', '', '', '', '', ''])
const otpRefs = ref<(HTMLInputElement | null)[]>([])
const newPassword = ref('')
const confirmPassword = ref('')
const newPasswordVisible = ref(false)
const confirmVisible = ref(false)
const loading = ref(false)

const fieldErrors = ref<Record<string, string>>({})

function handleOtpInput(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/[^0-9]/g, '')

  if (value.length <= 1) {
    const newOtp = [...otp.value]
    newOtp[index] = value
    otp.value = newOtp

    if (value && index < 5) {
      otpRefs.value[index + 1]?.focus()
    }
  } else {
    input.value = otp.value[index] || ''
  }
}

function handleOtpKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !otp.value[index] && index > 0) {
    otpRefs.value[index - 1]?.focus()
  }
}

function handleOtpPaste(event: ClipboardEvent) {
  event.preventDefault()
  const pasted = event.clipboardData?.getData('text')?.replace(/[^0-9]/g, '') || ''
  if (pasted.length > 0) {
    const newOtp = [...otp.value]
    for (let i = 0; i < Math.min(6, pasted.length); i++) {
      newOtp[i] = pasted[i]
    }
    otp.value = newOtp
    const focusIndex = Math.min(pasted.length, 5)
    otpRefs.value[focusIndex]?.focus()
  }
}

function validate(): boolean {
  const errors: Record<string, string> = {}

  const otpString = otp.value.join('')
  if (otpString.length !== 6) {
    errors.otp = 'Please enter the complete 6-digit code.'
  }

  if (!newPassword.value) {
    errors.newPassword = 'New password is required.'
  } else if (newPassword.value.length < 8) {
    errors.newPassword = 'Password must be at least 8 characters.'
  }

  if (!confirmPassword.value) {
    errors.confirmPassword = 'Please confirm your new password.'
  } else if (newPassword.value !== confirmPassword.value) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function handleSubmit() {
  if (loading.value) return
  fieldErrors.value = {}

  if (!validate()) return

  if (!storedEmail) {
    toast.addToast('Session expired', 'Please start the password reset process again.', 'error')
    await router.push('/forgot-password')
    return
  }

  loading.value = true

  try {
    const res = await resetPassword(storedEmail, otp.value.join(''), newPassword.value)

    if (res?.successful === true) {
      toast.addToast('Password reset', 'Your password has been updated. Please sign in.', 'success')
      await router.push('/login')
    } else {
      toast.addToast('Reset failed', res?.message || 'Please check your code and try again.', 'error')
    }
  } catch {
    toast.addToast('Connection error', 'Unable to connect. Please check your network.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  setTimeout(() => {
    otpRefs.value[0]?.focus()
  }, 300)
})
</script>
