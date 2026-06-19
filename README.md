# Artist Influence — Vendor Portal (Mockup)

A self-contained, single-file dashboard mockup demonstrating the Artist Influence
design system: dark glass-morphism on drifting oxblood light, one electric red
(#ED1C24) accent, Helvetica Neue / Inter / JetBrains Mono type, plus the full
interactive layer (card mouse-tilt, cursor dot, scroll reveals, ambient glow).

**Purpose:** this repo is the UI/UX reference for a new vendor-facing flow to be implemented
on top of an existing platform that already has the auth, routes, and backend to actualize the
intended functionality. The mockup is the design + interaction spec; the platform supplies the
data and behavior.

Sample data only — no backend, no auth, no network calls.

> **Implementing this?** Start with [`IMPLEMENTATION.md`](IMPLEMENTATION.md) — it maps every
> screen to a route, every data array to a contract, and every action to the backend endpoint it
> needs (including the Spotify-for-Artists ingestion and Friday payout batching that aren't
> obvious from the screens alone).

## Run it
The whole thing is `index.html`. Three options:
1. Double-click `index.html` — opens in any browser, no server.
2. `bun serve.js`  → http://127.0.0.1:8123
3. `python3 -m http.server 8123`  (or `npx serve`) from this folder.

## Stack
Pure HTML + CSS + vanilla JS. No build step, no dependencies.
Fonts load from CDN (Fontshare = Clash Display, Google Fonts = Inter + JetBrains Mono).
For production, self-host the woff2s instead of CDN.

## Where the design system lives
- CSS custom properties (`:root`) at the top of the `<style>` block = all color,
  type, shadow, radius, and motion tokens.
- Interactive behaviors (tilt / reveal / cursor / ambient) are in the `<script>`
  block near the bottom, clearly commented — copy these into any other dashboard.
