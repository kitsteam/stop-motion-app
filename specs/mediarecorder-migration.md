# MediaRecorder Migration Spec

## 1. Zielsetzung
- Ersetzt die aktuelle `@ffmpeg/ffmpeg`-basierte Export-Pipeline (`VideoService`) vollständig durch die native MediaRecorder API des Browsers.
- Liefert weiterhin dieselben Ausgabeformate (primär `video/webm`, optional `audio/webm` sowie GIF-Export) ohne serverseitige Verarbeitung.
- Entfernt sämtliche FFmpeg-Abhängigkeiten aus `package.json`, Assets (`assets/js/external/ffmpeg/*`) und Code.

## 2. Scope & Nicht-Ziele
- **Im Scope:** Video-/Audio-Export des Stop-Motion-Editors, GIF-Erstellung, Safari-spezifische JPEG→WebP-Konvertierung, Progress-Anzeige.
- **Nicht im Scope:** Rollback-Logik, Parallelbetrieb FFmpeg+MediaRecorder, native Wrapper (Capacitor) oder neue Ausgabeformate.

## 3. Anforderungen
### Funktional
1. Nutzer:innen können weiterhin Clips mit/ohne Audio als `video/webm` exportieren.
2. GIF-Export bleibt verfügbar; erzeugte Qualität muss mindestens der bisherigen Pipeline entsprechen.
3. Progress-/Statusmeldungen (z.B. "converting_images", "creating_video") werden weiterhin bereitgestellt, damit UI-Komponenten wie `save-button` reagieren können.
4. Fehler (z.B. fehlende Aufnahmeberechtigungen, MIME nicht unterstützt) werden differenziert an das UI gemeldet.

### Nicht-funktional
1. Export darf bei 150+ Frames (≈10 Sekunden) ohne Memory-Leaks laufen.
2. Mobile Safari, Chrome, Firefox und Edge (letzte 2 Major-Versionen) werden unterstützt.
3. Kein zusätzliches Backend; alles läuft clientseitig.

## 4. Ist-Zustand (Kurzfassung)
- `src/app/services/video/video.service.ts` kapselt sämtliche FFmpeg-Aufrufe: Audio-Konvertierung, Video- und GIF-Erzeugung, JPEG→WebP.
- Assets (`assets/js/external/ffmpeg/`) liefern `ffmpeg-core`, `worker.js` etc.
- Progress-Events stammen aus `ffmpeg.on('progress')` und landen via `ProgressCallback` (u.a. `save-button`).
- Speicherstrategie: temporäre virtuelle FS pro Export (`crypto.randomUUID`).

## 5. Zielarchitektur
### 5.1 Übersicht
- Neuer `RecordingService` (oder Umbenennung von `VideoService`) abstrahiert Export-Workflows und kapselt MediaRecorder.
- Gemeinsame Hilfsklassen:
  - `CaptureStreamFactory`: baut MediaStreams aus Canvas/Preview-Elementen und AudioContext.
  - `BlobStore`: verwaltet temporäre Blobs (ersetzt virtuelles FFmpeg-FS) und bereitet Downloads/Uploads vor.
- Events & State: Service emittiert strukturierte Events (`{ phase: 'capturing' | 'muxing' | 'finalizing', progress?: number }`).

### 5.2 Workflow Video
1. Frames werden bereits im Animator als `ImageBitmap`/`Blob` gehalten. Für den Export wird eine Offscreen-Canvas erzeugt.
2. Ein Render-Loop schreibt die Frames mit gewünschter FPS in die Canvas; `canvas.captureStream(frameRate)` liefert den VideoStream.
3. Optionales Audio:
   - Vorher aufgenommenes AudioBlob wird via `AudioContext.decodeAudioData` abgespielt.
   - Ein `MediaStreamAudioDestinationNode` speist denselben Stream in den MediaRecorder.
4. MediaRecorder läuft mit MIME `video/webm;codecs=vp9,opus` (Fallback: `video/webm;codecs=vp8,opus`).
5. Chunks werden gesammelt und nach `stop()` via `new Blob(chunks, { type })` zusammengeführt.

### 5.3 Workflow Audio-only
- MediaRecorder nur mit AudioStream (`MediaStreamAudioSourceNode`).
- Dient als Ersatz für `convertAudio`.

