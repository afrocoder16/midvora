# Midvora — First Light across the site

The approved homepage art direction now runs through Services, Work, About, Contact, and the 404 page: warm ivory, cobalt blue, amber, expressive serif accents, readable body text, and light, optional motion.

## Shared implementation

- `src/layouts/BaseLayout.astro`: self-hosted font, shared `SiteHeader` and `SiteFooter`, shared motion initialization.
- `src/styles/studio.css`: inner-page layouts, responsive rules, native CSS artwork.
- `src/components/StudioArt.astro`: dimensional design sheets, an open letter, and the 404 sculpture.
- `src/components/StudioCTA.astro`: rotating illustrated sun and shared invitation.
- `src/data/projects.ts`: preserved existing live and preview project data.
- `src/data/services.ts`: package, bundle, and custom estimate data.
- `src/components/PackageBuilder.astro`: native form controls, live totals, selection handoff.
- `src/scripts/contact.ts`: allowlisted selection reconstruction and Web3Forms submission with timeout, retry, and confirmation.

The current user-approved offer includes hosting, security, and weekly maintenance in website packages starting at $525. Existing smaller custom bases, extras, bundles, and premium service prices are retained. The old separate basic maintenance fee is superseded by the user's included-care instruction. Optional Full Care adds SEO, social, reviews, and Google Business Profile services.

All meaningful copy stays at full opacity during scroll effects. Loops pause offscreen and when the tab is hidden; the pause control and operating-system reduced-motion preference are honored. `?staticPreview` provides still review layouts. No custom pointer, GSAP, or Three.js is loaded.

## Scroll choreography

`src/scripts/scroll-art.ts` and `src/styles/scroll-art.css` add scroll-driven depth to the existing artwork: glass sculptures gently tilt, gallery prints fan apart, the process stationery unfolds, the paper plane follows a drawn flight path, and the contact letter lifts from its envelope. The Main Street illustration rises in layers. Section entrances and fine ink strokes carry the same motion through the rest of the page.

The browser retains native touch scrolling. Scroll artwork initializes on the first scroll so the opening screen loads first. One scheduled animation frame reads visible scene geometry together, then updates paused Web Animations playheads. Offscreen animation instances are released. There is no idle JavaScript render loop or animation dependency. Phone and coarse-pointer movement uses a smaller range; section entrances have no mobile stagger delay. Text never fades, and inquiry fields stay stationary. Pause freezes the scroll artwork, reduced motion restores the still composition, and hidden tabs suspend motion. Individual transforms compose with the existing art animations. Process illustrations have individual visibility observers; phones use simpler glass drift, crisp highlights and an opaque island header to avoid expensive blur layers.

Scroll review screenshots are saved as `qa-shots/scroll-*-enter.png` and `qa-shots/scroll-*-settled.png`. `qa-shots/scroll-check.mjs` checks artwork response, pause, reduced motion, native touch gestures, form input, overflow, and accessibility. `qa-shots/scroll-audit.mjs` checks mobile Lighthouse scores and scrolling with CPU throttling.

## New artwork

Final source: `src/assets/midvora-prairie-light.png`.
Created with the built-in imagegen tool, then copied into the workspace. Astro generates responsive AVIF/WebP images. The header continues to use the user's original logo, optimized at build time.

### Final generation prompt

Use case: stylized-concept. Asset type: bespoke hero artwork for the About page of Midvora, a Midwest website design studio, whose name means Midwest plus light. Create an extraordinary, minimal museum-quality CGI still life: a large vertical sun disc made of translucent luminous amber-orange cast glass, standing just behind a sculptural cobalt blue glass arc shaped like a low rolling prairie hill. A second shorter cobalt glass curved ridge in the foreground creates depth. This is a single striking architectural abstract sunrise sculpture, with luxurious thick optical glass edges, realistic amber and cobalt caustics pooling on a matte warm ivory surface. Shallow curved layers of cream paper contour terrain under the sculpture evoke the Midwestern prairie. Beautiful morning illumination, expressive refraction, delicate long shadows, physically believable jewel-like materials. Slightly elevated three-quarter view, square 1:1 composition, center the whole sculpture, object fills 75% of frame with quiet clear margins, soft uniformly warm off-white background #F7F6F2 to all edges, no visible horizon line or room. Palette: vivid cobalt #244CE5, warm amber-orange #ED6B3F, ivory #F7F6F2. Light, inviting and artful. The artwork is the subject, not a website mockup. No text, letters, logos, labels, UI, people, devices, watermark, extra objects, planets, dark background, or excessive ornament. Create a memorable impossible glass prairie sunrise with clear geometry and exceptional optical detail.

## Validation artifacts

Local, ignored artifacts are in `qa-shots/`:
- `site-report.json`: layout checks across 1440, 1024, 768, 390, 360, and 320 pixels; accessibility checks on desktop and phone; gallery interactions; package totals and contact handoff; mocked form error, success, and retry.
- `site-*-hero-*.png` and `site-*-*.png`: viewport and complete-page screenshots.
- `site-performance.json`: local Lighthouse mobile audits.

The contact tests intercept Web3Forms requests; no test inquiries are sent externally.
