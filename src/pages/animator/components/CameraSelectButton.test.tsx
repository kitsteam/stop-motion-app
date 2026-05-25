import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CameraSelectButton from './CameraSelectButton'
import { ToolbarTestProviders } from '../../../test/animator-test-utils'
import { createMockAnimatorService } from '../../../test/animator-test-factory'

function makeCamera(deviceId: string): MediaDeviceInfo {
  return {
    deviceId,
    kind: 'videoinput',
    label: deviceId,
    groupId: 'g',
    toJSON: () => ({}),
  } as MediaDeviceInfo
}

describe('CameraSelectButton', () => {
  it('is disabled when only one camera is available (non-iOS)', () => {
    const service = createMockAnimatorService({ cameras: [makeCamera('a')] })
    render(
      <ToolbarTestProviders service={service}>
        <CameraSelectButton />
      </ToolbarTestProviders>,
    )
    expect(screen.getByTestId('camera-select-button')).toBeDisabled()
  })

  it('is enabled when two cameras are available', () => {
    const service = createMockAnimatorService({
      cameras: [makeCamera('a'), makeCamera('b')],
    })
    render(
      <ToolbarTestProviders service={service}>
        <CameraSelectButton />
      </ToolbarTestProviders>,
    )
    expect(screen.getByTestId('camera-select-button')).toBeEnabled()
  })

  it('dispatches switchCamera on click', () => {
    const service = createMockAnimatorService({
      cameras: [makeCamera('a'), makeCamera('b')],
    })
    render(
      <ToolbarTestProviders service={service}>
        <CameraSelectButton />
      </ToolbarTestProviders>,
    )
    fireEvent.click(screen.getByTestId('camera-select-button'))
    expect(service.switchCamera).toHaveBeenCalledTimes(1)
  })
})
