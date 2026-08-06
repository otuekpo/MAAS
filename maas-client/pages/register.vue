<template>
  <div class="min-h-screen flex items-center py-12 sm:py-16 lg:py-20">
    <div class="max-w-[1200px] mx-auto px-5 sm:px-6 w-full">
      <div class="grid grid-cols-1 xl:grid-cols-2 xl:gap-16">

        <!-- ========== LEFT COLUMN: MARKETING ========== -->
        <div class="order-2 xl:order-1 mt-10 sm:mt-14 xl:mt-0 relative">
          <div
            class="absolute inset-0 pointer-events-none opacity-[0.06]"
            style="background-image: linear-gradient(rgba(20,20,19,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(20,20,19,0.3) 1px, transparent 1px); background-size: 48px 48px;"
          />
          <div class="relative z-10 xl:pr-12">
            <h1 class="font-sans font-bold text-[28px] sm:text-[36px] lg:text-[44px] xl:text-[48px] leading-[1.1] tracking-[-0.02em] text-slate-dark max-w-[540px]">
              Mobility as a<br class="hidden sm:block" /> Service platform.
            </h1>
            <p class="mt-4 sm:mt-5 font-serif text-[17px] sm:text-[18px] lg:text-[20px] text-slate-dark leading-[1.4] max-w-[480px]">
              MaaS connects riders, drivers, and transit operators into a single seamless network — plan, book, and pay for any journey from one place.
            </p>

            <div class="mt-8 sm:mt-10 lg:mt-12 flex flex-col gap-6 sm:gap-8">
              <div class="flex items-start gap-3 sm:gap-4">
                <span class="flex-shrink-0 w-9 h-9 rounded-[24px] bg-oat-warm flex items-center justify-center mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" class="text-slate-dark" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                </span>
                <div>
                  <span class="font-sans font-semibold text-[14px] sm:text-[15px] text-slate-dark">Real-time trip tracking</span>
                  <p class="mt-1 font-serif text-[15px] sm:text-[16px] text-cloud-medium leading-[1.5]">Follow your ride from pickup to drop-off with live ETAs and route maps.</p>
                </div>
              </div>

              <div class="flex items-start gap-3 sm:gap-4">
                <span class="flex-shrink-0 w-9 h-9 rounded-[24px] bg-oat-warm flex items-center justify-center mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" class="text-slate-dark" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                </span>
                <div>
                  <span class="font-sans font-semibold text-[14px] sm:text-[15px] text-slate-dark">Multi-operator network</span>
                  <p class="mt-1 font-serif text-[15px] sm:text-[16px] text-cloud-medium leading-[1.5]">Compare routes across buses, trains, and ride-hail from a single unified platform.</p>
                </div>
              </div>

              <div class="flex items-start gap-3 sm:gap-4">
                <span class="flex-shrink-0 w-9 h-9 rounded-[24px] bg-oat-warm flex items-center justify-center mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" class="text-slate-dark" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
                </span>
                <div>
                  <span class="font-sans font-semibold text-[14px] sm:text-[15px] text-slate-dark">Unified payments</span>
                  <p class="mt-1 font-serif text-[15px] sm:text-[16px] text-cloud-medium leading-[1.5]">One wallet for all transit — tap to pay across every mode without separate tickets.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ========== RIGHT COLUMN: FORM ========== -->
        <div class="order-1 xl:order-2 max-w-md mx-auto xl:max-w-none w-full">
          <h2 class="font-sans text-[22px] sm:text-[24px] font-semibold text-slate-dark leading-[1.2] tracking-[-0.02em] mb-5">Create your account</h2>

          <form @submit.prevent="handleSubmit" novalidate>
            <div class="flex flex-col gap-4 mb-6">
              <!-- Email -->
              <div class="flex flex-col gap-2">
                <label for="reg-email" class="font-sans text-[14px] sm:text-[15px] text-slate-dark">Email <span class="text-clay">*</span></label>
                <input
                  id="reg-email"
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

              <!-- Password -->
              <div class="flex flex-col gap-2">
                <label for="reg-password" class="font-sans text-[14px] sm:text-[15px] text-slate-dark">Password <span class="text-clay">*</span></label>
                <div class="relative">
                  <input
                    id="reg-password"
                    v-model="password"
                    :type="passwordVisible ? 'text' : 'password'"
                    required
                    autocomplete="new-password"
                    placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                    :class="[
                      'bg-ivory-light border rounded-inputs text-slate-dark placeholder:text-cloud-medium px-3.5 py-3 pr-10 text-[16px] font-serif outline-none transition-colors duration-150 w-full',
                      fieldErrors.password ? 'border-clay-deep' : 'border-stone focus:border-clay'
                    ]"
                  />
                  <button
                    type="button"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-cloud-medium hover:text-slate-dark transition-colors duration-150"
                    :aria-label="passwordVisible ? 'Hide password' : 'Show password'"
                    @click="passwordVisible = !passwordVisible"
                  >
                    <svg v-if="!passwordVisible" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="M17 3 2 20"/><path d="m21 3-5 5"/></svg>
                  </button>
                </div>
                <p v-if="fieldErrors.password" class="font-serif text-[13px] sm:text-[14px] text-clay-deep leading-[1.4]">{{ fieldErrors.password }}</p>
              </div>

              <!-- Confirm Password -->
              <div class="flex flex-col gap-2">
                <label for="reg-confirm" class="font-sans text-[14px] sm:text-[15px] text-slate-dark">Confirm password <span class="text-clay">*</span></label>
                <div class="relative">
                  <input
                    id="reg-confirm"
                    v-model="confirmpassword"
                    :type="confirmVisible ? 'text' : 'password'"
                    required
                    autocomplete="new-password"
                    placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                    :class="[
                      'bg-ivory-light border rounded-inputs text-slate-dark placeholder:text-cloud-medium px-3.5 py-3 pr-10 text-[16px] font-serif outline-none transition-colors duration-150 w-full',
                      fieldErrors.confirmpassword ? 'border-clay-deep' : 'border-stone focus:border-clay'
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
                <p v-if="fieldErrors.confirmpassword" class="font-serif text-[13px] sm:text-[14px] text-clay-deep leading-[1.4]">{{ fieldErrors.confirmpassword }}</p>
              </div>
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full font-sans font-medium text-[15px] text-white bg-clay hover:bg-clay-deep rounded-buttons px-5 py-3.5 transition-colors duration-150 mb-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg v-if="loading" class="animate-spin size-4" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              <span v-if="loading">Creating account...</span>
              <span v-else>Create account</span>
            </button>

            <p class="font-serif text-[15px] sm:text-[16px] text-cloud-medium text-center">
              Already have an account?
              <NuxtLink to="/login" class="text-clay hover:text-clay-deep underline transition-colors duration-150">Sign in</NuxtLink>
            </p>
          </form>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const router = useRouter()
const { signup, saveEmail } = useAuth()
const toast = useToast()

const email = ref('')
const password = ref('')
const confirmpassword = ref('')
const passwordVisible = ref(false)
const confirmVisible = ref(false)
const loading = ref(false)

const fieldErrors = ref<Record<string, string>>({})

function validate(): boolean {
  const errors: Record<string, string> = {}

  if (!email.value.trim()) {
    errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    errors.email = 'Please enter a valid email address.'
  }

  if (!password.value) {
    errors.password = 'Password is required.'
  } else if (password.value.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
  }

  if (!confirmpassword.value) {
    errors.confirmpassword = 'Please confirm your password.'
  } else if (password.value !== confirmpassword.value) {
    errors.confirmpassword = 'Passwords do not match.'
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
    const res = await signup(email.value, password.value, confirmpassword.value)

    if (res?.successful === true) {
      saveEmail(email.value)
      toast.addToast('Account created', 'Please check your email for the verification code.', 'success')
      await router.push('/verify-email')
    } else {
      toast.addToast('Registration failed', res?.message || 'Please try again.', 'error')
    }
  } catch {
    toast.addToast('Connection error', 'Unable to connect. Please check your network.', 'error')
  } finally {
    loading.value = false
  }
}
</script>
