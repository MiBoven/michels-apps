# Michels Apps

Hub app for the michels.world suite. Shows every app in the suite as a card — search, favorite, and reorder them — with a live version badge (Alpha/Beta) and an offline indicator per app.

## Features

- **Search** across name, subtitle and description.
- **Sort**: Alphabetical (default) or Custom — drag cards to reorder in Custom mode; order is saved locally.
- **Favorites**: star a card to pin it in its own section at the top. Saved locally.
- **Icons**: each card tries to load `{app-url}/icon-192.png` from the live app; if that fails, a random-but-consistent placeholder emoji is shown instead.
- **Badges**:
  - `Alpha` — version `0.0.x`
  - `Beta` — version `0.x.x` (x > 0)
  - no badge — version `1.0.0` or higher
  - `Offline` — the app didn't respond to a reachability check within 4.5s (overrides the version badge)

## Updating the app list

Edit `apps.json`. Each entry:

```json
{
  "id": "unique-id",
  "name": "Display Name",
  "subtitle": "Short tagline",
  "description": "One-line description",
  "url": "https://sub.michels.world",
  "version": "0.3.0"
}
```

**Note:** version numbers are only filled in for Scanager (0.3.0), Read it Out (0.1.0) and QR Anything (0.1.0), taken from what's currently known — all other apps have `"version": null` (no badge shown) until the real numbers are added. The URL for Read it Out (`readitout.michels.world`) is also a guess based on the naming pattern and should be double-checked.

## Changelog

### 0.2.0 — 2026-09-21 — Add QR Anything
- Added QR Anything (qr.michels.world) to the app list

### 0.1.1 — 2026-09-12 — Real logo and favicon set
- Replaced placeholder icons with the final logo and favicon set
- Logo now also shown in the About modal

### 0.1.0 — 2026-09-12 — Initial release
- Card grid of all suite apps with search, favorites, and custom drag-and-drop ordering
- Live icon fetch from each app with playful placeholder fallback
- Version badges (Alpha/Beta) and reachability-based Offline badge
- Dark mode (default), fullscreen toggle, Settings (reset favorites/order) and About modal
- PWA/offline support (manifest, service worker, install icons)