### 5.4 GIF-Erzeugung
- MediaRecorder liefert kein GIF => zwei Optionen, im Spec fix vorsehen:
  1. Canvas-Rendering + `OffscreenCanvas` mit `ImageEncoder` (`image/gif`) sofern verfügbar (Chrome, Edge).
  2. Reine JS-Implementierung (z.B. `gifenc`/`omggif`) auf Basis bereits vorliegender Frames.
- Entscheidung: Variante 2 (lib, ~30kB) für garantierte Cross-Browser-Unterstützung. Implementierung wandelt vorhandene WebP/PNG Frames in Indexed Color GIF, nutzt Worker um UI nicht zu blockieren.

### 5.5 JPEG→WebP
- Safari liefert ggf. JPEG Frames. Ohne FFmpeg: Nutzung von Canvas-Konvertierung:
  1. Blob → `createImageBitmap`
  2. Draw auf OffscreenCanvas, `canvas.convertToBlob({ type: 'image/webp', quality: 0.65 })`.
- Batched, um Speicher zu schonen; Worker kann optional bleiben.

### 5.6 Datenhaltung
- Temporäre Blobs liegen im Arbeitsspeicher; bei Bedarf Nutzung von `navigator.storage.estimate()` und Abbruch bei zu wenig Speicher.
- Optional: Schreiben in `IndexedDB` wenn Clips > 200MB (Stretch Goal, nicht verpflichtend).

## 6. Implementierungsplan
1. **Vorbereitung**
   - Neues Verzeichnis `specs/` (dieses Dokument).
   - Technische Spike-Notebooks/POCs (kann entfallen, falls klar).
2. **Grundlegende Services**
   - Introduce `RecordingService` mit API `startVideoExport(frames, fps, audioBlob?, progressCb)` etc.
   - Abstrahiert MediaRecorder-Setup, Events, Fehler.
3. **Frames Rendern**
   - Utility `FrameRenderer` übernimmt OffscreenCanvas-Handhabung, JPEG→WebP Conversion.
   - Liefert `MediaStream` + Option, Frame-Sequenz erneut zu rendern (für GIF-Lib).
4. **Audio Handling**
   - `AudioTrackBuilder` kombiniert AudioClip + `AudioContext` in `MediaStreamAudioDestinationNode`.
5. **UI Integration**
   - Replace FFmpeg calls in `save-button` und anderen Komponenten mit neuem Service.
   - Progress-Phasen sauber mappen.
6. **Dependency Cleanup**
   - Entferne `@ffmpeg/*` aus `package.json`, Assets, Third-Party-Lizenzen.
   - Passe Build/Cache-Skripte an.
7. **GIF Library Integration**
   - Wähle JS-GIF-Lib, implementiere Worker (`src/app/workers/gif-export.worker.ts`).
8. **Testing & Hardening**
   - Automatisierte Tests (Unit + ggf. Playwright) und manuelle Testmatrix.

## 7. Tests
- **Unit:**
  - `RecordingService` Mocked `MediaRecorder` (z.B. über Wrapper-Interface).
  - Frame-Konverter (JPEG→WebP) inklusive Fehlerfälle.
- **E2E/Integration:**
  - Export mit/ohne Audio, GIF Export, Abbruch Szenarien.
  - Browser-spezifische Checks (Chrome Desktop, Safari iOS Simulator).
- **Performance:**
  - Messungen für 300 Frames @ 24 FPS (Speicher < 1.5x Frame-Dataset).
  - CPU Profiling, keine langen Hauptthread-Blocks (>50ms) während Export.

## 8. Risiken & Offene Punkte
1. **MediaRecorder Support Variationen:** VP9 nicht überall verfügbar → Fall back auf VP8 automatisch.
2. **Audio Synchronität:** getrennter Render-Loop + AudioContext-Latenz könnte Drift erzeugen → Timestamps synchronisieren, optional `MediaStreamTrackGenerator` nutzen.
3. **GIF Qualität:** Sicherstellen, dass gewählte JS-Lib Transparenz + Dithering beherrscht.
4. **Memory Pressure:** Große Projekte könnten Browser tab crashen → frühzeitige Checks + Nutzerwarnung.

## 9. Timeline (Richtwert)
1. Woche 1: Grundlagen-Implementation (Services, Video Export happy path).
2. Woche 2: Audio-Integration, GIF-Lösung, UI-Anpassungen.
3. Woche 3: Cleanup (Dependencies entfernen), Tests, QA.
