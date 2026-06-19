# Implementation Guide — Vendor Portal UI/UX Flow

This document is the handoff for implementing the mockup as a **real UI/UX flow on top of an
existing platform** that already has authentication, routes, and a backend. The mockup
(`index.html`) is a single-file, framework-free reference. Treat it as a **living spec**: every
`const` data array is a data contract, and every action function that ends in a `toast()` marks
where a real write endpoint must be wired.

> Sample data only — no backend, no auth, no network calls. Nothing here is production-ready as-is;
> it defines *what to build*, not *the build*.

---

## 1. Who the user is

A **vendor** (a playlist owner / curator, e.g. "Rhythm Wave Media") who works with Artist Influence
to deliver streams for label campaigns. The portal is their self-serve workspace. All data is scoped
to the authenticated vendor — every list, count, and payout below is "mine," never global.

---

## 2. Screens → routes

The mockup is a hand-rolled SPA: `route` state + a `go(id)` function + a `PAGES[route]()` render map
(`index.html` ~line 579). Map each to a real route in the host platform.

| Nav id | Screen | Purpose |
|---|---|---|
| `home` | Home | Action queue ("Needs Your Attention"), notification setup nudge, payout summary |
| `available` | Available Campaigns | Marketplace of open campaigns the vendor can offer on + **Direct Allocations** pitched to them |
| `offers` | My Offers | Offers the vendor submitted, with status lifecycle |
| `active` | My Active Campaigns | Accepted campaigns in delivery, with pacing vs. projection |
| `playlists` | My Playlists | Vendor's Spotify playlists, performance, and SFA access state |
| `payments` | Payments | Friday payout cycle: upcoming batch, pending approval, history |
| `settings` | Settings | Vendor profile, notification preferences, payout details |

Modals (overlays, not routes): campaign detail, playlist detail, follower breakdown, payout-batch
detail, submit/adjust offer, add-playlists, message-the-team.

---

## 3. Data model (entities & key fields)

Lifted directly from the `const` arrays in `index.html` (~lines 476–541). Field names are the
mockup's; rename to match your schema, but preserve the **shape and the enums**.

### Campaign (marketplace) — `available`
`id, artist, song, genre, sub, tier ('t1'|'std'), need (target streams), window (days),
terr (territories), min (min streams a vendor may offer), deadline, release, note`

### Direct allocation — `directDeals`
A campaign pitched directly to this vendor. Same as above plus `propStreams` (proposed allocation)
and `propRate` (cost per 1,000 streams). Vendor can **accept** or **adjust**.

### Offer — `offers`
`id, artist, song, genre, offered (streams), rate ($/1k), accepted (streams granted | null),
payout ($ | null), status, release, note, date`
Status enum (`OFFER_STATUS`, line 553): `submitted · accepted · partial · notselected · expired ·
filled · cancelled`.

### Active campaign — `active`
`id, artist, song, genre, tier, release, accepted (committed streams), delivered (so far),
start, end, daysTotal, daysLeft, rate, reqDaily (required/day to hit target),
curDaily (current/day), status, pay ('pending'|'paid'), pls[]`
- `pls[]` = attached playlists carrying the campaign, each `{name, daily}` (daily stream contribution).
- Status enum (`STATUS`, line 552): `onpace · slightly · behind · critical · completed · sfa
  (awaiting SFA access)`.
- **Pacing** (`reqDaily`, `curDaily`, status) should be **server-computed**, not entered.

### Playlist — `playlists`
`id, name, owner, followers, avg (avg daily streams), total (lifetime), fol{d1,d7,d28}
(follower growth), genre, sub, terr, campaigns[] (names currently carried), sfa
('good'|'pending')`
`sfa` = whether Artist Influence has Spotify-for-Artists analytics access to this playlist.

### Payments
- `payHistory` — past Friday batches `{date, count, amount, status:'paid'}`
- `weeklyPay` — sparkline series `{w (week), a (amount)}`
- `approvedBatch` / `pendingBatch` — line items in the next/ pending batch
- A payout's lifecycle (`PAY_STATUS`, line 554): `projected → pending → approved → paid` (plus `hold`).

### Notifications — `notifs`
`{dot ('green'|'amber'|'red'), title, body, time, go (deep-link action)}`

### Vendor profile / settings
Captured in the Settings forms (~lines 1020–1110): profile fields, notification channels
(email / SMS / Slack / etc. with a **verify** step), payout methods (Zelle / Wire-ACH / others),
and out-of-office dates.

