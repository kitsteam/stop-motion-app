// Progress reporter shape used by long-running encoding pipelines (video, GIF).
export type ProgressCallback = (
  state: string,
  progress: number,
  time: number,
) => void
