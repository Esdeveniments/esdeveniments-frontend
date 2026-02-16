import fs from "fs";
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
const buildVersion =
  process.env.BUILD_VERSION ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  `${Date.now()}`;

// Read the service worker template
const swTemplatePath = path.join(__dirname, "..", "public", "sw-template.js");
const swOutputPath = path.join(__dirname, "..", "public", "sw.js");

let swContent = fs.readFileSync(swTemplatePath, "utf8");

// Replace the placeholder with the actual API origin
swContent = swContent.replace("{{API_ORIGIN}}", apiOrigin);
swContent = swContent.replace("{{BUILD_VERSION}}", buildVersion);

// Write the generated service worker
fs.writeFileSync(swOutputPath, swContent);

console.log(
  `Service worker generated with API origin: ${apiOrigin} (build: ${buildVersion})`
);
