# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Dev server on port 8080
npm run build      # Production build
npm run lint       # ESLint
npm run test       # Vitest (single run)
npm run test:watch # Vitest (watch mode)
npm run preview    # Preview production build locally
```

## Architecture

This is a **multi-page WebAR application** — not a traditional SPA. It has two independent entry points compiled by Vite:

- **`index.html`** — Landing page (vanilla HTML/CSS/JS). Animated brand page with navigation cards and an AI chat modal.
- **`ar.html`** — AR experience page (vanilla HTML/CSS/JS + Three.js + 8th Wall XR engine). The actual augmented reality camera view.

The `src/` directory contains a React/TypeScript layer (`src/app/ar/page.tsx`) used as a separate component, not as a shell for the above pages.

### AR Pipeline (ar.html + src/js/arLogic.js)

8th Wall XR fires three lifecycle events that drive everything:
- `reality.imagefound` → load video texture onto a Three.js mesh
- `reality.imageupdated` → track position/rotation updates
- `reality.imagelost` → pause video, hide mesh

AR targets and their associated videos are loaded at runtime from **Supabase** (`ar_targets` table), not bundled — so adding new targets requires only a database insert, no redeploy.

### AI Chat (index.html inline script)

Sends messages to an **n8n webhook** and plays back responses. Supports both text and audio (MP3) responses — the handler checks `content-type: audio/*` and renders a waveform player if the webhook returns binary audio. Uses Web Speech API (`pt-BR`) for voice input. Session ID is stored in `localStorage` for conversation continuity.

### Data Flow

```
Supabase (ar_targets table)
    ↓ fetched at AR page load
arLogic.js → 8th Wall XR → Three.js scene

User input (text/voice)
    ↓ POST to n8n webhook
index.html → audio/text response → waveform player or text bubble
```

## Key Configuration

- **Vite multi-entry**: both `index.html` and `ar.html` are declared as inputs in `vite.config.ts`
- **Path alias**: `@/` maps to `./src/`
- **TypeScript**: strict mode disabled, `noImplicitAny: false` — the JS files in `src/js/` are allowed via `allowJs: true`
- **Supabase credentials** are in `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` — these are intentionally public (frontend-only, RLS enforced on Supabase side)
- **Dev server port**: hardcoded to `8080` in `vite.config.ts`

## AR-Specific Constraints

- 8th Wall XR engine lives in `public/xr/` — do not modify or move it
- AR target images live in `public/targets/` — filenames must match `target_name` values in the Supabase table
- Video assets (`public/*.mp4`) are served from the public directory to avoid bundling large binaries
- Mobile Safari requires `playsInline` + `muted` on video elements before any user gesture; unmute only happens after a user interaction
- Low-end device detection in `arLogic.js` (CPU cores ≤ 4 or memory ≤ 3GB) disables backdrop filters and reduces Three.js quality — don't add heavy visual effects without guarding them behind this check

## UI Language

All user-facing text is in **Portuguese (pt-BR)**. Keep this consistent when adding or modifying UI strings.
