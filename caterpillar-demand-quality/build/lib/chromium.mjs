import { existsSync } from "node:fs";
import { globSync } from "node:fs";

/**
 * Resolve a Chromium executable for Playwright.
 *
 * Order: PLAYWRIGHT_CHROMIUM_PATH env override, then the pre-installed
 * Chromium under PLAYWRIGHT_BROWSERS_PATH (this environment's convention),
 * then undefined so Playwright falls back to its own resolution (requires
 * `npx playwright install chromium` on a machine without a pre-installed
 * browser).
 */
export function resolveChromiumExecutablePath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH && existsSync(process.env.PLAYWRIGHT_CHROMIUM_PATH)) {
    return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  }

  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (browsersPath) {
    const matches = globSync(`${browsersPath}/chromium-*/chrome-linux/chrome`);
    if (matches.length > 0) {
      return matches.sort().at(-1);
    }
  }

  return undefined;
}

export async function launchChromium(chromiumLauncher, options = {}) {
  const executablePath = resolveChromiumExecutablePath();
  return chromiumLauncher.launch({
    executablePath,
    ...options,
  });
}
