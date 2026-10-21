import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist/client");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of ["index.html", "assets", "favicon.ico", "robots.txt", "sitemap.xml"]) {
  await cp(resolve(root, name), resolve(output, name), { recursive: true });
}
