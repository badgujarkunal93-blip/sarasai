# Phase 5: Deep Focus & Client-Side Attention Tracking

> **Spec Reference:** [`SARAS_AI_MASTER_BLUEPRINT.md`](file:///c:/Users/kunal%20badgujar/Desktop/Projects/AILearningPlatform/AILearningPlatform/SARAS_AI_MASTER_BLUEPRINT.md) — Section 6.3

## 1. Objective
Implement privacy-first, on-device attention monitoring using client-side computer vision to auto-pause video playback upon cognitive drift without sending any video frames over the network.

## 2. Deliverables & File Manifest
- [x] `components/player/StrictModeDetector.tsx` — WebAssembly-based client-side face & attention detector
- [x] `app/focus/page.tsx` — Dedicated distraction-free workspace mode with focus stats
- [x] `app/api/attention/route.ts` — Logging endpoint for attention analytics (`looked_away`, `resumed`, `no_face`)

## 3. Privacy & Tracking Architecture
1. **100% Local Inference:** Video frames from `navigator.mediaDevices.getUserMedia` are analyzed on an HTML5 canvas in the browser. Zero image bytes leave the device.
2. **Grace Period:** 4–5 seconds of looking away or face absence allowed before auto-pausing.
3. **Auto-Pause & Overlay:** Pauses YouTube player and presents an editorial pause overlay: `"Paused — You looked away. Resume when ready."`
4. **Explicit Resume:** Resumes only upon user click or deliberate face re-detection.
5. **Graceful Degradation:** If camera permission is denied, strict mode disables cleanly while standard playback remains unaffected.

## 4. Acceptance Criteria
- Toggling Strict Mode prompts for camera permission with clear privacy explanation.
- Covering webcam or looking away for >4 seconds pauses player immediately.
- Attention events are logged in the `AttentionEvent` database table for user review.

## 5. Commit Checkpoint
```bash
git commit -m "feat(focus): implement client-side attention tracking, auto-pause drift overlay, and event logging"
```
