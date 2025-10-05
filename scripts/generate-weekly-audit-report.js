#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const DesignSystemAuditor = require("./design-system-audit");

// Extend DesignSystemAuditor to expose report data
class ExtendedDesignSystemAuditor extends DesignSystemAuditor {
  generateReport() {
    // Store the data instead of printing
    this.reportData = {
      violations: this.violations,
      stats: this.stats,
    };
  }

  getReportData() {
    return (
      this.reportData || {
        violations: {},
        stats: { filesScanned: 0, totalViolations: 0 },
      }
    );
  }
}

class WeeklyAuditReportGenerator {
  constructor() {
    this.auditor = new ExtendedDesignSystemAuditor();
    this.reportDir = path.join(process.cwd(), "reports");
    this.ensureReportDir();
  }

  ensureReportDir() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  generateWeeklyReport() {
    console.log("🔍 Running design system audit...");
    this.auditor.scanFiles();

    const reportData = this.auditor.getReportData();
    const report = this.formatMarkdownReport(reportData);

    const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const filename = `design-system-audit-${timestamp}.md`;
    const filepath = path.join(this.reportDir, filename);

    fs.writeFileSync(filepath, report, "utf8");

    console.log(`📊 Weekly audit report generated: ${filepath}`);
    console.log(
      `📈 Total violations found: ${reportData.stats.totalViolations}`,
    );

    return {
      filepath,
      violations: reportData.stats.totalViolations,
      report,
    };
  }

  formatMarkdownReport(data) {
    const { violations, stats } = data;
    const date = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let report = `# Design System Audit Report - ${date}

## Executive Summary

- **Files Scanned**: ${stats.filesScanned}
- **Total Violations**: ${stats.totalViolations}
- **Audit Date**: ${new Date().toISOString()}

## Violation Breakdown

`;

    // Colors section
    if (violations.hardcodedColors.length > 0) {
      report += `### 🎨 Hardcoded Colors (${violations.hardcodedColors.length})

| File | Line | Violation |
|------|------|-----------|
${violations.hardcodedColors
  .slice(0, 20)
  .map((v) => `| \`${v.file}\` | ${v.line} | \`${v.violation}\` |`)
  .join("\n")}

${violations.hardcodedColors.length > 20 ? `*... and ${violations.hardcodedColors.length - 20} more violations*\n\n` : "\n"}
`;
    }

    // Spacing section
    if (violations.hardcodedSpacing.length > 0) {
      report += `### 📏 Hardcoded Spacing (${violations.hardcodedSpacing.length})

| File | Line | Violation |
|------|------|-----------|
${violations.hardcodedSpacing
  .slice(0, 20)
  .map((v) => `| \`${v.file}\` | ${v.line} | \`${v.violation}\` |`)
  .join("\n")}

${violations.hardcodedSpacing.length > 20 ? `*... and ${violations.hardcodedSpacing.length - 20} more violations*\n\n` : "\n"}
`;
    }

    // Typography section
    if (violations.hardcodedTypography.length > 0) {
      report += `### 📝 Hardcoded Typography (${violations.hardcodedTypography.length})

| File | Line | Violation |
|------|------|-----------|
${violations.hardcodedTypography
  .slice(0, 20)
  .map((v) => `| \`${v.file}\` | ${v.line} | \`${v.violation}\` |`)
  .join("\n")}

${violations.hardcodedTypography.length > 20 ? `*... and ${violations.hardcodedTypography.length - 20} more violations*\n\n` : "\n"}
`;
    }

    // Component violations section
    if (violations.componentViolations.length > 0) {
      report += `### 🧩 Component Violations (${violations.componentViolations.length})

| File | Line | Violation |
|------|------|-----------|
${violations.componentViolations
  .slice(0, 20)
  .map(
    (v) =>
      `| \`${v.file}\` | ${v.line} | \`${v.violation.replace(/\|/g, "\\|")}\` |`,
  )
  .join("\n")}

${violations.componentViolations.length > 20 ? `*... and ${violations.componentViolations.length - 20} more violations*\n\n` : "\n"}
`;
    }

    // Missing tokens section
    if (violations.missingTokens.length > 0) {
      report += `### 🔗 Missing Token Imports (${violations.missingTokens.length})

| File | Issue |
|------|-------|
${violations.missingTokens
  .slice(0, 20)
  .map((v) => `| \`${v.file}\` | ${v.violation} |`)
  .join("\n")}

${violations.missingTokens.length > 20 ? `*... and ${violations.missingTokens.length - 20} more violations*\n\n` : "\n"}
`;
    }

    // Recommendations
    report += `## Recommendations

### Quick Fixes

**For Hardcoded Colors:**
- Replace hardcoded colors with design tokens
- Use \`text-blackCorp\` instead of \`text-gray-700\`
- Use \`bg-primary\` instead of \`bg-[#FF0037]\`
- Use \`border-bColor\` instead of \`border-gray-300\`

**For Hardcoded Spacing:**
- Replace Tailwind spacing with design tokens
- Use \`p-component-md\` instead of \`p-4\`
- Use \`m-component-sm\` instead of \`m-2\`
- Use \`gap-md\` instead of \`space-y-4\`

**For Hardcoded Typography:**
- Replace raw HTML/text classes with design system components
- Use \`<Text variant="h1">\` instead of \`<h1 className="text-2xl font-bold">\`
- Use \`<Text variant="body">\` instead of \`<p className="text-base">\`

**For Component Violations:**
- Use design system components for all UI elements
- Use \`<Text>\` component for all text content
- Use \`<Card>\` component for card layouts
- Use \`<Button>\` component for interactive elements

### Migration Scripts

Run the following migration scripts to automatically fix common violations:

\`\`\`bash
npm run migrate-colors
npm run migrate-spacing
npm run migrate-text-classes
\`\`\`

### Priority Actions

1. **High Priority**: Fix component violations (raw HTML tags)
2. **Medium Priority**: Replace hardcoded colors and spacing
3. **Low Priority**: Typography standardization

---

*This report was generated automatically by the Design System Audit tool.*
*Report generated on: ${new Date().toISOString()}*
`;

    return report;
  }
}

// Run the weekly report generator
if (require.main === module) {
  const generator = new WeeklyAuditReportGenerator();
  const result = generator.generateWeeklyReport();

  // Exit with error code if violations found
  process.exit(result.violations > 0 ? 1 : 0);
}

module.exports = WeeklyAuditReportGenerator;
