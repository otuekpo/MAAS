export interface AdminTrip extends Trip {
  user?: {
    id: string
    email: string
    firstName?: string
    lastName?: string
  } | null
}

export interface AdminLog {
  _id: string
  user_id?: string
  email?: string
  action: string
  module?: string
  status: 'success' | 'failed' | 'blocked'
  ip_address?: string
  method?: string
  path?: string
  status_code?: number
  duration_ms?: number
  user_agent?: string
  role?: number
  message?: string
  data?: unknown
  createdAt?: string
  updatedAt?: string
}

export interface AdminLogFilters {
  search?: string
  user?: string
  actionType?: string
  module?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface AdminLogsPage {
  data: AdminLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export const useAdmin = () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.BASE_URL
  const { retrieveToken } = useAuth()

  const getAuthHeaders = () => {
    const { accessToken } = retrieveToken()
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    }
  }

  const getAllTrips = async () => {
    if (!baseUrl) throw new Error('BASE_URL is not set')
    const response = await fetch(`${baseUrl}/api/admin/trips`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    return response.json()
  }

  const getLogs = async (filters: AdminLogFilters = {}) => {
    if (!baseUrl) throw new Error('BASE_URL is not set')
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    const qs = params.toString()
    const response = await fetch(`${baseUrl}/api/admin/logs${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    return response.json()
  }

  const getLogDetail = async (id: string) => {
    if (!baseUrl) throw new Error('BASE_URL is not set')
    const response = await fetch(`${baseUrl}/api/admin/logs/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    return response.json()
  }

  const exportLogs = async (filters: AdminLogFilters = {}) => {
    if (!baseUrl) throw new Error('BASE_URL is not set')
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    const qs = params.toString()
    const response = await fetch(`${baseUrl}/api/admin/logs/export${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    return response
  }

  return { getAllTrips, getLogs, getLogDetail, exportLogs }
}
