import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
const SRC = resolvePath(process.cwd(), "src");
function withTs(p) {
  if (existsSync(p)) return p;
  for (const ext of [".ts", ".tsx", "/index.ts"]) if (existsSync(p + ext)) return p + ext;
  return p;
}
export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const abs = withTs(resolvePath(SRC, specifier.slice(2)));
    return { url: pathToFileURL(abs).href, shortCircuit: true };
  }
  return next(specifier, context);
}
