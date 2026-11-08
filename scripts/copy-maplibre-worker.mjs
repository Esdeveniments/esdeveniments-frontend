// Self-host the MapLibre worker (same idea as Workbox in generate-sw.mjs):
// copy it from node_modules into a versioned folder under /static (outside
// the proxy matcher, same origin for CSP `worker-src 'self'`). The events map
// points setWorkerUrl() at `/static/maplibre-v<version>/maplibre-gl-worker.mjs`
// (components/ui/eventsMap/useEventsMapLibre.ts).
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { version } = require("maplibre-gl/package.json");
const staticDir = path.join(__dirname, "..", "public", "static");
const dirName = `maplibre-v${version}`;

for (const entry of fs.readdirSync(staticDir)) {
  if (entry.startsWith("maplibre-v") && entry !== dirName) {
    fs.rmSync(path.join(staticDir, entry), { recursive: true, force: true });
  }
}
fs.mkdirSync(path.join(staticDir, dirName), { recursive: true });
fs.copyFileSync(
  path.join(
    path.dirname(require.resolve("maplibre-gl/package.json")),
    "dist",
    "maplibre-gl-worker.mjs"
  ),
  path.join(staticDir, dirName, "maplibre-gl-worker.mjs")
);
console.log(`✅ MapLibre worker copied to /static/${dirName}/`);
