export interface AdminTrip extends Trip {
  user?: {
    id: string
    email: string
    firstName?: string
    lastName?: string
  } | null
}

export const useAdmin = () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.BASE_URL
  const { retrieveToken } = useAuth()

  const getAllTrips = async () => {
    if (!baseUrl) throw new Error('BASE_URL is not set')

    const { accessToken } = retrieveToken()
    const response = await fetch(`${baseUrl}/api/admin/trips`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return response.json()
  }

  return { getAllTrips }
}
