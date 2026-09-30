// Tiny Node ESM resolver hook, used only by
// precompute-front-office-closing-card.mts, so that plain `node` (not
// webpack/Next.js) can follow this repo's "@/" -> "src/" tsconfig path
// alias when it shows up in a file the script imports transitively (e.g.
// frontOfficeMonteCarlo.ts importing "@/lib/models/shared"). Does not
// change how the app itself resolves "@/" — Next.js/webpack already handle
// that at build time via tsconfig.json's own "paths" entry.
import path from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const filePath = path.join(projectRoot, "src", specifier.slice(2) + ".ts");
    return nextResolve(pathToFileURL(filePath).href, context);
  }
  // Extensionless relative imports (e.g. "./frontOffice"), same convention
  // TypeScript/webpack allow but plain Node ESM doesn't — try the ".ts"
  // file Next.js would resolve it to before falling through.
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !path.extname(specifier)) {
    try {
      return await nextResolve(specifier + ".ts", context);
    } catch {
      // fall through to the default resolution/error below
    }
  }
  return nextResolve(specifier, context);
}
