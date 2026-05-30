# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

> All commands must be run from the `ar-experience-builder-main` subdirectory (where `package.json` lives), not the parent folder.

```bash
npm run dev        # Dev server on port 8080
npm run build      # Production build
npm run build:dev  # Development mode build
npm run lint       # ESLint
npm run test       # Run tests once (Vitest)
npm run test:watch # Vitest watch mode
npm run preview    # Preview production build
```

## Critical: Vanilla JS Only

**The project uses plain HTML + JavaScript.** Despite React, shadcn/ui, and other framework dependencies in `package.json`, the actual implementation in `index.html` and `ar.html` is **vanilla JS only**. Do not write JSX, React components, or import npm modules in the HTML pages — they are not bundled by Vite at runtime.

## Architecture

This is a **dual-page web app** built with Vite. There are two independent entry points, each self-contained:

### `index.html` — Landing Page / AI Chat
- Vanilla JS inline scripts (no imports)
- AI text + voice chat powered by `src/js/aiChat.js`
- Audio recording via Web Audio API (`MediaRecorder`, `AnalyserNode`) with waveform visualization
- Sends messages/audio to an n8n webhook; receives text responses
- CSS: `src/css/index.css`

### `ar.html` — Augmented Reality Viewer
- 8th Wall XR engine (`/xr/xr.js`) handles camera feed and image target detection
- Three.js r134 (CDN) renders 3D video planes over detected targets
- AR pipeline logic lives in `src/js/arLogic.js`
- Loads AR targets (images + video URLs) from Supabase at runtime; falls back to hardcoded targets if DB fails
- Supports pinch-to-zoom on mobile
- CSS: `src/css/ar.css`

### Vite Build Config (`vite.config.ts`)
Multi-entry build — both HTML files are separate outputs. Path alias `@/` → `./src/`.

## Key Source Files

| File | Purpose |
|---|---|
| `src/js/arLogic.js` | Full AR pipeline: 8th Wall events, Three.js scene, target loading, video playback, zoom |
| `src/js/aiChat.js` | Chat UI, audio recording, waveform, n8n webhook communication |
| `src/css/index.css` | Landing page design tokens and styles |
| `src/css/ar.css` | AR page styles |

## External Services

**Supabase** — database + file storage
- Table `ar_targets`: `id`, `target_name`, `label`, `target_image_url`, `video_url`, `video_aspect`, `active` (bool), `target_properties` (JSON)
- Storage buckets: `targets` (PNG tracking images), `videos` (MP4 overlays)
- Credentials live in `.env` and are also inlined in `ar.html` for the client-side SDK

**n8n Webhook** — AI chat backend
- Receives JSON (text) or FormData (audio) from the landing page chat
- Endpoint hardcoded in `src/js/aiChat.js`

**8th Wall XR** — self-hosted at `/xr/xr.js`
- Handles camera permissions, SLAM, and image target events
- Must be loaded before any AR logic runs

## Performance

`ar.html` detects low-end devices via `navigator.hardwareConcurrency` and `navigator.deviceMemory` and adds `.perf-low` to `<body>`, which disables backdrop filters, animations, and heavy CSS effects.

## Custom Skills

Three domain-specific skills are available (invoke with the Skill tool):

- **`pipeline-ar-8thwall`** — camera, image detection, Three.js rendering, zoom, `ar.html` / `arLogic.js`
- **`chat-ai-n8n`** — chat UI, audio/voice, waveform, n8n webhook, `index.html` / `aiChat.js`
- **`supabase-ar-targets`** — DB queries, bucket uploads, `ar_targets` schema, admin auth
