export type AlertButtonRole = 'cancel'

export interface AlertButton {
  text: string
  role?: AlertButtonRole
  handler?: (inputValues: Record<string, string>) => void | Promise<void>
}

export interface AlertInput {
  name: string
  type: 'text'
  value?: string
  placeholder?: string
  label?: string
}

export interface AlertOptions {
  header?: string
  message?: string
  buttons: AlertButton[]
  inputs?: AlertInput[]
  backdropDismiss?: boolean
}

export interface AlertAPI {
  show(options: AlertOptions): Promise<void>
}

export function createAlertAPI(
  show: (options: AlertOptions) => Promise<void>,
): AlertAPI {
  return {
    show(options) {
      return show(options)
    },
  }
}
