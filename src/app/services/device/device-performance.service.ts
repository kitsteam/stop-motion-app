import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DevicePerformanceTier } from '@enums/device-performance-tier.enum';
import { CaptureSettings, DevicePerformanceProfile, ExportSettings } from '@interfaces/device-performance-profile.interface';

@Injectable({
    providedIn: 'root'
})
export class DevicePerformanceService {
    private readonly isBrowser: boolean;
    private readonly profile: DevicePerformanceProfile;
    private readonly exportSettings: ExportSettings;

    constructor(@Inject(PLATFORM_ID) platformId: object) {
        this.isBrowser = isPlatformBrowser(platformId);
        this.profile = this.computeProfile();
        this.exportSettings = this.computeExportSettings(this.profile);
    }

    /**
     * Returns device-specific capture settings that keep per-frame memory within an acceptable range.
     */
    public getCaptureSettings(width: number, height: number): CaptureSettings {
        if (!this.isBrowser) {
            return { scale: 1, jpegQuality: 0.8 };
        }

        const pixelCount = width * height;
        const { pixelBudget, minScale, maxScale, captureQuality } = this.profile;

        if (pixelCount <= 0 || pixelCount <= pixelBudget) {
            return { scale: 1, jpegQuality: captureQuality };
        }

        const rawScale = Math.sqrt(pixelBudget / pixelCount);
        const scale = this.clamp(rawScale, minScale, Math.min(1, maxScale));

        return { scale: Number(scale.toFixed(3)), jpegQuality: captureQuality };
    }

    public getExportSettings(): ExportSettings {
        return this.exportSettings;
    }

    public getTier(): DevicePerformanceTier {
        return this.profile.tier;
    }

    /**
     * Heuristically buckets the current device into a performance tier using memory, CPU, and screen size.
     */
    private computeProfile(): DevicePerformanceProfile {
        if (!this.isBrowser) {
            return this.buildProfile(DevicePerformanceTier.High);
        }

        const navigatorAny = navigator as Navigator & { deviceMemory?: number };
        const deviceMemory = typeof navigatorAny.deviceMemory === 'number' ? navigatorAny.deviceMemory : undefined;
        const hardwareConcurrency = typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : undefined;
        const pixelCount = window.screen.width * window.screen.height;
        const userAgent = navigator.userAgent || '';
        const isIOS = /iP(ad|hone|od)/.test(userAgent);

        let tier = DevicePerformanceTier.High;

        if (deviceMemory !== undefined) {
            if (deviceMemory <= 2) {
                tier = DevicePerformanceTier.Low;
            } else if (deviceMemory <= 4) {
                tier = DevicePerformanceTier.Medium;
            }
        } else if (isIOS) {
            tier = DevicePerformanceTier.Low;
        } else if (hardwareConcurrency && hardwareConcurrency <= 4) {
            tier = DevicePerformanceTier.Medium;
        }

        if (tier === DevicePerformanceTier.High && hardwareConcurrency && hardwareConcurrency <= 6 && pixelCount > 5_000_000) {
            tier = DevicePerformanceTier.Medium;
        }

        if (tier === DevicePerformanceTier.Low && pixelCount > 3_000_000 && hardwareConcurrency && hardwareConcurrency >= 6) {
            tier = DevicePerformanceTier.Medium;
        }

        return this.buildProfile(tier);
    }

    /**
     * Converts a tier into concrete configuration used by capture and export workflows.
     */
    private buildProfile(tier: DevicePerformanceTier): DevicePerformanceProfile {
        switch (tier) {
            case DevicePerformanceTier.Low:
                return {
                    tier,
                    captureQuality: 0.65,
                    minScale: 0.55,
                    maxScale: 0.75,
                    pixelBudget: 1_200_000,
                    exportTargetWidth: 480,
                    ffmpegImageBatchSize: 4,
                    jpegConversionBatchSize: 2,
                    webpQuality: 55
                };
            case DevicePerformanceTier.Medium:
                return {
                    tier,
                    captureQuality: 0.72,
                    minScale: 0.65,
                    maxScale: 0.9,
                    pixelBudget: 1_800_000,
                    exportTargetWidth: 560,
                    ffmpegImageBatchSize: 6,
                    jpegConversionBatchSize: 3,
                    webpQuality: 60
                };
            default:
                return {
                    tier,
                    captureQuality: 0.8,
                    minScale: 0.8,
                    maxScale: 1,
                    pixelBudget: 2_600_000,
                    exportTargetWidth: 640,
                    ffmpegImageBatchSize: 10,
                    jpegConversionBatchSize: 4,
                    webpQuality: 65
                };
        }
    }

    /**
     * Extracts export-specific values so they can be reused without recomputing device heuristics.
     */
    private computeExportSettings(profile: DevicePerformanceProfile): ExportSettings {
        return {
            targetVideoWidth: profile.exportTargetWidth,
            ffmpegImageBatchSize: profile.ffmpegImageBatchSize,
            jpegConversionBatchSize: profile.jpegConversionBatchSize,
            webpQuality: profile.webpQuality
        };
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }
}
