import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the API URL from environment variables
const apiUrl =
  process.env.NEXT_PUBLIC_API_URL || "https://api-pre.esdeveniments.cat";

// Extract just the origin (protocol + hostname) for service worker matching
const apiOrigin = new URL(apiUrl).origin;

// Read the service worker template
const swTemplatePath = path.join(__dirname, "..", "public", "sw-template.js");
const swOutputPath = path.join(__dirname, "..", "public", "sw.js");

let swContent = fs.readFileSync(swTemplatePath, "utf8");

// Replace the placeholder with the actual API origin
swContent = swContent.replace("{{API_ORIGIN}}", apiOrigin);

// Write the generated service worker
fs.writeFileSync(swOutputPath, swContent);

console.log(`Service worker generated with API origin: ${apiOrigin}`);
