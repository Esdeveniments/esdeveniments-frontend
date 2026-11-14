import fs from "fs";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read default API URL from shared config (single source of truth)
const apiDefaultsPath = path.join(__dirname, "..", "config", "api-defaults.json");
const apiDefaults = JSON.parse(fs.readFileSync(apiDefaultsPath, "utf8"));

// Get the API URL from environment variables, fallback to shared config
const apiUrl = process.env.NEXT_PUBLIC_API_URL || apiDefaults.apiUrl;

// Extract just the origin (protocol + hostname) for service worker matching
const apiOrigin = new URL(apiUrl).origin;

// Ensure sw.js changes on every build/deploy so the browser updates the SW.
// This is important because we clear cached HTML pages on SW activate to avoid hydration mismatches.
const buildVersion = process.env.BUILD_VERSION || `${Date.now()}`;

// Read the service worker template
const swTemplatePath = path.join(__dirname, "..", "public", "sw-template.js");
const swOutputPath = path.join(__dirname, "..", "public", "sw.js");

// Self-host Workbox: copy the runtime modules the SW uses from node_modules
// into a versioned folder under /static (outside the proxy matcher), so
// installing the SW doesn't depend on Google's CDN.
const require = createRequire(import.meta.url);
const workboxVersion = require("workbox-sw/package.json").version;
const WORKBOX_MODULES = [
  "workbox-core",
  "workbox-routing",
  "workbox-strategies",
  "workbox-expiration",
  "workbox-cacheable-response",
  "workbox-precaching",
  "workbox-navigation-preload",
  "workbox-broadcast-update",
];
const staticDir = path.join(__dirname, "..", "public", "static");
const workboxDirName = `workbox-v${workboxVersion}`;
const workboxDir = path.join(staticDir, workboxDirName);
for (const entry of fs.readdirSync(staticDir)) {
  if (entry.startsWith("workbox-v") && entry !== workboxDirName) {
    fs.rmSync(path.join(staticDir, entry), { recursive: true, force: true });
  }
}
fs.mkdirSync(workboxDir, { recursive: true });
const copyBuildFile = (pkg, file) =>
  fs.copyFileSync(
    path.join(path.dirname(require.resolve(`${pkg}/package.json`)), "build", file),
    path.join(workboxDir, file)
  );
copyBuildFile("workbox-sw", "workbox-sw.js");
for (const pkg of WORKBOX_MODULES) {
  // workbox-sw loads .dev.js on localhost and .prod.js elsewhere.
  copyBuildFile(pkg, `${pkg}.dev.js`);
  copyBuildFile(pkg, `${pkg}.prod.js`);
}

let swContent = fs.readFileSync(swTemplatePath, "utf8");

// Replace the placeholder with the actual API origin
swContent = swContent.replace("{{API_ORIGIN}}", apiOrigin);
swContent = swContent.replace("{{BUILD_VERSION}}", buildVersion);
swContent = swContent.replaceAll("{{WORKBOX_PATH}}", `/static/${workboxDirName}`);

// Write the generated service worker
fs.writeFileSync(swOutputPath, swContent);

console.log(
  `Service worker generated with API origin: ${apiOrigin}, Workbox ${workboxVersion} (build: ${buildVersion})`
);
