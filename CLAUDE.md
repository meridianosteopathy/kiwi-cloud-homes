# Kiwi Cloud Homes

## Copy & positioning

**Do not describe the site, or the homes, as being "for Chinese guests"** — or
any equivalent framing that names the audience in outward-facing copy. The
English tagline is "Short-stay homes in New Zealand", full stop. This is a
standing preference: keep public copy inclusive, and don't reintroduce
audience-targeting language when editing taglines, headings, metadata
descriptions, or share-card text.

This is about *outward positioning only*. The product itself stays built for
Chinese-speaking guests and that work should continue as normal: full zh-CN
translation, bilingual emails, Chinese school names, CJK font fallbacks,
China-accessible hosting considerations. Localisation is a feature; announcing
the target audience in the tagline is not.

## Brand

Palette and typeface come from the supplied logo kit (`public/brand/`):

| Token         | Hex       | Use                                  |
| ------------- | --------- | ------------------------------------ |
| `brand-navy`  | `#1E4E79` | Wordmark, footer band, deep surfaces |
| `brand-blue`  | `#2C6E9E` | House outline, primary actions       |
| `brand-sky`   | `#4A9BD4` | Kiwi bird, accents                   |
| `brand-cloud` | `#A9CFEA` | Cloud fill, tints, reversed text     |

The site-wide `kiwi-*` Tailwind scale is built around those four (200 = cloud,
400 = sky, 600 = blue, 800 = navy). It keeps the `kiwi` name for historical
reasons — it is no longer green. Prefer `kiwi-*` for UI surfaces and reserve
`brand-*` for the logo itself.

Green is still used, but only where it is **semantic** — in-zone school pills,
payment success, low-season markers. Don't reintroduce green as decoration.

Comfortaa (the logo face) is loaded via `next/font` as `font-display` and is
scoped to the wordmark and top-level headings; body copy stays on the system
sans stack. Every font stack must keep its CJK fallbacks — the site is
bilingual and neither Comfortaa nor the Latin UI stack ships Chinese glyphs.

Use the `BrandLogo` component rather than inlining logo SVG; it carries the
`primary` / `reversed` / `mono` variants.

## Gotchas

- `npm run lint` is broken — Next 16 removed the `next lint` command. Use
  `npm run typecheck` and `npm run build` to validate changes.
- Social scrapers reject SVG, so the Open Graph card is a generated PNG
  (`public/brand/og-image.png`, 1200×630). Regenerate it if the tagline
  changes, and keep its wording in sync with `Site.tagline`.
- `NEXT_PUBLIC_SITE_URL` drives `metadataBase` for absolute share-card URLs.
  Unset, it falls back to the Vercel production hostname.
