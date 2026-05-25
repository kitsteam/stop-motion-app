export type ToastColor = 'warning' | 'danger'

export interface ToastOptions {
  message: string
  color?: ToastColor
  duration?: number
}

export interface ToastAPI {
  show(options: ToastOptions): void
}

export function createToastAPI(
  show: (options: ToastOptions) => void,
): ToastAPI {
  return {
    show(options) {
      show(options)
    },
  }
}
