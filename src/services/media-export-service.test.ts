import { describe, it, expect, vi } from 'vitest'
import { MediaExportService } from './media-export-service'
import type { RecordingService } from './recording-service'

function makeFakeRecordingService(returnBlob: Blob) {
  return {
    createVideoFromFrames: vi.fn().mockResolvedValue(returnBlob),
  } as unknown as RecordingService
}

describe('MediaExportService.createVideo', () => {
  it('delegates to RecordingService.createVideoFromFrames with the mapped fields', async () => {
    const recorded = new Blob(['fake-webm'], { type: 'video/webm' })
    const recording = makeFakeRecordingService(recorded)
    const service = new MediaExportService(recording)

    const frames = [new Blob(['f1']), new Blob(['f2'])]
    const audio = new Blob(['audio'], { type: 'audio/webm' })
    const cb = vi.fn()

    const result = await service.createVideo(frames, 12, audio, cb)

    expect(recording.createVideoFromFrames).toHaveBeenCalledTimes(1)
    expect(recording.createVideoFromFrames).toHaveBeenCalledWith({
      frames,
      frameRate: 12,
      audioBlob: audio,
      progressCallback: cb,
    })
    expect(result).toBe(recorded)
  })

  it('forwards undefined audio and missing progress callback unchanged', async () => {
    const recorded = new Blob(['no-audio'], { type: 'video/webm' })
    const recording = makeFakeRecordingService(recorded)
    const service = new MediaExportService(recording)

    const frames = [new Blob(['only-frame'])]

    await service.createVideo(frames, 6, undefined)

    expect(recording.createVideoFromFrames).toHaveBeenCalledWith({
      frames,
      frameRate: 6,
      audioBlob: undefined,
      progressCallback: undefined,
    })
  })
})
