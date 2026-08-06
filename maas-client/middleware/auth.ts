export default defineNuxtRouteMiddleware(async () => {
  if (!import.meta.client) return

  const { retrieveToken, getMyDetails } = useAuth()
  const { accessToken } = retrieveToken()

  if (!accessToken) {
    return navigateTo('/login')
  }

  try {
    const response = await getMyDetails(accessToken)

    if (!response?.successful) {
      const accessCookie = useCookie('accessToken')
      accessCookie.value = null
      return navigateTo('/login')
    }
  } catch {
    const accessCookie = useCookie('accessToken')
    accessCookie.value = null
    return navigateTo('/login')
  }
})
