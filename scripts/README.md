# Design System Monitoring Scripts

This directory contains automated scripts for monitoring and maintaining design system compliance.

## Scripts Overview

### `design-system-audit.js`

The core audit script that scans the codebase for design system violations including:

- Hardcoded colors (hex, RGB, HSL values)
- Hardcoded spacing (Tailwind classes like `p-4`, `m-2`)
- Hardcoded typography (font size/weight classes)
- Component violations (raw HTML tags instead of design system components)

**Usage:**

```bash
yarn audit:design-system
```

### `generate-weekly-audit-report.js`

Generates comprehensive markdown reports for weekly design system audits. Creates detailed reports in the `reports/` directory with:

- Executive summary with violation counts
- Detailed violation breakdowns by category
- File-specific violation details
- Recommendations and migration scripts

**Usage:**

```bash
yarn audit:weekly-report
```

**Output:** `reports/design-system-audit-YYYY-MM-DD.md`

### `automated-violation-detection.js`

Detects new violations compared to a baseline and automatically:

- Creates GitHub issues for new violations
- Sends Slack notifications (when webhook is configured)
- Updates baseline for future comparisons

**Usage:**

```bash
yarn audit:detect-violations
```

**Environment Variables:**

- `SLACK_WEBHOOK_URL`: Webhook URL for Slack notifications
- `GITHUB_TOKEN`: Automatically provided in CI/CD

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/design-system-audit.yml`) runs these scripts automatically:

- **Weekly (Mondays 9 AM UTC):** Generates comprehensive markdown reports
- **On pushes to main:** Runs violation detection and creates issues
- **On PRs:** Comments with violation details and recommendations

## File Structure

```
scripts/
├── design-system-audit.js              # Core audit logic
├── generate-weekly-audit-report.js     # Markdown report generator
├── automated-violation-detection.js    # GitHub/Slack automation
└── README.md                          # This documentation

reports/                               # Generated reports (created automatically)
.github/
├── workflows/design-system-audit.yml  # CI/CD workflow
└── issues/                            # GitHub issue drafts (created automatically)
```

## Baseline Management

The system maintains a `.design-system-baseline.json` file to track known violations and only alert on new ones:

```json
{
  "violations": {
    "hardcodedColors": [...],
    "hardcodedSpacing": [...],
    "componentViolations": [...]
  },
  "lastAudit": "2024-01-15T09:00:00.000Z"
}
```

## Migration Scripts

For fixing violations, use the existing migration scripts:

```bash
yarn migrate-colors      # Replace hardcoded colors with design tokens
yarn migrate-spacing     # Replace hardcoded spacing with design tokens
yarn migrate-text-classes # Replace hardcoded typography with Text components
```

## Configuration

### Slack Notifications

Set the `SLACK_WEBHOOK_URL` environment variable to enable Slack notifications:

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
```

### GitHub Issues

The script automatically creates GitHub issues using the GitHub CLI. Ensure the CI/CD environment has appropriate permissions.

## Violation Types

### Hardcoded Colors

- Hex colors: `#FF0037`, `#000000`
- RGB/RGBA: `rgb(255, 0, 55)`, `rgba(0, 0, 0, 0.5)`
- HSL/HSLA: `hsl(340, 100%, 50%)`

### Hardcoded Spacing

- Padding: `p-4`, `py-2`, `px-8`
- Margin: `m-2`, `mt-4`, `mb-6`
- Space utilities: `space-x-4`, `space-y-2`

### Hardcoded Typography

- Font sizes: `text-xs`, `text-lg`, `text-2xl`
- Font weights: `font-bold`, `font-light`
- Line heights: `leading-tight`, `leading-loose`

### Component Violations

- Raw headings: `<h1>`, `<h2>`, `<h3>`
- Raw paragraphs: `<p className="text-base">`
- Spans with text classes: `<span className="text-gray-700">`

## Recommendations

1. **Run audits regularly** to catch violations early
2. **Use migration scripts** to fix violations automatically
3. **Review baseline** periodically to ensure it's up to date
4. **Configure notifications** for immediate feedback on new violations
5. **Document exceptions** when design tokens cannot be used

## Troubleshooting

### No violations detected

- Check that files are being scanned (verify glob patterns)
- Ensure the audit script has access to all source files
- Check for syntax errors in the audit script

### False positives

- Update the baseline file to exclude known acceptable violations
- Modify violation patterns in `design-system-audit.js`
- Add exceptions for specific files or patterns

### CI/CD failures

- Check GitHub Actions permissions for issue creation
- Verify environment variables are set correctly
- Ensure all dependencies are installed in the CI environment
