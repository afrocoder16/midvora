# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Midvora Website** is a marketing website for a Midwest-based web design agency (MN, SD, ND) targeting local businesses (restaurants, salons, contractors, gyms, retail). The site features a 3D animated hero, scroll-triggered GSAP animations, a sample-breakdown showcase, and a sample-request form.

**Stack:** Astro 6.3.3 · Tailwind CSS 4.3 · TypeScript (strict) · GSAP 3.12.5 (CDN) · Three.js r128 (CDN) · Node 22.12+

## Commands

```bash
npm run dev        # Dev server at localhost:4321 (hot reload)
npm run build      # Production build → ./dist/
npm run preview    # Serve ./dist/ locally
npm run astro -- --help  # Astro CLI help
```

No test suite configured. No linter config file (Astro's built-in TypeScript checking only).

## Architecture

### Routing
File-based via `src/pages/`. `.astro` → HTML page; `.ts` → API endpoint.

Current pages:
- `/` — `index.astro` (fully built, ~370 lines of markup + inline scripts)
- `/services`, `/work`, `/about`, `/contact` — "Coming Soon" placeholders
- `/api/sample-request` (POST) — form handler stub (logs to console; Resend integration is TODO)

### Layout & Components
- `src/layouts/BaseLayout.astro` — wraps every page with Nav + `<slot>` + Footer
- `src/components/Nav.astro` — sticky header, mobile hamburger
- `src/components/Footer.astro` — 3-column footer
- No component-scoped CSS — all styling via Tailwind utility classes

### Styling / Design System
Custom theme variables defined in `src/styles/global.css` under `@theme {}`:
- **Colors:** Navy `#0A1628` · Blue `#031e4a` · Orange `#F96B2B` · Cream `#F8F6F2`
- **Fonts:** Inter Tight (body), Oswald (display/headlines) — loaded from Google Fonts in BaseLayout
- **Radius:** `pill` (9999px), `card` (16px)

Brand colors are also hardcoded as Tailwind arbitrary values (`bg-[#0A1628]`, `text-[#F96B2B]`) throughout pages. To rename a color, update `global.css` **and** search/replace the hex values across the codebase.

### index.astro — Section Order & Key Details

1. **Hero** — `min-h-screen flex items-center`, text left / Three.js canvas right. Canvas wrapper has `overflow:visible` to prevent node clipping.
2. **Marquee strip** — infinite CSS `@keyframes marquee` scroll of trust copy; pure CSS, no JS.
3. **Stats bar** (`#stats-section`) — `.stat-counter` elements with `data-target` / `data-suffix`; count-up triggered by GSAP ScrollTrigger `onEnter`.
4. **How It Works** (`#steps-grid`) — 3 cards with a decorative connector line on desktop.
5. **Honest Pitch** — editorial split layout with sticky heading on desktop and GSAP slide-in for `.pitch-item` rows.
6. **Sample Breakdown** (`#sample-breakdown`) — dark showcase section with a browser-style preview, floating proof badges, four deliverable cards, and factual proof chips.
7. **Pricing** (`#pricing-grid`) — inline `background: linear-gradient(to bottom, #E0EEFF 0%, #ffffff 100%)` on the section. Growth card is dark-navy inverted; floats with `scale-[1.03]`.
8. **Who We Serve** (`#industry-grid`) — dark navy background. `.industry-card:hover` rules in `<style is:inline>` set a blue tint fill and flip `.industry-icon` stroke to orange.
9. **Trust Badges** — static grid, GSAP fade-up on scroll.
10. **CTA Banner** (`#cta-banner`) — dark navy with radial glow blobs; form submits to `/api/sample-request`.

### Animations — Critical Patterns

All scripts are `is:inline` (embedded in HTML, not bundled). GSAP and Three.js load from CDN **after** `</BaseLayout>`.

**Stats counter (correct pattern):**
```js
var obj = { val: 0 };
gsap.to(obj, { val: target, duration: 1.8, ease: 'power2.out',
  onUpdate: function () { el.textContent = Math.round(obj.val) + suffix; }
});
```
Do not use `gsap.fromTo({val:0}, {val:target}, ...)` — the tween object must be declared first and passed as the target.

**Three.js canvas — no clipping:**
- Spread: `±5.5` world units, FOV 50°, camera Z=7
- Canvas wrapper: `style="overflow:visible"` on both the `<div>` and `<canvas>`

**Industry card hover — CSS-only (no JS):**
```css
.industry-card:hover { background: rgba(0,84,223,0.08); border-color: rgba(0,84,223,0.25); }
.industry-card:hover .industry-icon { stroke: #F96B2B; }
```
Inline `style` attributes on SVGs set `stroke` directly (not via Tailwind classes) so the CSS override works.

### Adding a New Page
1. Create `src/pages/yourpage.astro`
2. Wrap with `BaseLayout`: `<BaseLayout title="..."><section>...</section></BaseLayout>`
3. Route is auto-available at `/yourpage`
4. Load GSAP from CDN after `</BaseLayout>` using `<script is:inline src="...">` if animations are needed

## Phase Status

- **Phase 1 (done):** `index.astro` — fully animated landing page with all creative enhancements
- **Phase 2 (next):** Build out `/about`, `/contact`, `/services`, `/work`
- **Phase 3 (planned):** Wire Resend email into `src/pages/api/sample-request.ts`

## Deployment

Static output in `./dist/`. No server runtime required (except `/api/sample-request` needs SSR mode or a serverless adapter if email sending is added). `.env` and `.env.production` are gitignored.
