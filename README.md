# JPG75 is Enough

A tiny, privacy-friendly web app that converts images to JPG at a reduced quality — entirely in your browser. No files are ever uploaded to a server.

**Live at:** [jpg75.michels.world](https://jpg75.michels.world)

## Features

- **Header** in the style of the other apps in the suite: app logo + bold title top-left with a short subtitle below, Vollbild (fullscreen) / Darkmode / ⋮-menu icons top-right. Clicking the logo/title area returns to the top of the page (kept consistent with the other apps in the suite, even though this one has no separate home view). The ⋮-menu currently only holds "About" (name, version, short description, privacy note).
- Select or drag & drop one or multiple images (any browser-supported image format: PNG, WEBP, GIF, BMP, JPG, ...), or paste directly from the clipboard — e.g. a Windows screenshot copied via Snipping Tool / Win+Shift+S:
  - **Desktop:** Ctrl+V / Cmd+V anywhere on the page
  - **Mobile:** a dedicated "Paste image from clipboard" button (Ctrl+V has no mobile equivalent), e.g. after using "Copy to clipboard" on an Android screenshot's share sheet
- **Bilder / Dateien** toggle above the picker (default: **Bilder**), shown only on touch devices since it addresses an Android-specific picker quirk and isn't relevant on desktop:
  - **Bilder** uses the OS photo picker — quick to browse, but on Android the original file name is not preserved (the OS gives the browser an anonymized temporary name instead)
  - **Dateien** opens the regular file browser instead — slower to navigate, but keeps the real file name if you pick it from "Files"/"My Files" rather than "Google Photos"
- All selected images are converted to `.jpg`
- Adjustable JPEG quality (default: 75%) — changing the slider **after** images are already converted re-encodes them in place at the new quality, instead of only affecting images added afterward
- Optional renaming — only applied if "Rename files" is checked **and** the pattern field isn't empty; otherwise the original file name is kept (with `.jpg` as the extension, since the file is always converted)
  - a plain custom name, or
  - a pattern with placeholders (tap the **i** button in the app for the full legend), or
  - a ready-made preset picked from the dropdown (`DSC_$Y$M$D_$h$m$s`, `S23_$Y$M$D_$h$m$s`, `*_smalled`)

    | Placeholder | Meaning |
    |---|---|
    | `#` (repeatable) | Sequential number, padded to the number of `#` used (`#####` → `00042`) |
    | `*` | Original file name (without extension) |
    | `$Y` `$M` `$D` | Year / month / day the photo was taken (EXIF capture date), falling back to the file's last-modified date if no EXIF data is present |
    | `$h` `$m` `$s` | Hour / minute / second, same source |
    | `$Q` | The JPEG quality used for that image (e.g. `75`) |

    Example: `*_$Q` → `picture.png` at 75% quality becomes `picture_75.jpg`
- Names update live in the list as you change the rename pattern
- If a rename pattern produces the same name for multiple images (e.g. no `#` counter and two photos taken close together), **every** image in that group is numbered chronologically — `_1`, `_2`, ... inserted before `.jpg` — using millisecond-precision EXIF capture time where available
- Remove individual images from the list, or clear the whole list at once with **Clear all**
- You're warned before an accidental page reload or navigation throws away unsaved progress
- Download buttons ("Download all" / "Download all as ZIP") sit above the file list; images are converted **one at a time** using `createImageBitmap` and small real thumbnails, so large batches (hundreds of photos) don't run out of memory on mobile
- Dark mode by default, with a light mode toggle
- Mobile-first layout — designed to be used from a phone
- 100% client-side: no backend, no analytics, no image ever leaves the device
- Original EXIF metadata (capture date, camera model, ISO, aperture, GPS, etc.) is preserved through the JPG conversion when the source file has it — re-encoding via `canvas` normally strips all of this
- Photo **orientation** is preserved correctly: the image is decoded with EXIF orientation already applied, and the copied-back orientation tag is reset to "normal" so viewers don't rotate an already-correct image a second time
- **Export as other format** *(accessible via the ⋮-menu → "Export", closable with the × in its corner)*: convert the already-processed image (i.e. after the main Quality setting has been applied) to **PNG** or **WebP** instead
  - **PNG** supports a simple color-key transparency: pick a color and a tolerance (default 15%; 0% = exact match only)
  - **WebP** reuses the main Quality slider — no separate quality control
  - Available via "Export all" / "Export all as ZIP" — the regular "Save" / "Download all" buttons always produce JPG
- **Quality**, the export **transparent color**, and export **tolerance** are remembered across visits (`localStorage`); clicking a setting's label resets it to the default, shown with a small **•** marker whenever it's been changed from default
- Tapping an item in the list expands it in place, showing the full converted image without needing to scroll — no popup/modal. Opening another item closes the previous one automatically
- **Resize images** *(optional, between Quality and Rename files)*:
  - Whenever every loaded image shares the same resolution (or only one is loaded), that size is shown live and used as the basis for every preview below
  - **Percent** mode: a 5%-step slider from 10–300%, plus a precise number field for exact values in between; shows the resulting pixel size live
  - **Pixel** mode: width and/or height, pre-filled as a placeholder with the current image size; with **Keep aspect ratio** on, editing one side live-updates the other to match; with it off and both sides filled, choose **Zoom (crop)** to fill the exact box, or **Fit** to keep the whole image with the border filled in **White**, **Anthracite**, or a **blurred** copy of the image itself
  - **Preset** mode: photo print sizes (with a selectable **DPI** — 72/150/300/600, default 300), pure aspect ratios (computed from each image's own resolution), fixed video/screen sizes, and social media formats — all sharing the same Zoom/Fit + border-fill choice as Pixel mode
  - Changing any resize setting re-encodes already-converted images in place, same as Quality
- **Rotate, rename, and reset — per image**: expand an item in the list to rotate it 90° at a time (confirmed with a toast), give it a custom name that's optionally **locked** so the "Rename files" pattern never overwrites it, or reset that one image's rotation and custom name back to default
- **Reset all**: restores Quality, Resize, Rename, and Export settings (and every image's rotation and per-image name override) back to their defaults — the uploaded/converted images themselves stay in the list, unlike **Clear all**

## How it works

Each file is decoded with `createImageBitmap()` using `{ imageOrientation: 'from-image' }` (falling back to `FileReader` + `<img>` if unsupported) — both approaches normalize rotation according to the EXIF orientation tag, so the canvas always draws the image upright regardless of how the camera held it. The image is drawn onto an in-memory `<canvas>` at full resolution for the actual JPG output, and separately onto a small (≤64px) canvas for a lightweight list thumbnail — avoiding both the large base64 data URLs and the full-resolution `<img>` elements that previously caused out-of-memory crashes with large batches. Files are processed by a small worker pool of **3 at a time** — enough to be noticeably faster than one-by-one, without the memory/CPU overload that full parallel processing caused on mobile. Since re-encoding through `canvas.toBlob()` strips all metadata, the app separately reads the raw EXIF (APP1) segment out of the original JPEG's bytes and splices it back into the newly encoded file, resetting the copied Orientation tag to "normal" first (since the pixels are already upright), so capture date, camera info, etc. survive the compression without a double-rotation. The resulting JPGs are offered as direct downloads via `URL.createObjectURL`, or bundled into a ZIP using [JSZip](https://stuk.github.io/jszip/) (loaded from a CDN).

## Files

- `index.html` — markup and app logic
- `style.css` — all styling
- `logo.png` — app logo shown in the header
- `netlify.toml` — base security headers for deployment (optional)
- Push all files to the repo root; `index.html` links to `style.css` and `logo.png` with relative paths

## Favicon

`index.html` already references these files at the repo root (add them yourself — they aren't included):

- `favicon.ico`
- `favicon-16x16.png`
- `favicon-32x32.png`
- `apple-touch-icon.png` (180×180, used for "Add to Home Screen" on iOS)

If any file is missing, browsers just silently skip it — nothing breaks, you'll just see a generic icon until they're added.

## Browser support

Works in all modern browsers (Chrome, Safari, Firefox, Edge). Formats not natively decodable by the browser's `<img>`/`<canvas>` (e.g. HEIC in most non-Safari browsers) cannot be converted. EXIF capture-date reading for the `$Y`/`$M`/`$D`/`$h`/`$m`/`$s` placeholders, and EXIF preservation in general, only works on JPEG source files that contain EXIF metadata; other formats and JPEGs without EXIF data use the file's last-modified date instead and won't have metadata to preserve.

## Changelog

### 1.7.0 — 2026-09-17 — Inline item panel, live resize preview, DPI choice
- Replaced the modal-based enlarged preview with an **inline expandable panel** per list item — tapping an item expands it in place (no popup, no scrolling needed to see the whole image); opening another item closes the previous one
- That panel now also has **Rotate**, **Rename** (with an optional lock so "Rename files" never overwrites that image's name), and **Reset** (clears the custom name and rotation for just that image) actions
- Resize's Percent slider now moves in **5% steps**, with a precise number field alongside it for exact in-between values
- Added a **DPI** dropdown (72/150/300/600, default 300) for the Preset mode's photo-print sizes, instead of a fixed 300 DPI
- When every loaded image shares one resolution (or only one is loaded), that size is now shown live and used to preview the resulting pixel size for Percent, Pixel (as field placeholders, with live width/height sync when the ratio is locked), and Preset modes
- **Reset all** now also clears every image's custom name/lock, not just its rotation

### 1.6.0 — 2026-09-07 — Resize presets (photo prints, ratios, social media)
- Added a third Resize mode, **Preset**, alongside Percent and Pixel:
  - Photo print sizes in cm (9×13 through 20×30, plus DIN A4), converted to pixels at 300 DPI
  - Pure aspect ratios (1:1, 3:4, 4:3, 9:16, 16:9) with no fixed size — the target box is computed from each image's own resolution, cropped to the largest inscribed box of that ratio, or fitted into the smallest box that fully contains it, depending on the Zoom/Fit choice
  - Fixed video/screen sizes (HD, Full HD, UHD/4K) and common social media formats (Instagram Post/Portrait/Story, Facebook/LinkedIn Post)
  - Reuses the same Zoom (crop) / Fit (white, anthracite, or blurred border) controls already used by the Pixel mode

### 1.5.0 — 2026-09-07 — Resize, rotate, and reset all
- Added a **Resize images** card between Quality and Rename files: percent scaling (10–300%) or exact pixel dimensions, with a "Keep aspect ratio" toggle; when it's off and a fixed box doesn't match the source ratio, choose to crop-to-fill or fit-with-border (white, anthracite, or a blurred copy of the image as the border fill)
- Added per-image **rotation**: tap a thumbnail to enlarge it, then tap the enlarged image to rotate 90° (confirmed with a toast notification)
- Added a **Reset all** button next to Clear all: resets every setting (Quality, Resize, Rename, Export, and each image's rotation) to default, without removing the uploaded images themselves
- Refactored the image pipeline: resize, rotation, JPEG encoding, and EXIF re-insertion now share one function, always re-decoding from the original file rather than compounding loss on a previous JPG output — used for the initial conversion, live re-encodes, and rotation alike
- The list thumbnail is now generated from the same (resized/rotated) output as the actual file, so it stays visually in sync
- Fixed a memory-leak edge case: removing an image after it had been re-encoded (via Quality/Resize/Rotate changes) previously revoked its original, already-stale blob URL instead of the current one

### 1.4.0 — 2026-09-07 — Paste images from clipboard
- Images can now be pasted directly from the clipboard — e.g. a Windows screenshot copied via Snipping Tool, or an Android screenshot's "Copy to clipboard" share option — and are processed exactly like a normal file selection
- **Desktop:** Ctrl+V / Cmd+V anywhere on the page, plus a short hint below the picker (hidden on touch devices)
- **Mobile:** a dedicated "Paste image from clipboard" button, since there's no keyboard shortcut equivalent — uses the async Clipboard API, which requires the tap as an explicit permission gesture

### 1.3.0 — 2026-09-06 — Export moved to menu, settings persistence, enlarge preview
- The **Export** section is no longer always visible — it now opens via the ⋮-menu ("Export"), appears under "Rename files" as before, and can be closed again with an × in its top-right corner
- The three settings cards (Quality, Rename files, Export) now have distinct HTML ids, making them easier to reference individually
- Removed the "(optional)" label next to "Export as other format"
- Renamed the export tagline to "JPG is not always enough!"
- WebP export no longer has its own quality slider — it now reuses the main Quality slider
- Tolerance default changed from 0% to 15%
- Quality, export transparent color, and export tolerance are now saved in `localStorage` and restored on reload; clicking a setting's label resets it to default, with a small **•** marker shown when a value differs from default
- Clicking a thumbnail in the list now opens an enlarged preview, making it easier to pick a transparency color from the image

### 1.2.0 — 2026-09-06 — Explanatory intro text, home reload, PNG/WebP export
- Added a short intro paragraph explaining what the app does, since the subtitle in the header is now just a tagline
- Clicking the logo/title in the header now reloads the page (triggering the unsaved-progress warning if applicable), instead of just scrolling to the top
- Added an optional **Export as other format** section: re-packages the already-processed JPG output as **PNG** (with simple color-key transparency: pick a color + tolerance) or **WebP** (own quality slider) — kept separate from the main "Save"/"Download all" flow, which always stays JPG

### 1.1.1 — 2026-09-06 — Logo in header, shorter subtitle
- Added the app logo next to the title in the header; clicking the logo/title scrolls back to the top, matching the "brand as home link" convention used across the app suite
- Subtitle shortened to "And enough is enough."

### 1.1.0 — 2026-09-06 — Header/menu redesign, orientation fix, live re-encode
- New header matching the rest of the app suite: brand block top-left, Vollbild (fullscreen) / Darkmode / ⋮-menu icons top-right; the menu currently holds only "About"
- Fixed photo **orientation** being lost/flipped after conversion: images now decode with `imageOrientation: 'from-image'` for consistent rotation handling, and the copied-back EXIF Orientation tag is reset to "normal" so viewers don't rotate an already-correct image a second time
- Changing the **quality slider** after images are already converted now re-encodes them in place at the new quality, instead of only affecting images added afterward
- The **Bilder / Dateien** toggle is now hidden on devices with a precise pointer (desktop mouse/trackpad), since it only addresses an Android touch-picker quirk

### 1.0.12 — 2026-08-08 — Extract CSS into style.css
- Moved all CSS out of the inline `<style>` block into a separate `style.css` file

### 1.0.11 — 2026-08-08 — Preserve EXIF metadata through conversion
- EXIF metadata (capture date, camera model, ISO, aperture, GPS, etc.) is now preserved through conversion for JPEG sources that have it — previously `canvas.toBlob()` silently stripped all of it, so converted photos looked like they had no metadata or the wrong date in tools like Google Photos

### 1.0.10 — 2026-08-08 — Limited concurrency, favicon links
- Images are now processed with limited concurrency (3 at a time) instead of strictly one-by-one, speeding up large batches while staying within safe memory limits
- Added favicon references (`favicon.ico`, 16×16, 32×32, and an Apple touch icon) to `index.html` — see [Favicon](#favicon) below for what files to add

### 1.0.9 — 2026-08-08 — Fix out-of-memory crash, clear-all, dedupe all
- Fixed out-of-memory crashes when selecting large batches (e.g. 300 photos): images now decode via `createImageBitmap()` instead of base64 data URLs, and the list shows a small real thumbnail (≤64px) instead of the full-resolution image, cutting per-image memory use from several MB to a few KB
- Added a **Clear all** button to reset the whole list at once, instead of removing images one by one
- Added a warning before an accidental reload/navigation discards unsaved progress
- Duplicate-name numbering now applies to **every** image sharing a name (not just the ones after the first), and uses millisecond-precision EXIF capture time (`SubSecTimeOriginal`) when available so photos taken within the same second still sort correctly

### 1.0.8 — 2026-08-08 — Fix hint spacing, dedupe rename clashes
- Fixed the "Processing X of Y…" indicator overlapping the download buttons, and added spacing between the buttons and the file list below them
- Duplicate file names (e.g. from a rename pattern without a `#` counter) are now automatically numbered — `_1`, `_2`, ... — ordered chronologically by capture/file date instead of colliding

### 1.0.7 — 2026-08-07 — Sequential processing, buttons above list
- Images are now processed **sequentially** instead of all in parallel — fixes freezes/timeouts on Android when selecting many photos at once, caused by decoding and re-encoding several full-resolution images simultaneously
- A "Processing X of Y…" hint is shown while a batch is being converted
- Moved the "Download all" and "Download all as ZIP" buttons above the file list instead of below it

### 1.0.6 — 2026-08-01 — Add Bilder/Dateien source toggle
- Added a **Bilder / Dateien** toggle (default: Bilder) above the picker. "Dateien" switches the file input's `accept` attribute to `*/*`, which makes Android open its regular file browser (Storage Access Framework) instead of the anonymized photo picker — preserving real file names when picked from "Files"/"My Files"
- Non-image files selected in "Dateien" mode are ignored with a notice, same as before

### 1.0.5 — 2026-08-01 — Presets dropdown, lowercase time placeholders, $Q
- Renaming now only applies if "Rename files" is checked **and** the pattern field isn't empty; otherwise the original name is kept (as `name.jpg`)
- Removed the hover/long-press tooltip for the original name — no longer needed given the rule above
- Rename placeholders `$H`/`$N`/`$S` renamed to `$h`/`$m`/`$s`
- Added a `$Q` placeholder for the JPEG quality used
- Added a preset dropdown with ready-made patterns: `DSC_$Y$M$D_$h$m$s`, `S23_$Y$M$D_$h$m$s`, `*_smalled`
- Example numbers in the app now use `00042` instead of `00032`

### 1.0.4 — 2026-08-01 — Fix tooltip clipping, EXIF/file date for patterns
- Fixed the original-name tooltip being clipped/truncated by a CSS `overflow: hidden` on the wrong element, which made it display incorrectly
- Added a native hover tooltip (desktop) via the `title` attribute as a fallback alongside the custom tooltip
- `$Y` `$M` `$D` `$H` `$N` `$S` in rename patterns now use each photo's EXIF capture date/time when available (JPEGs only), falling back to the file's last-modified date otherwise — instead of always using the current time

### 1.0.3 — 2026-08-01 — Drop folder field, tooltip, live renaming
- Removed the unused folder name field and `$P` placeholder (no real folder access is possible from a mobile file picker)
- File list now shows only the new file name; hover (desktop) or long-press (mobile) reveals the original name as a tooltip
- File names in the list now update live when the rename pattern is changed, without reprocessing the images

### 1.0.2 — 2026-08-01 — Remove images individually, download-all
- Images can now be removed from the list individually
- Added a "Download all" button for separate files, in addition to the existing "Download all as ZIP" option

### 1.0.1 — 2026-08-01 — Show original filename in the list
- Original filename is now shown alongside the converted name in the file list

### 1.0.0 — 2026-08-01 — Initial release
- Initial release
