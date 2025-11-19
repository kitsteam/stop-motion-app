import { DevicePerformanceTier } from '@enums/device-performance-tier.enum';

export interface DevicePerformanceProfile {
    tier: DevicePerformanceTier;
    captureQuality: number;
    minScale: number;
    maxScale: number;
    pixelBudget: number;
    exportTargetWidth: number;
    ffmpegImageBatchSize: number;
    jpegConversionBatchSize: number;
    webpQuality: number;
}

export interface CaptureSettings {
    scale: number;
    jpegQuality: number;
}

export interface ExportSettings {
    targetVideoWidth: number;
    ffmpegImageBatchSize: number;
    jpegConversionBatchSize: number;
    webpQuality: number;
}
