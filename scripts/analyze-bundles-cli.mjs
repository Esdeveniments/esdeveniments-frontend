#!/usr/bin/env node
/**
 * CLI Bundle Analyzer
 * Analyzes Next.js bundle sizes without using the browser interface
 * 
 * Usage:
 *   node scripts/analyze-bundles-cli.mjs [options]
 * 
 * Options:
 *   --route <path>    Analyze specific route (e.g., "/" or "/e/[eventId]")
 *   --top <n>         Show top N largest bundles (default: 20)
 *   --format <json|table>  Output format (default: table)
 */

import { readFileSync, statSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Get file size
function getFileSize(filePath) {
  try {
    const stats = statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

// Recursively get all files in directory
function getAllFiles(dir, fileList = []) {
  try {
    const files = readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const filePath = join(dir, file.name);
      if (file.isDirectory()) {
        getAllFiles(filePath, fileList);
      } else if (file.isFile()) {
        fileList.push(filePath);
      }
    }
  } catch {
    // Ignore errors
  }
  return fileList;
}

// Analyze client bundles
function analyzeClientBundles() {
  const staticDir = join(projectRoot, '.next', 'static');
  const chunksDir = join(staticDir, 'chunks');
  
  if (!statSync(chunksDir, { throwIfNoEntry: false })) {
    return [];
  }

  const files = getAllFiles(chunksDir);
  const bundles = files
    .filter(f => f.endsWith('.js') || f.endsWith('.css'))
    .map(file => {
      const size = getFileSize(file);
      const relativePath = file.replace(projectRoot + '/', '');
      return {
        path: relativePath,
        size,
        type: file.endsWith('.css') ? 'CSS' : 'JS',
      };
    })
    .filter(b => b.size > 0)
    .sort((a, b) => b.size - a.size);

  return bundles;
}

// Analyze server bundles for a specific route
function analyzeRouteServerBundle(route) {
  const appServerDir = join(projectRoot, '.next', 'server', 'app');
  const routePath = route.replace(/^\//, '');
  const serverDir = route === '/' ? join(appServerDir, 'page') : join(appServerDir, routePath);

  const rootFiles = [];
  if (route === '/') {
    try {
      const entries = readdirSync(appServerDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (!entry.name.startsWith('page.')) continue;
        const filePath = join(appServerDir, entry.name);
        rootFiles.push(filePath);
      }
    } catch {
      // Ignore
    }
  }

  if (!statSync(serverDir, { throwIfNoEntry: false }) && rootFiles.length === 0) {
    return null;
  }

  const files = [...rootFiles, ...getAllFiles(serverDir)];
  const bundles = files
    .filter(f => f.endsWith('.js') || f.endsWith('.json'))
    .map(file => {
      const size = getFileSize(file);
      const relativePath = file.replace(projectRoot + '/', '');
      const fileName = file.split('/').pop();
      return {
        path: relativePath,
        fileName,
        size,
        type: file.endsWith('.json') ? 'JSON' : 'JS',
      };
    })
    .filter(b => b.size > 0)
    .sort((a, b) => b.size - a.size);

  const totalSize = bundles.reduce((sum, b) => sum + b.size, 0);
  
  return {
    route,
    bundles,
    totalSize,
    fileCount: bundles.length,
  };
}

// Get all routes from routes.json
function getAllRoutes() {
  try {
    const routesFile = join(projectRoot, '.next', 'diagnostics', 'analyze', 'data', 'routes.json');
    const content = readFileSync(routesFile, 'utf-8');
    return JSON.parse(content);
  } catch {
    // Fallback: use Next.js app-paths-manifest (available after build)
    try {
      const manifestFile = join(projectRoot, '.next', 'server', 'app-paths-manifest.json');
      const content = readFileSync(manifestFile, 'utf-8');
      const manifest = JSON.parse(content);

      const routes = Object.keys(manifest)
        .map((key) => {
          if (key === '/page') return '/';
          if (key.endsWith('/page')) return key.replace(/\/page$/, '');
          if (key.endsWith('/route')) return key.replace(/\/route$/, '');
          return null;
        })
        .filter(Boolean);

      // De-dupe while preserving stable ordering
      return Array.from(new Set(routes));
    } catch {
      // Last resort: try to discover routes from .next/server/app directories
      const appDir = join(projectRoot, '.next', 'server', 'app');
      if (!statSync(appDir, { throwIfNoEntry: false })) {
        return [];
      }

      const routes = [];
      function discoverRoutes(dir, prefix = '') {
        try {
          const entries = readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const routePath = prefix + '/' + entry.name;
              const pageFile = join(dir, entry.name, 'page.js');
              const routeFile = join(dir, entry.name, 'route.js');

              if (statSync(pageFile, { throwIfNoEntry: false })) {
                routes.push(routePath === '/page' ? '/' : routePath);
              }
              if (statSync(routeFile, { throwIfNoEntry: false })) {
                routes.push(routePath.replace(/\/(route)$/, ''));
              }

              discoverRoutes(join(dir, entry.name), routePath);
            }
          }
        } catch {
          // Ignore
        }
      }

      // Root page.js sits at appDir/page.js
      if (statSync(join(appDir, 'page.js'), { throwIfNoEntry: false })) {
        routes.push('/');
      }

      discoverRoutes(appDir);
      return Array.from(new Set(routes));
    }
  }
}

// Main analysis function
function analyzeBundles(options = {}) {
  const { route, top = 20, format = 'table' } = options;

  const clientBundles = analyzeClientBundles();
  const totalClientBytes = clientBundles.reduce((sum, b) => sum + b.size, 0);
  const topClientBundles = clientBundles.slice(0, top);

  const routes = route ? [route] : getAllRoutes();
  const routeAnalyses = routes
    .map(r => analyzeRouteServerBundle(r))
    .filter(Boolean)
    .sort((a, b) => b.totalSize - a.totalSize);

  if (format === 'json') {
    const routesSummary = routeAnalyses.map((analysis) => ({
      route: analysis.route,
      serverBytes: analysis.totalSize,
      fileCount: analysis.fileCount,
    }));

    const data = {
      generatedAt: new Date().toISOString(),
      client: {
        totalBytes: totalClientBytes,
        topBundles: topClientBundles,
      },
      routes: routesSummary,
    };

    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log('📦 Next.js Bundle Analysis (CLI)\n');
  console.log('='.repeat(60));

  // Analyze client bundles
  console.log('\n🔵 Client Bundles (.next/static/chunks):\n');
  if (clientBundles.length === 0) {
    console.log('⚠️  No client bundles found. Run "yarn build" first.\n');
  } else {
    console.log('Top', top, 'largest client bundles:\n');
    console.log('Size'.padEnd(12), 'Type'.padEnd(6), 'File');
    console.log('-'.repeat(60));
    topClientBundles.forEach(b => {
      console.log(
        formatBytes(b.size).padEnd(12),
        b.type.padEnd(6),
        b.path.replace('.next/static/chunks/', '')
      );
    });
    console.log('-'.repeat(60));
    console.log('Total client bundle size:'.padEnd(18), formatBytes(totalClientBytes));
  }

  // Analyze route-specific bundles
  console.log('\n\n🟢 Route-Specific Server Bundles:\n');
  if (routes.length === 0) {
    console.log('⚠️  No routes found.\n');
    return;
  }

  if (routeAnalyses.length === 0) {
    console.log('⚠️  No route bundles found.\n');
    return;
  }

  const topRouteAnalyses = routeAnalyses.slice(0, top);
  console.log('Top', Math.min(top, topRouteAnalyses.length), 'largest routes:\n');
  console.log('Size'.padEnd(12), 'Files'.padEnd(8), 'Route');
  console.log('-'.repeat(60));
  topRouteAnalyses.forEach(analysis => {
    console.log(
      formatBytes(analysis.totalSize).padEnd(12),
      String(analysis.fileCount).padEnd(8),
      analysis.route
    );
  });
  console.log('-'.repeat(60));

  // Show details for specific route if requested
  if (route) {
    const analysis = routeAnalyses.find(a => a.route === route);
    if (analysis && analysis.bundles.length > 0) {
      console.log(`\n📋 Details for route: ${route}\n`);
      console.log('Size'.padEnd(12), 'Type'.padEnd(6), 'File');
      console.log('-'.repeat(60));
      analysis.bundles.slice(0, 10).forEach(b => {
        console.log(
          formatBytes(b.size).padEnd(12),
          b.type.padEnd(6),
          b.fileName
        );
      });
      if (analysis.bundles.length > 10) {
        console.log(`... and ${analysis.bundles.length - 10} more files`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Tip: Use --route <path> to see detailed breakdown for a specific route');
  console.log('💡 Tip: Use --format json for machine-readable output\n');
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  route: null,
  top: 20,
  format: 'table',
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--route' && args[i + 1]) {
    options.route = args[i + 1];
    i++;
  } else if (args[i] === '--top' && args[i + 1]) {
    options.top = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--format' && args[i + 1]) {
    options.format = args[i + 1];
    i++;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
CLI Bundle Analyzer

Usage:
  node scripts/analyze-bundles-cli.mjs [options]

Options:
  --route <path>       Analyze specific route (e.g., "/" or "/e/[eventId]")
  --top <n>            Show top N largest bundles (default: 20)
  --format <json|table>  Output format (default: table)
  --help, -h           Show this help message

Examples:
  node scripts/analyze-bundles-cli.mjs
  node scripts/analyze-bundles-cli.mjs --route "/"
  node scripts/analyze-bundles-cli.mjs --top 10 --format json
`);
    process.exit(0);
  }
}

// Run analysis
try {
  analyzeBundles(options);
} catch (error) {
  console.error('❌ Error:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}


