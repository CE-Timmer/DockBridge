# DockBridge

### This extension is made trough editing the Spotify extension `spicy-lyrics` by spikerko.

### full credits to spikerko for allowing me to do this

`DockBridge` is a standalone Spicetify extension package built to feed rich playback and lyric data into `SpotifyDock`.

It keeps the Spicy Lyrics core pipeline available for lyric state, timing, and metadata capture, but removes the user-openable UI lifecycle so it can run quietly beside the original Spicy Lyrics extension.

Important:

- standalone package: yes
- original Spicy Lyrics dependency: optional
- runs with `dockbridge.js` alone, or beside original `spicy-lyrics`

## What It Does

- streams current track metadata to SpotifyDock
- streams synced lyric lines and timing data
- preserves singer-side alignment data when available
- recovers from the bad `lyrics: []` + `noLyrics: false` state by retrying the internal lyric fetch/apply flow
- coexists with the original `spicy-lyrics.mjs` by using DockBridge-specific globals, storage keys, DOM ids, styles, and modal tags

## Intended Setup

You can run either:

1. `DockBridge` only
2. `DockBridge` + original `Spicy Lyrics`

Behavior:

- `DockBridge` always provides the stream payloads for SpotifyDock
- original Spicy Lyrics is optional if you also want its page/buttons/renderer UI

## Installation

### 1. Optional: install original Spicy Lyrics

Install the original extension only if you want its UI inside Spotify (page/buttons/renderer), for example through Spicetify Marketplace or `spicy-lyrics.mjs` setup.

Original project:
- https://github.com/Spikerko/spicy-lyrics

### 2. Install DockBridge (required)

#### Option A: Download from Releases

1. Open the repository Releases page
2. Download the latest `dockbridge.js` release asset
3. Copy it into your Spicetify extensions folder by running:

```powershell
spicetify config-dir
```
and then opening the folder 
`extensions`

4. Add it to your Spicetify extensions list:

```powershell
spicetify config extensions "dockbridge.js"
```

If you are already using other extensions, append `dockbridge.js` to your existing list instead of replacing everything.

5. Apply and restart Spotify:

```powershell
spicetify apply
```

#### Option B: Build from source

1. Build this repo:

```powershell
npm install
npm run build
```

2. Copy the built extension to your Spicetify extensions folder:

```powershell
Copy-Item .\dist\dockbridge.js "$env:APPDATA\spicetify\Extensions\dockbridge.js" -Force
```

3. Add it to your Spicetify extensions list:

```powershell
spicetify config extensions "dockbridge.js"
```

If you are already using other extensions, append `dockbridge.js` to your existing list instead of replacing everything.

4. Apply and restart Spotify:

```powershell
spicetify apply
```

## Usage With SpotifyDock

In `SpotifyDock`:

1. Open Settings
2. Set `Lyrics Source` to `DockBridge`
3. (Optional) Keep original Spicy Lyrics enabled if you also use its UI
4. Keep `dockbridge.js` enabled

DockBridge will then provide the payloads SpotifyDock needs.

## Development

### Build

```powershell
npm run build
```

Output:

- [dist/dockbridge.js](./dist/dockbridge.js)

### Dev

```powershell
npm run dev
```

## Notes On Coexistence

This repo was adapted specifically so it can sit beside original Spicy Lyrics more safely.

DockBridge now uses its own:

- runtime globals
- metadata scope
- storage prefix
- cache prefix
- page ids
- style ids
- sidebar body class
- modal custom element tag

It also disables its own page/fullscreen/popup/sidebar UI lifecycle, so the original Spicy Lyrics buttons and pages stay how they are.
## Attribution

This project is built on top of the original Spicy Lyrics codebase by **Spikerko**.

Please support the original project here:

- https://github.com/Spikerko/spicy-lyrics

Original project preview:

![Spicy Lyrics Preview](./previews/page.gif)

## License

This repository keeps the same license as the original Spicy Lyrics project.

See:

- [LICENSE](./LICENSE)
