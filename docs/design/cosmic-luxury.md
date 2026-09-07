[← Volver al Índice de Tecnología](../technology/README.md)

> **Contexto en el monorepo (2026-09-05).** Este es el sistema visual que trae
> `apps/web` (migrado de Astrolegia v1) y que `packages/ui` expone como
> primitivas (`GlassCard`, `PageHeader`, `StatBadge`, `Toast`) y tokens
> (`cosmicLuxury`). Convive con la paleta declarada en
> [04-design-system.md](../technology/04-design-system.md) (Azul Medianoche /
> Púrpura Astral / Oro Celestial, serif para títulos) y con los componentes
> indigo/slate actuales de `packages/ui`: unificar la identidad visual es una
> decisión abierta entre socios, ver
> [ADR-0001](../technology/adr/0001-migracion-astrolegia-v1.md).

# Astrolegia Design System — "Cosmic Luxury"

> **LOGIC:** When building a specific page, first check `docs/design/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.
>
> **This document describes the system as implemented in `apps/web/src/app/globals.css`,
> `apps/web/tailwind.config.js` and `apps/web/src/app/layout.tsx`. Those files are the source of
> truth; keep this document in sync with them.**

---

**Project:** Astrolegia
**System name:** Cosmic Luxury
**Mood:** deep-space void, glassmorphism, neon aurora accents, premium/editorial
**Stack:** Next.js (App Router) + Tailwind 3 + framer-motion + lucide-react (`apps/web`); tokens in `packages/ui/src/tokens/cosmic-luxury.ts` (`cosmicLuxury` from `@astrolegia/ui`)

---

## 1. Color Palette

Dark-only system. The app lives on a near-black void; color arrives exclusively
through neon accents and glass surfaces. There is **no light mode**.

### Backgrounds

| Role | Hex | CSS Variable | Tailwind class | Usage |
|------|-----|--------------|----------------|-------|
| Pure Void | `#03030b` | `--bg-deep` | `bg-bg-deep` | Page/base background, canvas behind everything |
| Nebula | `#0a0a1f` | `--bg-nebula` | `bg-bg-nebula` | Slightly lifted surfaces, radial gradient stops |

### Accents

| Role | Hex | CSS Variable | Tailwind class | Semantic use |
|------|-----|--------------|----------------|--------------|
| Electric Magenta | `#d900ff` | `--accent-primary` | `bg/text/border-accent-primary` | Primary brand accent: active states, primary glows, gradient start |
| Azure Radiance | `#0088ff` | `--accent-secondary` | `…-accent-secondary` | Secondary accent: focus rings, links, info, gradient end, scrollbar thumbs, `::selection` |
| Starlight Gold | `#ffd700` | `--accent-gold` | `…-accent-gold` | Premium/highlight: scores, stars, special badges |
| Radical Red | `#ff0055` | `--accent-tertiary` | `…-accent-tertiary` | Intense emphasis, rare punch of heat |
| Danger | `#ff0055` | `--accent-danger` | `…-accent-danger` | Destructive/error states (semantic alias of Radical Red) |

All accents also exist as RGB-channel variables (`--accent-primary-rgb: 217 0 255`,
etc.). The Tailwind config maps colors as `rgb(var(--x-rgb) / <alpha-value>)`, so
**opacity modifiers work**: `bg-accent-primary/20`, `border-accent-primary/50`.
If you add a new token, add BOTH the hex variable and the `-rgb` triplet in
`globals.css`, plus the mapping in `apps/web/tailwind.config.js`.

### Text

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#ffffff` | `--text-primary` |
| Secondary (cosmic blue-grey) | `#a2a8d3` | `--text-secondary` |
| Muted | `#62668b` | `--text-muted` |

Utility-level equivalents used across pages: `text-white`, `text-white/60`,
`text-white/50`, `text-white/40` for descending hierarchy.

### Gradients & Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--gradient-aurora` | `linear-gradient(135deg, #d900ff 0%, #7209b7 50%, #0088ff 100%)` | Buttons, `.text-gradient`, hero headlines |
| `--gradient-glass` | white 5% → 0% vertical | Inner sheen of `.glass` (applied via `::before`) |
| `--shadow-neon` | magenta + azure glow | Hover glow on interactive cards |
| `--shadow-card` | `0 8px 32px rgba(0,0,0,0.5)` | Default card depth |

Tailwind gradient idiom used everywhere:
`bg-gradient-to-r from-accent-primary to-accent-secondary` (navbar active pill,
avatar rings, CTA highlights).

Violet family for particles/decoration (CosmicBackground): `#9d4edd`, `#7b2cbf`,
`#c77dff`, `#e0aaff`, plus cyan `#00b4d8`.

