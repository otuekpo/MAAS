export const useAuth = () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.BASE_URL

  const login = async (email: string, password: string) => {
    if (!baseUrl) throw new Error('BASE_URL is not set')

    const response = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    return response.json()
  }

  const signup = async (
    email: string,
    password: string,
    confirmpassword: string,
  ) => {
    if (!baseUrl) throw new Error('BASE_URL is not set')

    const response = await fetch(`${baseUrl}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, confirmpassword }),
    })
    return response.json()
  }

  const resendConfirmation = async (email: string) => {
    if (!baseUrl) throw new Error('BASE_URL is not set')

    const response = await fetch(`${baseUrl}/api/resend-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    return response.json()
  }

  const verifyEmail = async (email: string, token: string) => {
    if (!baseUrl) throw new Error('BASE_URL is not set')

    const response = await fetch(`${baseUrl}/api/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token }),
    })
    return response.json()
  }

  const forgotPassword = async (email: string) => {
    if (!baseUrl) throw new Error('BASE_URL is not set')

    const response = await fetch(`${baseUrl}/api/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    return response.json()
  }

  const resetPassword = async (
    email: string,
    otp: string,
    newPassword: string,
  ) => {
    if (!baseUrl) throw new Error('BASE_URL is not set')

    const response = await fetch(`${baseUrl}/api/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword }),
    })
    return response.json()
  }

  const getMyDetails = async (token: string) => {
    if (!baseUrl) throw new Error('BASE_URL is not set')

    const response = await fetch(`${baseUrl}/api/details`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    return response.json()
  }

  const saveToken = (accessToken: string) => {
    const maxAge = 24 * 60 * 60
    const accessCookie = useCookie('accessToken', { maxAge })
    accessCookie.value = accessToken
  }

  const retrieveToken = () => {
    const accessCookie = useCookie('accessToken')
    return { accessToken: accessCookie.value }
  }

  const saveEmail = (email: string) => {
    const emailCookie = useCookie('email', { maxAge: 60 * 60 * 24 * 365 })
    emailCookie.value = email
  }

  const getEmail = () => {
    const email = useCookie('email')
    return email.value
  }

  return {
    login,
    signup,
    resendConfirmation,
    verifyEmail,
    forgotPassword,
    resetPassword,
    getMyDetails,
    saveToken,
    retrieveToken,
    saveEmail,
    getEmail,
  }
}
