declare module 'gifenc' {
  export type GifPalette = Array<
    [number, number, number] | [number, number, number, number]
  >

  export interface GifEncoderOptions {
    initialCapacity?: number
    auto?: boolean
  }

  export interface GifFrameOptions {
    palette?: GifPalette
    transparent?: boolean
    transparentIndex?: number
    delay?: number
    repeat?: number
    colorDepth?: number
    dispose?: number
    first?: boolean
  }

  export interface GifEncoderInstance {
    writeFrame(
      pixels: Uint8Array,
      width: number,
      height: number,
      options?: GifFrameOptions,
    ): void
    finish(): void
    bytes(): Uint8Array
    bytesView(): Uint8Array
    reset(): void
  }

  export function GIFEncoder(options?: GifEncoderOptions): GifEncoderInstance
  export function quantize(
    data: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: Record<string, unknown>,
  ): GifPalette
  export function applyPalette(
    data: Uint8Array | Uint8ClampedArray,
    palette: GifPalette,
    format?: string,
  ): Uint8Array
}