---

## 2. Typography

Fonts are loaded with **`next/font/google` in `apps/web/src/app/layout.tsx`** and exposed
as CSS variables on `<html>` (on `<body>` they arrive too late and the font falls back to serif):

- `--font-inter` → **Inter** (body)
- `--font-space-grotesk` → **Space Grotesk** (headings)

`globals.css` consumes them — never reference font families by literal name
alone, always through the variables:

```css
--font-main: var(--font-inter), 'Inter', system-ui, -apple-system, sans-serif;
--font-heading: var(--font-space-grotesk), 'Space Grotesk', sans-serif;
```

**Do not add `@import url(...)` font loading.** next/font self-hosts and
eliminates layout shift.

### Hierarchy

| Element | Font | Treatment |
|---------|------|-----------|
| `h1` | Space Grotesk 700 | 3.5rem, line-height 1.1, letter-spacing −0.03em |
| `h2` | Space Grotesk 700 | 2.5rem, line-height 1.2 |
| `h3` | Space Grotesk 700 | 1.75rem, line-height 1.3 |
| Body / `p` | Inter | 1.05rem, `--text-secondary`, line-height 1.7 |
| Field labels / eyebrows | Inter | `text-xs font-bold uppercase tracking-wider text-white/50` |

Hero headlines may use `.text-gradient` (aurora gradient clipped to text).
Tailwind aliases: `font-sans` → `--font-main`, `font-heading` → `--font-heading`
(also `font-dna-heading` / `font-dna-body`, which alias the same pair for the
Visual Genome section).

---

## 3. Surfaces — Glassmorphism

The signature surface is `.glass` (defined in `globals.css`):

- background `rgba(10, 10, 20, 0.6)` + `backdrop-filter: blur(20px)`
- border `1px solid rgba(255, 255, 255, 0.12)` (`--glass-border`)
- `border-radius: 24px`, shadow `--shadow-card`
- inner sheen via `::before` with `--gradient-glass`
- hover: border brightens to `rgba(255,255,255,0.2)` — **no movement**

`.glass-hover` is the opt-in lift for interactive cards: `translateY(-2px)` +
neon shadow on hover. Never put layout-shifting hovers on static content.

Common composition (see `GlassCard` in `packages/ui/src/cosmic/GlassCard.tsx`, exported by `@astrolegia/ui`):

```tsx
<div className="glass p-6 md:p-8 border border-white/5 bg-[#0a0514]/80">…</div>
```

Other surface layers: `.bg-stars` (fixed radial void backdrop), `.bg-stars-local`
(card-local nebula), `.bg-noise` (SVG fractal noise at 5% opacity),
`.aurora-mesh` (animated triple radial-gradient aurora, 12s alternate loop).

Radii scale: pills `rounded-full` / `100px` (buttons, nav items), cards `24px`
(`.glass`), inputs `16px` (`.input-field`), nested panels `rounded-xl` (12–14px).

---

## 4. Component Patterns

### Buttons
- **Primary:** `.btn-primary` — aurora gradient pill, uppercase, letter-spacing
  0.05em, magenta glow shadow, continuous 3s `shimmer` background sweep; hover
  lifts 2px and shifts glow to azure.
- **Ghost/secondary:** transparent + `border-white/10` + `hover:bg-white/10`.

### Navbar
- Fixed, transparent at top → `bg-[#050511]/80 backdrop-blur-xl` after 20px
  scroll.
- Links live in a `bg-white/5` pill container; the **active item** is a pill
  with `bg-gradient-to-r from-accent-primary to-accent-secondary`.
- Logo (`AstrolegiaLogo`, next/image with `priority`) sits on a blurred
  `bg-accent-primary` halo that intensifies on hover.
- Hidden on `/` (landing has its own hero) — same for `CosmicBackground`.

### Forms
- `.input-field`: dark translucent, 16px radius; focus = azure border +
  `0 0 0 4px rgba(0,136,255,0.15)` ring. Labels use the uppercase-tracking
  eyebrow style (`FieldLabel`).

### Feedback
- Toasts: fixed bottom-right glass panel, `animate-fade-in-up`, lucide icon
  (`CheckCircle2` / `AlertTriangle`), never emojis.
- Loaders: lucide icon (e.g. `Loader2`, `Dna`) with Tailwind `animate-spin`,
  colored `text-[var(--accent-primary)]` or an accent class.

### Scroll areas
- Global scrollbar: 8px, dark thumb, azure on hover.
- Internal lists/chat/pickers: add `.custom-scrollbar` (8px, transparent track,
  azure rounded thumb).

---

