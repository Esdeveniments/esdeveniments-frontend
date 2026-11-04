#!/usr/bin/env node
/**
 * Compare bundle sizes against a baseline and fail on regressions.
 *
 * Usage:
 *   node scripts/compare-bundle-sizes.mjs --baseline bundle-size-baseline.json --current bundle-sizes.json
 */

import { readFile } from 'node:fs/promises';

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'n/a';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = Math.round((bytes / Math.pow(k, i)) * 100) / 100;
  return `${value} ${sizes[i]}`;
}

function formatPercent(ratio) {
  if (!Number.isFinite(ratio)) return 'n/a';
  return `${Math.round(ratio * 10000) / 100}%`;
}

function parseArgs(argv) {
  const args = { baseline: null, current: null, failOnWarn: false };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--baseline' && argv[i + 1]) {
      args.baseline = argv[i + 1];
      i++;
    } else if (token === '--current' && argv[i + 1]) {
      args.current = argv[i + 1];
      i++;
    } else if (token === '--fail-on-warn') {
      args.failOnWarn = true;
    } else if (token === '--help' || token === '-h') {
      console.log(`\nBundle size comparison\n\nUsage:\n  node scripts/compare-bundle-sizes.mjs --baseline <file> --current <file> [--fail-on-warn]\n`);
      process.exit(0);
    }
  }
  return args;
}

function getThresholds(routeConfig, globalThresholds) {
  const thresholds = routeConfig?.thresholds ?? globalThresholds;
  const warning = thresholds?.warning ?? globalThresholds.warning;
  const error = thresholds?.error ?? globalThresholds.error;
  return { warning, error };
}

function isExceeded(deltaBytes, deltaRatio, threshold) {
  const byBytes = Number.isFinite(threshold.bytes) && deltaBytes >= threshold.bytes;
  const byRatio = Number.isFinite(threshold.ratio) && deltaRatio >= threshold.ratio;
  return byBytes || byRatio;
}

function buildRouteMap(report) {
  const map = new Map();
  for (const entry of report?.routes ?? []) {
    if (!entry?.route) continue;
    map.set(entry.route, entry);
  }
  return map;
}

async function main() {
  const { baseline, current, failOnWarn } = parseArgs(process.argv.slice(2));

  if (!baseline || !current) {
    console.error('❌ Missing required args. Use --baseline and --current.');
    process.exit(2);
  }

  const [baselineRaw, currentRaw] = await Promise.all([
    readFile(baseline, 'utf8'),
    readFile(current, 'utf8'),
  ]);

  const baselineJson = JSON.parse(baselineRaw);
  const currentJson = JSON.parse(currentRaw);

  const globalThresholds = baselineJson.thresholds ?? {
    warning: { ratio: 0.05, bytes: 50 * 1024 },
    error: { ratio: 0.1, bytes: 100 * 1024 },
  };

  const pageThresholds = baselineJson.pageThresholds ?? {
    warning: { ratio: 0.01, bytes: 3 * 1024 },
    error: { ratio: 0.03, bytes: 10 * 1024 },
  };

  const issues = [];

  function check(key, baselineBytes, currentBytes, { warning, error }) {
    if (!Number.isFinite(baselineBytes) || baselineBytes <= 0) return;
    const deltaBytes = currentBytes - baselineBytes;
    if (deltaBytes <= 0) return;
    const deltaRatio = deltaBytes / baselineBytes;
    const level = isExceeded(deltaBytes, deltaRatio, error)
      ? 'error'
      : isExceeded(deltaBytes, deltaRatio, warning) ? 'warn' : null;
    if (!level) return;
    issues.push({
      level,
      key,
      baseline: baselineBytes,
      current: currentBytes,
      deltaBytes,
      deltaRatio,
      threshold: level === 'error' ? error : warning,
    });
  }

  check('client.totalBytes', baselineJson.clientTotalBytes, currentJson?.client?.totalBytes ?? 0, globalThresholds);

  const currentPages = new Map((currentJson?.pages ?? []).map((entry) => [entry.page, entry]));
  for (const [page, pageConfig] of Object.entries(baselineJson.pages ?? {})) {
    if (!currentPages.has(page)) console.warn(`⚠️  ${page}: no prerendered HTML in this build, page JS not checked.`);
    check(`page ${page} (JS gzip)`, pageConfig?.jsGzipBytes, currentPages.get(page)?.jsGzipBytes ?? 0, pageThresholds);
  }

  const currentRoutes = buildRouteMap(currentJson);
  for (const [route, routeConfig] of Object.entries(baselineJson.routes ?? {})) {
    check(route, routeConfig?.serverBytes, currentRoutes.get(route)?.serverBytes ?? 0, getThresholds(routeConfig, globalThresholds));
  }

  const errors = issues.filter(i => i.level === 'error');
  const warnings = issues.filter(i => i.level === 'warn');

  if (issues.length === 0) {
    console.log('✅ Bundle size check passed (no regressions over thresholds).');
    process.exit(0);
  }

  console.log('📦 Bundle size regressions detected:\n');

  for (const issue of issues) {
    const thresholdText = `threshold: ${formatPercent(issue.threshold.ratio)} or ${formatBytes(issue.threshold.bytes)}`;
    console.log(
      `${issue.level.toUpperCase()} ${issue.key}: ` +
        `${formatBytes(issue.baseline)} → ${formatBytes(issue.current)} ` +
        `(+${formatBytes(issue.deltaBytes)}, +${formatPercent(issue.deltaRatio)}) (${thresholdText})`
    );
  }

  console.log('');
  console.log(`Summary: ${errors.length} error(s), ${warnings.length} warning(s).`);

  if (errors.length > 0 || (failOnWarn && warnings.length > 0)) {
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Failed to compare bundle sizes:', error?.message ?? error);
  process.exit(1);
});
