#!/bin/bash
# Diagnostic script for analyzing Next.js build size
# Run this script after a build to understand what's taking up space in .next/
# Usage: ./scripts/diagnose-build-size.sh

set -e

echo "=== Next.js Build Size Diagnostics ==="
echo ""

if [ ! -d ".next" ]; then
  echo "Error: .next directory not found. Run 'yarn build' first."
  exit 1
fi

echo "Build size:"
du -sh .next || true

echo ""
echo "Directory sizes:"
du -sh .next/* 2>/dev/null | sort -h || true

echo ""
echo "Largest files/directories in .next/server:"
du -sh .next/server/* 2>/dev/null | sort -h | tail -10 || true

echo ""
echo "Largest subdirectories in .next/server/app:"
du -sh .next/server/app/* 2>/dev/null | sort -h | tail -20 || true

echo ""
echo "Sample place directory structure (barcelona):"
du -sh .next/server/app/barcelona/* 2>/dev/null | sort -h | tail -10 || true

echo ""
echo "File count in .next/server/app:"
find .next/server/app -type f | wc -l || true

echo ""
echo "Directory count in .next/server/app:"
find .next/server/app -type d | wc -l || true

echo ""
echo "=== Diagnostics complete ==="