## 5. Thematic Motifs

Decoration should always be cosmic, never generic:

- **Starfield** — `.bg-stars`, `.bg-stars-local`, canvas particles
  (`CosmicBackground`: 40 violet/cyan particles with proximity constellations
  and gentle mouse attraction).
- **Constellations** — thin connecting lines between points (opacity ≤ 0.12).
- **Orbits / rings** — circular strokes around avatars, scores, planets.
- **Lunar phases, zodiac glyphs** — iconography for astro data.
- **Aurora** — `.aurora-mesh` or the aurora gradient for hero moments.

---

## 6. Motion Rules

- **framer-motion is THE animation library.** Do not add gsap, animejs, lottie
  or any other. gsap was removed on purpose.
- Standard entrances: fade + slight rise. CSS utilities `animate-fade-in`
  (10px rise, 0.5s ease-out) and `animate-fade-in-up` (16px rise, 0.5s
  ease-out); stagger with `delay-100` / `delay-200` / `delay-300`
  (animation-delay helpers in `globals.css`).
- framer-motion idiom for overlays/menus:
  `initial={{ opacity: 0, y: 10, scale: 0.95 }} → animate={{ opacity: 1, y: 0, scale: 1 }}`
  with `AnimatePresence` for exits.
- Ambient loops (float 6s, pulse 4s, shimmer 3s, aurora 12s) must be slow and
  subtle — atmosphere, not distraction.
- **`prefers-reduced-motion: reduce` is mandatory** for every new animation:
  CSS loops are disabled in the global media block in `globals.css`; canvas
  animations render a static frame (see `CosmicBackground`); framer-motion
  animations should use `useReducedMotion()` or tolerate `animation: none`.
- Canvas/heavy backgrounds must: scale by `devicePixelRatio`, pause on
  `visibilitychange`, and not render on routes where they are covered.
- Transitions: 150–500ms, `ease-out` for entrances. No instant state changes.

---

## 7. Iconography & Assets

- Icons: **lucide-react** (some legacy Heroicons remain). Consistent stroke,
  sized 16–24px inline, 48–64px for empty states.
- **Never use emojis as icons.** No exceptions.
- Images go through **next/image** (never bare `<img>` for local assets);
  above-the-fold placements set `priority`. Logo lives in
  `apps/web/src/components/AstrolegiaLogo.tsx`.
- Favicon / app icons: `apps/web/src/app/favicon.ico`, `icon.png`,
  `apple-icon.png` and `apps/web/public/icons/*` (ringed planet). Next links
  them by file convention; don't point metadata at heavy source PNGs.

---

## 8. Anti-Patterns (Do NOT Use)

- ❌ **Light backgrounds / light mode** — Cosmic Luxury is dark-only. No
  `#EEF2FF`, no white cards.
- ❌ **Handwritten or "friendly" fonts** (Caveat, Quicksand, etc.) — only
  Inter + Space Grotesk via next/font variables.
- ❌ **Emojis as icons** — use lucide-react SVGs.
- ❌ **New animation libraries** — framer-motion only (gsap is banned).
- ❌ **Literal font-family names bypassing `--font-inter` /
  `--font-space-grotesk`** — breaks next/font and falls back to system fonts.
- ❌ **Hardcoding accent hexes in components** — use CSS variables or the
  Tailwind `accent-*` / `bg-deep` classes.
- ❌ **Layout-shifting hovers** on non-interactive surfaces; `.glass:hover`
  only changes border/shadow.
- ❌ **Ignoring `prefers-reduced-motion`** in any new animation.
- ❌ **Green/indigo "SaaS" palettes**, flat `#000` blacks, or pure grey text —
  use the void/nebula backgrounds and blue-grey text tokens.
- ❌ **Missing `cursor-pointer`** on clickable elements.
- ❌ **Low contrast** — keep 4.5:1 minimum for text on void.

---

## 9. Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] Colors come from tokens (`--accent-*`, `--bg-*`) or their Tailwind classes
- [ ] Headings render in Space Grotesk, body in Inter (check the CSS variables)
- [ ] Surfaces use `.glass` (+ `.glass-hover` only if interactive)
- [ ] Icons are lucide-react, no emojis
- [ ] Entrances use `animate-fade-in(-up)` or framer-motion fade/rise
- [ ] `prefers-reduced-motion` respected (CSS block, `useReducedMotion`, or static frame)
- [ ] Images use next/image; heavy/ambient canvases pause when hidden
- [ ] Hover states with smooth transitions (150–300ms), visible focus states
- [ ] Responsive: 375px, 768px, 1024px, 1440px; no horizontal scroll
- [ ] No content hidden behind the fixed navbar
