import { MediaImportService } from './media-import.service';
import { MimeTypes } from '@enums/mime-types.enum';

describe('MediaImportService', () => {
    let service: MediaImportService;

    beforeEach(() => {
        service = new MediaImportService();
    });

    it('combines extracted media with decoded frames', async () => {
        const sourceFile = new Blob(['zip-bytes']);
        const videoBlob = new Blob(['video']);
        const audioBlob = new Blob(['audio'], { type: MimeTypes.audioWebm });
        spyOn(videoBlob, 'arrayBuffer').and.returnValue(Promise.resolve(new ArrayBuffer(16)));

        const extractSpy = spyOn<any>(service, 'extractMediaBlobs')
            .and.returnValue(Promise.resolve({ videoBlob, audioBlob }));

        const frames = [new Image()];
        const frameBlobs = [new Blob(['frame'])];
        const decodeSpy = spyOn<any>(service, 'decodeVideo')
            .and.returnValue(Promise.resolve({ frames, frameBlobs, frameRate: 12 }));

        const result = await service.import(sourceFile);

        expect(extractSpy).toHaveBeenCalledWith(sourceFile);
        expect(decodeSpy).toHaveBeenCalled();
        expect(result.frames).toBe(frames);
        expect(result.frameBlobs).toBe(frameBlobs);
        expect(result.audioBlob).toBe(audioBlob);
        expect(result.frameRate).toBe(12);
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
    });
});
