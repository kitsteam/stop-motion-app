import { IS_ANDROID, IS_IOS } from './user-agent'

export const layoutAPI = {
  isIOS: IS_IOS,
  isAndroid: IS_ANDROID,
} as const
