#!/usr/bin/env node
/**
 * Bundle Analyzer API Client
 * Fetches and analyzes bundle data from the running analyzer server
 * 
 * Usage:
 *   node scripts/analyze-bundles-api.mjs [options]
 * 
 * Options:
 *   --url <url>       Analyzer server URL (default: http://localhost:4000)
 *   --route <path>    Analyze specific route
 *   --top <n>         Show top N largest routes (default: 20)
 *   --format <json|table>  Output format (default: table)
 */

import https from 'https';
import http from 'http';

const DEFAULT_URL = 'http://localhost:4000';

// Fetch JSON from URL
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

// Analyze routes from the analyzer API
async function analyzeBundlesAPI(options = {}) {
  const { url = DEFAULT_URL, route, top = 20, format = 'table' } = options;
  
  console.log('📦 Next.js Bundle Analysis (via API)\n');
  console.log('Connecting to:', url);
  console.log('='.repeat(60));
  
  try {
    // Fetch routes list
    const routesUrl = `${url}/data/routes.json`;
    console.log('\n📋 Fetching routes list...\n');
    const routes = await fetchJSON(routesUrl);
    
    if (!Array.isArray(routes) || routes.length === 0) {
      console.log('⚠️  No routes found.\n');
      return;
    }
    
    console.log(`✅ Found ${routes.length} routes\n`);
    
    // If specific route requested, show details
    if (route) {
      if (!routes.includes(route)) {
        console.log(`⚠️  Route "${route}" not found.\n`);
        console.log('Available routes:');
        routes.slice(0, 10).forEach(r => console.log('  -', r));
        if (routes.length > 10) {
          console.log(`  ... and ${routes.length - 10} more`);
        }
        return;
      }
      
      console.log(`\n🔍 Analyzing route: ${route}\n`);
      console.log('Note: Detailed analysis requires parsing binary data files.');
      console.log('For full analysis, use the browser interface at:', url);
      console.log('Or use: node scripts/analyze-bundles-cli.mjs --route', route);
      return;
    }
    
    // Show routes summary
    if (format === 'table') {
      console.log('📊 Available Routes:\n');
      console.log('Route'.padEnd(40), 'Type');
      console.log('-'.repeat(60));
      
      const pageRoutes = routes.filter(r => !r.startsWith('/api/') && !r.startsWith('/server-') && r !== '/manifest.webmanifest');
      const apiRoutes = routes.filter(r => r.startsWith('/api/'));
      const sitemapRoutes = routes.filter(r => r.startsWith('/server-') || r.startsWith('/sitemap'));
      
      console.log('\n📄 Page Routes:');
      pageRoutes.slice(0, top).forEach(r => {
        console.log(r.padEnd(40), 'Page');
      });
      if (pageRoutes.length > top) {
        console.log(`... and ${pageRoutes.length - top} more page routes`);
      }
      
      console.log('\n🔌 API Routes:');
      apiRoutes.slice(0, Math.min(top, apiRoutes.length)).forEach(r => {
        console.log(r.padEnd(40), 'API');
      });
      if (apiRoutes.length > top) {
        console.log(`... and ${apiRoutes.length - top} more API routes`);
      }
      
      console.log('\n🗺️  Sitemap Routes:');
      sitemapRoutes.slice(0, Math.min(top, sitemapRoutes.length)).forEach(r => {
        console.log(r.padEnd(40), 'Sitemap');
      });
      if (sitemapRoutes.length > top) {
        console.log(`... and ${sitemapRoutes.length - top} more sitemap routes`);
      }
      
      console.log('\n' + '='.repeat(60));
      console.log(`\n💡 Total: ${routes.length} routes`);
      console.log(`💡 Page routes: ${pageRoutes.length}`);
      console.log(`💡 API routes: ${apiRoutes.length}`);
      console.log(`💡 Sitemap routes: ${sitemapRoutes.length}`);
      console.log(`\n💡 For detailed bundle sizes, use:`);
      console.log(`   node scripts/analyze-bundles-cli.mjs`);
      console.log(`   Or visit: ${url}`);
    } else {
      console.log(JSON.stringify({
        total: routes.length,
        routes: routes.map(r => ({
          route: r,
          type: r.startsWith('/api/') ? 'API' : 
                r.startsWith('/server-') || r.startsWith('/sitemap') ? 'Sitemap' : 'Page'
        }))
      }, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Could not connect to analyzer server.');
      console.error('Make sure the analyzer is running:');
      console.error('  yarn analyze');
      console.error('  # Then visit http://localhost:4000');
    }
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  url: DEFAULT_URL,
  route: null,
  top: 20,
  format: 'table',
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' && args[i + 1]) {
    options.url = args[i + 1];
    i++;
  } else if (args[i] === '--route' && args[i + 1]) {
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
Bundle Analyzer API Client

Usage:
  node scripts/analyze-bundles-api.mjs [options]

Options:
  --url <url>         Analyzer server URL (default: http://localhost:4000)
  --route <path>      Analyze specific route
  --top <n>           Show top N routes (default: 20)
  --format <json|table>  Output format (default: table)
  --help, -h          Show this help message

Examples:
  node scripts/analyze-bundles-api.mjs
  node scripts/analyze-bundles-api.mjs --route "/"
  node scripts/analyze-bundles-api.mjs --format json
`);
    process.exit(0);
  }
}

// Run analysis
analyzeBundlesAPI(options).catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});