---

## 4. Actions → endpoints to wire

Each is a mockup function that currently just shows a `toast()`. These are the **writes** the
backend must expose.

| UI action | Mockup fn (line) | Backend operation |
|---|---|---|
| Submit an offer on an available campaign | `submitOffer` (1145) | `POST` offer `{campaignId, streams, rate, startDate?, playlistRefs?, notes?}` → returns offer in `submitted` |
| Adjust an existing offer | `openOffer(id, adjust)` (1116) | `PATCH` offer |
| Accept / adjust a direct allocation | `acceptAllocation` (1146) | `POST` accept `{allocationId, streams}` → creates an **active campaign** |
| Add playlists by Spotify URL | `openAddPlaylist` (1149) | `POST` playlists `{urls[]}` → triggers **SFA ingestion** (see §5) |
| Attach existing playlists to a campaign | `openAddPlaylist` w/ campaign | `POST` attachment `{campaignId, playlistIds[]}` → delivery can begin |
| Message the Artist Influence team about a campaign | `openMessage` (1174) | `POST` message `{campaignId, body}` |
| Save vendor profile | Settings (1042) | `PATCH` vendor profile |
| Save payout details | Settings (1057) | `PATCH` payout method (treat as **sensitive** — bank/Zelle) |
| Save notification preferences | Settings (1107) | `PATCH` notification prefs |
| Verify a notification channel | `chanCard` (1072) | `POST` channel verification (send code / confirm) |

**Reads** mirror the entities in §3: list available campaigns, list direct allocations, list my
offers, list my active campaigns (+ per-playlist daily contribution), list my playlists, get
payments summary + batches + history, list notifications.

---

## 5. Backend behaviors that aren't just CRUD

These are the parts most likely to be missed if you only read the screens:

1. **SFA (Spotify for Artists) auto-ingestion** — when a vendor pastes a playlist URL
   (`index.html` ~line 1166), the backend is expected to fetch and store: playlist name, genre,
   assumed territory (from songs + title/description language), follower count, and average daily
   streams. Dedupe by Spotify playlist ID. This is the single biggest integration; a playlist's
   `sfa` status (`pending → good`) reflects whether this access/ingest has completed.

2. **Pacing computation** — `reqDaily`, `curDaily`, and the campaign `status`
   (`onpace/slightly/behind/critical`) are derived from `accepted`, `delivered`, and the date
   window. Compute server-side on a schedule; the UI only displays.

3. **Friday payout batching** — payouts move `pending → approved → paid` and are grouped into a
   weekly (Friday) batch. The UI assumes a batch cadence and an approval gate that the vendor does
   not control.

4. **Payout math** — vendor earnings = `accepted / 1000 * rate` (see `payoutPill`, line 557).
   Whatever the real basis (committed vs. delivered streams), make it explicit and consistent;
   `pendingBatch` shows estimates against `basis`.

5. **The action queue ("Needs Your Attention")** — Home aggregates cross-entity urgency (critical
   campaigns, offers awaiting response, payout events). It's a computed feed, not a table.

6. **Notification deep-links** — each notification carries a target action (`openCampaign(...)`,
   `go('payments')`). Preserve deep-linkability when porting to real routes.

---

## 6. Design system (do not lose this in the port)

The whole point of the mockup is the look and feel. The tokens live in the `:root` CSS custom
properties at the top of the `<style>` block (color, type, shadow, radius, motion), and the
interactive layer (card mouse-tilt, cursor dot, scroll reveals, ambient glow) is in the `<script>`
block near the bottom, commented for lift-and-shift. Port these tokens and behaviors verbatim
rather than re-deriving them. Fonts are CDN-loaded for fidelity — **self-host the woff2s in
production** (Clash Display, Inter, JetBrains Mono).

---

## 7. Suggested implementation order

1. Stand up the **read** endpoints for the seven screens against the §3 shapes; render the screens
   with real data. (No writes yet — fastest path to "it's real.")
2. Wire **offers** (submit/adjust) and **direct allocation accept** — the core marketplace loop.
3. Wire **playlists**: manual add + **SFA ingestion** (§5.1) + campaign attachment.
4. Wire **Settings** (profile, payout, notification prefs + verification).
5. Layer in **server-computed** pacing (§5.2), the **action queue** (§5.5), and **notifications**.
6. Wire **Payments** last — it depends on payout math + the batch cycle being settled.
