import type { ProgressCallback } from './types'

interface CombineOptions {
  progressCallback?: ProgressCallback
}

// WebM carries VP8/VP9/AV1; Safari's H.264 falls through to MP4 instead. The
// audio codec recorded by the same browser always pairs with its video codec.
const WEBM_VIDEO_CODECS = new Set<string>(['vp8', 'vp9', 'av1'])

// Stream-copies a separately-recorded video-only and audio-only blob into one
// file — no re-encode and no `decodeAudioData` (the Safari audio-export break).
// Container follows the video codec: WebM on Chrome, MP4 on Safari. Mediabunny
// is imported lazily so it only loads for exports that have audio.
export async function combineAudioVideo(
  videoBlob: Blob,
  audioBlob: Blob,
  { progressCallback }: CombineOptions = {},
): Promise<Blob> {
  const {
    ALL_FORMATS,
    BlobSource,
    BufferTarget,
    EncodedAudioPacketSource,
    EncodedPacketSink,
    EncodedVideoPacketSource,
    Input,
    Mp4OutputFormat,
    Output,
    WebMOutputFormat,
  } = await import('mediabunny')

  const videoInput = new Input({ formats: ALL_FORMATS, source: new BlobSource(videoBlob) })
  const audioInput = new Input({ formats: ALL_FORMATS, source: new BlobSource(audioBlob) })

  const videoTrack = await videoInput.getPrimaryVideoTrack()
  if (!videoTrack) throw new Error('Recorded video has no video track to remux.')
  const audioTrack = await audioInput.getPrimaryAudioTrack()
  if (!audioTrack) throw new Error('Recorded audio has no audio track to remux.')

  const [videoCodec, audioCodec, videoConfig, audioConfig] = await Promise.all([
    videoTrack.getCodec(),
    audioTrack.getCodec(),
    videoTrack.getDecoderConfig(),
    audioTrack.getDecoderConfig(),
  ])
  if (!videoCodec || !videoConfig) throw new Error('Recorded video uses an unsupported codec.')
  if (!audioCodec || !audioConfig) throw new Error('Recorded audio uses an unsupported codec.')

  const format = WEBM_VIDEO_CODECS.has(videoCodec)
    ? new WebMOutputFormat()
    : new Mp4OutputFormat()
  const output = new Output({ format, target: new BufferTarget() })

  const videoSource = new EncodedVideoPacketSource(videoCodec)
  const audioSource = new EncodedAudioPacketSource(audioCodec)
  output.addVideoTrack(videoSource)
  output.addAudioTrack(audioSource)
  await output.start()

  // The remux is a fast stream-copy, so a few coarse ticks are enough for the
  // overlay to show the "combining" phase — no per-packet progress needed.
  const report = (fraction: number) => progressCallback?.('combining', fraction, 0)

  report(0)
  let firstVideo = true
  for await (const packet of new EncodedPacketSink(videoTrack).packets()) {
    await videoSource.add(packet, firstVideo ? { decoderConfig: videoConfig } : undefined)
    firstVideo = false
  }

  report(0.5)
  let firstAudio = true
  for await (const packet of new EncodedPacketSink(audioTrack).packets()) {
    await audioSource.add(packet, firstAudio ? { decoderConfig: audioConfig } : undefined)
    firstAudio = false
  }

  report(0.99)
  await output.finalize()

  const buffer = output.target.buffer
  if (!buffer) throw new Error('Remux produced no output buffer.')
  return new Blob([buffer], { type: format.mimeType })
}
