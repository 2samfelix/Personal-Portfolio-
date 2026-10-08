# Caterpillar artifact build pipeline

A committed, reproducible pipeline for the artifacts under `caterpillar-demand-quality/`
that previously only existed as rendered output with no source/generator in the repo:
the case-study PDF and the exhibit PNGs.

## What's here

| File | Produces |
|---|---|
| `render-svg-exhibits.mjs` | Light + dark PNGs for every `assets/*.svg` exhibit, from that SVG |
| `render-exhibit5.mjs` | `assets/exhibit-5-margin-context.png`, from `assets/exhibit-5-margin-context.md` |
| `render-pdf.mjs` | `analysis/Caterpillar_Demand_Quality_Case_Study.pdf`, from `src/case-study.html` + `src/print.css` |
| `src/case-study.html` | The case-study document's HTML source |
| `src/print.css` | Print stylesheet (US Letter, typography, tables, caveat callouts, page-number footer) |
| `src/baseline-pdf-text.txt` | Raw text extraction of the pre-rebuild PDF — the baseline Phase 2 content was built from, kept as a frozen historical record (not re-extracted on each run) |
| `lib/chromium.mjs` | Resolves a Chromium executable for Playwright (see below) |

Exhibits 2, 3 and 4 are **not** images in `case-study.html` — it has
`<!-- EXHIBIT_N_SVG -->` placeholders that `render-pdf.mjs` replaces with
the literal contents of `assets/exhibit-{2,3,4}-*.svg`, read fresh on every
run, before handing the merged HTML to Chromium. So the PDF always reflects
whatever those three SVGs currently contain, byte-for-byte — there is no
intermediate raster asset to go stale. `render-pdf.mjs` also forces
`emulateMedia({ media: 'print', colorScheme: 'light' })` before rendering,
since those SVGs carry their own `@media (prefers-color-scheme: dark)`
rules (for the separate downloadable dark PNGs) that must not fire inside
the PDF.

Nothing here is a framework — plain Node ESM scripts (`.mjs`) and Playwright's
Chromium driver, matching how the existing PDF was itself produced (its
embedded PDF metadata shows `/Producer: Skia/PDF`, i.e. a Chromium print pass).

## Running it

From the repo root:

```bash
npm run caterpillar:exhibits   # SVG exhibits -> light + dark PNGs
npm run caterpillar:exhibit5   # exhibit-5 markdown table -> PNG
npm run caterpillar:pdf        # case-study.html -> PDF
npm run caterpillar:build      # all three, in that order
```

`render-svg-exhibits.mjs` processes every SVG under `assets/` — it isn't
exhibit-specific, so changing any one exhibit's SVG and re-running it will
also re-render the others. That's expected: when nothing else in an SVG
changed, its re-rendered PNG comes out byte-identical (verified when this
pipeline was built — see the Phase 1 review notes), so running it is safe
even when you only meant to touch one exhibit.

## Chromium

This environment has a Chromium build pre-installed outside `node_modules`
(`$PLAYWRIGHT_BROWSERS_PATH`), so `npm install` alone does not fetch a
browser. `lib/chromium.mjs` resolves an executable in this order:

1. `PLAYWRIGHT_CHROMIUM_PATH` env var, if set and it exists
2. The newest `chromium-*` build under `$PLAYWRIGHT_BROWSERS_PATH`
3. Otherwise, Playwright's own default resolution

On a machine without a pre-installed browser, run `npx playwright install
chromium` first (uses Playwright's normal download path; (2) above won't
apply, and (3) will pick up what that command installed).

## Determinism

- SVG → PNG rendering uses a fixed viewport sized to the SVG's own
  `viewBox`, a fixed `deviceScaleFactor` (2x, matching the committed PNGs'
  resolution), and explicit light/dark background colors — no reliance on
  system fonts beyond the same web-safe stack the SVGs/site already use
  (`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica,
  Arial, sans-serif`).
- No network access is used at build time — every input is a committed
  repo file, and exhibit SVGs/images are embedded or loaded from disk, not
  fetched.
- Re-running any script should reproduce byte-identical output when its
  source inputs haven't changed, given the same Chromium build.

## What this pipeline does *not* do

- It does not invent or infer case-study content. `src/case-study.html`'s
  body text is populated only from text extracted from the existing
  committed PDF (plus the specific, explicitly approved wording changes),
  never reconstructed from memory or from the website.
- It does not silently change figures, classifications, caveats, or
  analytical conclusions. Source files (`assets/*.svg`, `assets/*.md`,
  `src/case-study.html`) are edited by hand with the same scrutiny as any
  other analytical source in this project; the scripts here only render
  what's already written there.
