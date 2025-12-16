import { MediaImportService } from './media-import.service';
import { MimeTypes } from '@enums/mime-types.enum';

describe('MediaImportService', () => {
    let service: MediaImportService;

    beforeEach(() => {
        service = new MediaImportService();
    });

    it('returns extracted video/audio blobs from import', async () => {
        const sourceFile = new Blob(['zip-bytes']);
        const videoBlob = new Blob(['video']);
        const audioBlob = new Blob(['audio'], { type: MimeTypes.audioWebm });

        const extractSpy = spyOn<any>(service, 'extractMediaBlobs')
            .and.returnValue(Promise.resolve({ videoBlob, audioBlob }));

        const result = await service.import(sourceFile);

        expect(extractSpy).toHaveBeenCalledWith(sourceFile);
        expect(result.videoBlob).toBe(videoBlob);
        expect(result.audioBlob).toBe(audioBlob);
    });

    describe('classifyZipEntry', () => {
        it('identifies explicit video filenames', () => {
            const entry = { filename: 'Video.WEBM', directory: false };
            const result = (service as any).classifyZipEntry(entry, false);
            expect(result).toEqual({ role: 'video', mimeType: MimeTypes.video });
        });

        it('identifies explicit audio filenames', () => {
            const entry = { filename: 'audio-track.webm', directory: false };
            const result = (service as any).classifyZipEntry(entry, true);
            expect(result).toEqual({ role: 'audio', mimeType: MimeTypes.audioWebm });
        });

        it('treats subsequent .webm files as audio when video already found', () => {
            const entry = { filename: 'track-02.webm', directory: false };
            const result = (service as any).classifyZipEntry(entry, true);
            expect(result).toEqual({ role: 'audio', mimeType: MimeTypes.audioWebm });
        });

        it('handles nested paths without confusing folder names', () => {
            const entry = { filename: 'exports/run/video.webm', directory: false };
            const result = (service as any).classifyZipEntry(entry, false);
            expect(result).toEqual({ role: 'video', mimeType: MimeTypes.video });
        });

        it('still classifies audio even when parent folder contains "video"', () => {
            const entry = { filename: 'my-video-export/audio.webm', directory: false };
            const result = (service as any).classifyZipEntry(entry, false);
            expect(result).toEqual({ role: 'audio', mimeType: MimeTypes.audioWebm });
        });
    });
});
