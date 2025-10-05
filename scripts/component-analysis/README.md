# Component Analysis Scripts

This directory contains automated analysis scripts for Phase 1 (Discovery & Audit) of the Component Library Extraction plan.

## Scripts

### 1. `analyze-components.mjs`

Generates a comprehensive inventory of all UI components with:

- Component name and file path
- Usage count (times imported across codebase)
- Lines of code (complexity metric)
- Number of dependencies (imports)
- Priority classification (High/Medium/Low)
- Category (Atom/Molecule/Organism)
- Test coverage status

**Output:**

- `component-inventory.csv` - Spreadsheet-ready format
- `component-inventory.json` - Machine-readable format
- `component-summary.json` - High-level statistics

### 2. `analyze-tailwind-patterns.mjs`

Analyzes Tailwind CSS usage patterns:

- Color token usage vs hardcoded colors
- Spacing patterns (padding, margin, gap)
- Typography patterns (fonts, sizes, weights)
- Most common class combinations
- Recommendations for standardization

**Output:**

- `tailwind-patterns.json` - Detailed pattern analysis
- `tailwind-recommendations.json` - Actionable improvements

### 3. `find-duplicates.mjs`

Identifies components with similar functionality:

- Name similarity analysis
- Prop interface comparison
- Known duplicate patterns (cards, forms, loading states)
- Consolidation opportunities

**Output:**

- `duplicate-analysis.json` - Potential duplicates and consolidation opportunities

### 4. `run-all.mjs`

Convenience script that runs all analyses sequentially.

## Usage

### Run All Analyses

```bash
node scripts/component-analysis/run-all.mjs
```

### Run Individual Analysis

```bash
node scripts/component-analysis/analyze-components.mjs
node scripts/component-analysis/analyze-tailwind-patterns.mjs
node scripts/component-analysis/find-duplicates.mjs
```

## Output Location

All reports are saved to: `scripts/component-analysis/output/`

## Next Steps

After running the analyses:

1. **Review Component Inventory**
   - Open `component-inventory.csv` in your spreadsheet tool
   - Sort by "Usage Count" to find high-priority components
   - Filter by "Has Tests" = "No" to identify testing gaps

2. **Review Duplicate Analysis**
   - Open `duplicate-analysis.json`
   - Review "consolidationOpportunities" section
   - Plan which components to merge first

3. **Review Tailwind Patterns**
   - Open `tailwind-patterns.json`
   - Check "colors.hardcodedColors" for non-token usage
   - Review "spacing.topPadding" for inconsistencies
   - Read `tailwind-recommendations.json` for action items

4. **Create Extraction Plan**
   - Use insights to prioritize which components to extract first
   - Group similar components for batch refactoring
   - Plan sprint structure based on priority and complexity

## Requirements

- Node.js 18+
- Unix-like shell (for grep commands)
- Works on macOS, Linux, and WSL on Windows

## Troubleshooting

### "command not found: grep"

Install grep (should be available on most systems):

- macOS: Built-in
- Linux: Built-in
- Windows: Use WSL or Git Bash

### Permission Denied

Make scripts executable:

```bash
chmod +x scripts/component-analysis/*.mjs
```

### No Output Directory

The scripts automatically create the output directory. If issues persist:

```bash
mkdir -p scripts/component-analysis/output
```

## Integration with CI/CD

These scripts can be integrated into your CI/CD pipeline to track component metrics over time:

```yaml
# GitHub Actions example
- name: Run Component Analysis
  run: node scripts/component-analysis/run-all.mjs

- name: Upload Reports
  uses: actions/upload-artifact@v3
  with:
    name: component-analysis
    path: scripts/component-analysis/output/
```

## Maintenance

As your component library evolves:

1. Run analyses regularly (weekly during active refactoring)
2. Track metrics over time to measure progress
3. Update known patterns in `find-duplicates.mjs` as needed
4. Adjust complexity thresholds in `analyze-components.mjs` based on your team's standards
