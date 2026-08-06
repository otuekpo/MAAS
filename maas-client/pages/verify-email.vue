<template>
  <div class="min-h-screen flex items-center py-12 sm:py-16 lg:py-20">
    <div class="max-w-[520px] mx-auto px-5 sm:px-6 w-full">
      <!-- Back to register -->
      <NuxtLink
        to="/register"
        class="inline-flex items-center gap-1.5 font-sans text-[14px] text-cloud-medium hover:text-slate-dark transition-colors duration-150 mb-8"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
        Back to sign up
      </NuxtLink>

      <h1 class="font-sans text-[22px] sm:text-[24px] font-semibold text-slate-dark leading-[1.2] tracking-[-0.02em] mb-2">
        Verify your email
      </h1>
      <p class="font-serif text-[16px] sm:text-[17px] text-cloud-medium leading-[1.5] mb-8">
        We sent a 6-digit code to
        <span class="font-semibold text-slate-dark">{{ displayEmail }}</span>.
        Enter it below to verify your account.
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
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full font-sans font-medium text-[15px] text-white bg-clay hover:bg-clay-deep rounded-buttons px-5 py-3.5 transition-colors duration-150 mb-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg v-if="loading" class="animate-spin size-4" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <span v-if="loading">Verifying...</span>
          <span v-else>Verify email</span>
        </button>

        <!-- Resend -->
        <div class="text-center mb-6">
          <button
            type="button"
            :disabled="resendCooldown > 0"
            class="font-sans text-[14px] text-clay hover:text-clay-deep transition-colors duration-150 disabled:text-cloud-medium disabled:cursor-not-allowed"
            @click="handleResend"
          >
            <span v-if="resendLoading">Sending...</span>
            <span v-else-if="resendCooldown > 0">Resend code in {{ resendCooldown }}s</span>
            <span v-else>Didn't receive the code? Resend</span>
          </button>
        </div>

        <p class="font-serif text-[15px] sm:text-[16px] text-cloud-medium text-center">
          Already verified?
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
const { verifyEmail, resendConfirmation, getEmail } = useAuth()
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
const loading = ref(false)
const resendLoading = ref(false)
const resendCooldown = ref(0)

const fieldErrors = ref<Record<string, string>>({})

let cooldownInterval: ReturnType<typeof setInterval> | null = null

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

  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function handleSubmit() {
  if (loading.value) return
  fieldErrors.value = {}

  if (!validate()) return

  if (!storedEmail) {
    toast.addToast('Session expired', 'Please register again.', 'error')
    await router.push('/register')
    return
  }

  loading.value = true

  try {
    const res = await verifyEmail(storedEmail, otp.value.join(''))

    if (res?.successful === true) {
      toast.addToast('Email verified', 'Your account is now active. Please sign in.', 'success')
      await router.push('/login')
    } else {
      toast.addToast('Verification failed', res?.message || 'Invalid or expired code.', 'error')
    }
  } catch {
    toast.addToast('Connection error', 'Unable to connect. Please check your network.', 'error')
  } finally {
    loading.value = false
  }
}

async function handleResend() {
  if (resendLoading.value || resendCooldown.value > 0) return
  if (!storedEmail) {
    toast.addToast('Session expired', 'Please register again.', 'error')
    await router.push('/register')
    return
  }

  resendLoading.value = true

  try {
    const res = await resendConfirmation(storedEmail)

    if (res?.successful === true) {
      toast.addToast('Code sent', 'A new verification code has been sent to your email.', 'success')
      resendCooldown.value = 60
      cooldownInterval = setInterval(() => {
        resendCooldown.value--
        if (resendCooldown.value <= 0 && cooldownInterval) {
          clearInterval(cooldownInterval)
          cooldownInterval = null
        }
      }, 1000)
    } else {
      toast.addToast('Failed to resend', res?.message || 'Please try again.', 'error')
    }
  } catch {
    toast.addToast('Connection error', 'Unable to connect. Please check your network.', 'error')
  } finally {
    resendLoading.value = false
  }
}

onMounted(() => {
  setTimeout(() => {
    otpRefs.value[0]?.focus()
  }, 300)
})

onUnmounted(() => {
  if (cooldownInterval) clearInterval(cooldownInterval)
})
</script>
