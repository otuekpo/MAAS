const toasts = ref<
  Array<{
    id: number
    title: string
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
    progress: number
    paused: boolean
    intervalId?: ReturnType<typeof setInterval>
  }>
>([])

export const useToast = () => {
  const DURATION = 4000
  const INTERVAL = 50

  const addToast = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
  ) => {
    const id = Date.now() + Math.random()
    const toast = {
      id,
      title,
      message,
      type,
      progress: 100,
      paused: false,
      intervalId: undefined as ReturnType<typeof setInterval> | undefined,
    }
    toasts.value.push(toast)

    toast.intervalId = setInterval(() => {
      if (!toast.paused) {
        toast.progress -= (INTERVAL / DURATION) * 100
        toasts.value = [...toasts.value]
        if (toast.progress <= 0) {
          removeToast(toast.id)
        }
      }
    }, INTERVAL)
  }

  const removeToast = (id: number) => {
    const index = toasts.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      const t = toasts.value[index]
      if (t?.intervalId) clearInterval(t.intervalId)
      toasts.value.splice(index, 1)
    }
  }

  const pause = (id: number) => {
    const t = toasts.value.find((t) => t.id === id)
    if (t) t.paused = true
  }

  const resume = (id: number) => {
    const t = toasts.value.find((t) => t.id === id)
    if (t) t.paused = false
  }

  return { toasts, addToast, removeToast, pause, resume }
}
