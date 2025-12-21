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

  const currentRoutes = buildRouteMap(currentJson);

  const issues = [];

  const baselineClient = baselineJson.clientTotalBytes;
  const currentClient = currentJson?.client?.totalBytes ?? 0;
  if (Number.isFinite(baselineClient) && baselineClient > 0) {
    const deltaBytes = currentClient - baselineClient;
    const deltaRatio = deltaBytes / baselineClient;

    if (deltaBytes > 0) {
      if (isExceeded(deltaBytes, deltaRatio, globalThresholds.error)) {
        issues.push({
          level: 'error',
          kind: 'client',
          key: 'client.totalBytes',
          baseline: baselineClient,
          current: currentClient,
          deltaBytes,
          deltaRatio,
          threshold: globalThresholds.error,
        });
      } else if (isExceeded(deltaBytes, deltaRatio, globalThresholds.warning)) {
        issues.push({
          level: 'warn',
          kind: 'client',
          key: 'client.totalBytes',
          baseline: baselineClient,
          current: currentClient,
          deltaBytes,
          deltaRatio,
          threshold: globalThresholds.warning,
        });
      }
    }
  }

  const baselineRoutes = baselineJson.routes ?? {};
  for (const [route, routeConfig] of Object.entries(baselineRoutes)) {
    const baselineServerBytes = routeConfig?.serverBytes;
    if (!Number.isFinite(baselineServerBytes) || baselineServerBytes <= 0) continue;

    const currentEntry = currentRoutes.get(route);
    const currentServerBytes = currentEntry?.serverBytes ?? 0;

    const deltaBytes = currentServerBytes - baselineServerBytes;
    const deltaRatio = deltaBytes / baselineServerBytes;

    if (deltaBytes <= 0) continue;

    const { warning, error } = getThresholds(routeConfig, globalThresholds);

    if (isExceeded(deltaBytes, deltaRatio, error)) {
      issues.push({
        level: 'error',
        kind: 'route',
        key: route,
        baseline: baselineServerBytes,
        current: currentServerBytes,
        deltaBytes,
        deltaRatio,
        threshold: error,
      });
    } else if (isExceeded(deltaBytes, deltaRatio, warning)) {
      issues.push({
        level: 'warn',
        kind: 'route',
        key: route,
        baseline: baselineServerBytes,
        current: currentServerBytes,
        deltaBytes,
        deltaRatio,
        threshold: warning,
      });
    }
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
