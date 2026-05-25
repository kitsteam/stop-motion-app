// Progress reporter shape used by long-running encoding pipelines
// (video, GIF). Matches the Angular `ProgressCallback` signature so
// existing call sites can be ported verbatim.
export type ProgressCallback = (
  state: string,
  progress: number,
  time: number,
) => void
