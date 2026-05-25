// Parsed once at module load — the user agent is stable for the lifetime of
// the document, so re-evaluating per call is wasted work. Shared between
// `useLayout` (component-side reactivity) and `layoutAPI` (service-side
// imperative reads) so both report identical platform flags.

const UA = typeof navigator !== 'undefined' ? navigator.userAgent : ''

export const IS_IOS =
  /iPad|iPhone|iPod/.test(UA) ||
  // iPadOS 13+ reports itself as Mac; touch capability disambiguates.
  (UA.includes('Mac') &&
    typeof document !== 'undefined' &&
    'ontouchend' in document)

export const IS_ANDROID = /Android/i.test(UA)
