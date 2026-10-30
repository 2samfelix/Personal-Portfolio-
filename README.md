# Sam Felix — Finance & Analytics Portfolio

The source of [personal-portfolio-sam-felix.vercel.app](https://personal-portfolio-sam-felix.vercel.app): a portfolio of financial modeling, FP&A and analytics work, built with Next.js and deployed on Vercel. Each project page shows the work itself (charts, the model's own cells, downloads), and the figures on the site are read from the projects' workbooks rather than typed by hand where the page says so.

## Projects

| Project | Page | One line |
| --- | --- | --- |
| Caterpillar, Inc. | `/projects/caterpillar-demand-quality` | Was Construction Industries growth real end-user demand, or dealer restocking? An eight-quarter segment analysis from Caterpillar's filings. |
| Arm Holdings | `/projects/arm` | Did Arm's IPO valuation justify the premium? A DCF and comparable-company analysis. |
| Microsoft × Activision Blizzard | `/projects/microsoft-activision` | How much synergy did Microsoft need to make the Activision deal EPS-neutral? A merger model. |
| Nike, Inc. | `/projects/nike` | Can North America's growth cover Greater China's decline? A driver-based three-statement model with scenarios. |
| FP&A Intelligence Engine | `/projects/fpa-intelligence-engine` | An AI writes a finance brief; deterministic code does the math and accepts or rejects it. The engine lives in its own repository, [2samfelix/fpa-intelligence-engine](https://github.com/2samfelix/fpa-intelligence-engine). |
| monday.com Operating Plan & Rolling Reforecast | `/projects/monday-operating-plan` | How should management adjust spend if growth slows faster than guided? A plan locked before the Q3 2026 results; scoring is pending. The plan's own repository is [2samfelix/monday-operating-plan](https://github.com/2samfelix/monday-operating-plan). |

The site also has three interactive tools: `/tools/fpa-decision-lab`, `/tools/driver-sensitivity-simulator` and `/tools/front-office-simulator`.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router, Turbopack) with React 19 and TypeScript. This Next.js version differs from older ones; see `AGENTS.md` and the guides in `node_modules/next/dist/docs/`.
- Tailwind CSS 4. The colors are tokens in `src/app/globals.css` (cream, charcoal, forest, brass).
- Pages are prerendered at build time. Charts are server-rendered SVG; there is no chart library. The Model Preview and the engine trace load their prebuilt JSON from `public/` in the browser.
- Node and Python scripts in `scripts/` export and check the data the pages read (see below). Playwright renders the project thumbnails and favicon.

## Run it

Requires Node.js 22.6 or later (the build's precompute step uses `--experimental-strip-types`).

```bash
npm install
npm run dev
```

Open http://localhost:3000. For a production build:

```bash
npm run build
npm start
```

`npm run build` first runs `npm run precompute:front-office` (the `prebuild` script), which precomputes data for the Front Office simulator.

## Tests and checks

| Command | What it checks |
| --- | --- |
| `npm run lint` | ESLint over the repository. |
| `npm run build` | Type-checks and prerenders every page. It also fails if a locked monday.com workbook, its hosted download copy or the hosted memo PDF no longer matches its SHA-256 pin (`verifyPins` in `src/lib/mondayPlan.ts`). |
| `npm run check:model-preview` | Every Model Preview JSON in `public/*/model-preview.json` still matches the SHA-256 of the workbook it was exported from (see below). |
| `npm run test:monday-charts` | Run after `npm run build`. Reads the prerendered monday.com page and checks every number and drawn mark tied to a workbook cell against the pinned workbooks, read with openpyxl. Needs Python 3 with `openpyxl`. |
| `npm run check:engine-trace` | The FP&A Intelligence Engine page's trace data (`public/engine/trace.json`) still matches the accepted run and the engine files it was built from. By default it fetches the engine at the pinned commit from GitHub, so it needs network access (or `--engine <path>` to a local clone at that commit). |
| `npm run verify:caterpillar-exhibits` | The Caterpillar page's mobile exhibit titles and subtitles match the ones baked into each exhibit's SVG. |

There is no unit-test runner in this repository; the checks above are the tests.

## How the Model Preview pins work

Five project pages show the model's own spreadsheet cells ("Model Preview"). The workbooks live in this repository (`*/model/*.xlsx`), and nothing is recalculated in the browser:

1. `npm run export:model-preview` (`scripts/export-model-preview.py`; needs Python 3 with openpyxl and LibreOffice on PATH) reads each workbook and writes `public/<project>/model-preview.json`. It records the workbook's SHA-256 and, for a workbook copied from another repository, the source repository, commit and hash. It refuses to run if a copy no longer matches its recorded source hash.
2. `npm run check:model-preview` recomputes each workbook's SHA-256 and fails if it differs from the one recorded in its JSON, so a workbook cannot change without its preview being regenerated.
3. For monday.com, the locked plan and Q3 call workbooks are also pinned in `src/lib/mondayPlan.ts`. `next build` fails if either workbook, the hosted workbook download or the memo PDF differs from its pin, or if the exported JSON was made from a different file or commit than the locked GitHub Releases.

## Deploy

The site deploys on Vercel through its GitHub integration: each pull request gets a preview deployment (the Vercel bot links it on the PR), and production deploys from the production branch set in the Vercel project (`main` by default). Vercel runs `npm run build`, so a failing pin check or type error fails the deployment. There is no deploy configuration in the repository itself.

## Repository layout

```
src/app/                 routes (home, /projects/[slug], /tools/*), not-found page, icons
src/components/          page sections and project pages
src/lib/                 project data, site config, monday.com and Model Preview loaders
public/                  images, Model Preview JSON, downloads
scripts/                 export, check and render scripts
*/model/                 the project workbooks behind the Model Previews
```
