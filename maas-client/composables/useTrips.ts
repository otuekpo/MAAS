export interface Trip {
  _id: string
  user_id: string
  route: string
  transport: string
  date: string
  cost: number
  description?: string
  eta?: string
  createdAt: string
  updatedAt: string
}

export interface CreateTripPayload {
  route: string
  transport: string
  date: string
  cost: number
  description?: string
  eta?: string
}

export interface UpdateTripPayload {
  route?: string
  transport?: string
  date?: string
  cost?: number
  description?: string
  eta?: string
}

export const useTrips = () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.BASE_URL
  const { retrieveToken } = useAuth()

  const authHeaders = () => {
    const { accessToken } = retrieveToken()
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    }
  }

  const getTrips = async () => {
    if (!baseUrl) throw new Error('BASE_URL is not set')

    const response = await fetch(`${baseUrl}/api/trips`, {
      method: 'GET',
      headers: authHeaders(),
    })
    return response.json()
  }

  const createTrip = async (payload: CreateTripPayload) => {
    if (!baseUrl) throw new Error('BASE_URL is not set')

    const response = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    })
    return response.json()
  }

  const updateTrip = async (id: string, payload: UpdateTripPayload) => {
    if (!baseUrl) throw new Error('BASE_URL is not set')

    const response = await fetch(`${baseUrl}/api/trips/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    })
    return response.json()
  }

  const deleteTrip = async (id: string) => {
    if (!baseUrl) throw new Error('BASE_URL is not set')

    const response = await fetch(`${baseUrl}/api/trips/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    return response.json()
  }

  return {
    getTrips,
    createTrip,
    updateTrip,
    deleteTrip,
  }
}
