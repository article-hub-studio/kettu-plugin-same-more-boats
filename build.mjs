import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { build } from "esbuild";

const pluginDir = resolve("plugins/sameMoreBoats");
const manifest = JSON.parse(await readFile(resolve(pluginDir, "manifest.json"), "utf8"));
const outputDir = resolve("dist/sameMoreBoats");

await mkdir(outputDir, { recursive: true });
await build({
  entryPoints: [resolve(pluginDir, manifest.main)],
  outfile: resolve(outputDir, "index.js"),
  bundle: true,
  format: "iife",
  globalName: "__vendettaPlugin",
  platform: "browser",
  target: "es2019",
  jsx: "transform",
  external: ["@vendetta/*"],
  footer: { js: "module.exports = __vendettaPlugin.default ?? __vendettaPlugin;" },
  logLevel: "info"
});

manifest.main = "index.js";
await writeFile(resolve(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Built ${manifest.name} in ${basename(dirname(resolve(outputDir, "index.js")))}`);
