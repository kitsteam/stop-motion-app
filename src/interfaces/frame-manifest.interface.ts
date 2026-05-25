export interface FrameManifestEntry {
    filename: string;
    mimeType?: string;
}

export interface FrameManifest {
    version: number;
    width: number;
    height: number;
    frameRate: number;
    frames: FrameManifestEntry[];
}
