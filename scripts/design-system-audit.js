#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const glob = require("glob");

// Design system tokens and patterns
const DESIGN_TOKENS = {
  colors: [
    "primary",
    "primarydark",
    "primarySoft",
    "secondary",
    "whiteCorp",
    "darkCorp",
    "blackCorp",
    "fullBlackCorp",
    "bColor",
    "gray-50",
    "gray-100",
    "gray-200",
    "gray-300",
    "gray-400",
    "gray-500",
    "gray-600",
    "gray-700",
    "gray-800",
    "gray-900",
    "success",
    "warning",
    "error",
    "primary-hover",
    "primary-focus",
    "primary-active",
    "primary-disabled",
  ],
  spacing: [
    "component-xs",
    "component-sm",
    "component-md",
    "component-lg",
    "component-xl",
    "component-2xl",
    "page-x",
    "page-y",
    "page-top",
    "page-top-large",
    "section-x",
    "section-y",
    "section-gap",
    "container-x",
    "container-x-lg",
    "container-y",
    "gap-xs",
    "gap-sm",
    "gap-md",
    "gap-lg",
    "gap-xl",
    "margin-xs",
    "margin-sm",
    "margin-md",
    "margin-lg",
    "margin-xl",
  ],
  typography: [
    "heading-1",
    "heading-2",
    "heading-3",
    "body-lg",
    "body-md",
    "body-sm",
    "caption",
  ],
};

// Patterns to detect violations
const VIOLATION_PATTERNS = {
  hardcodedColors: [
    /#[0-9a-fA-F]{3,8}/g, // Hex colors
    /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/g, // RGB/RGBA
    /hsl\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*(?:,\s*[\d.]+\s*)?\)/g, // HSL/HSLA
  ],
  hardcodedSpacing: [
    /\b(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr)-(\d+|auto)\b/g, // Tailwind spacing
    /\bspace-(x|y)-\d+\b/g, // Space utilities
  ],
  hardcodedTypography: [
    /\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b/g, // Font sizes
    /\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/g, // Font weights
    /\bleading-(none|tight|snug|normal|relaxed|loose|\d+)\b/g, // Line heights
    /\btracking-(tighter|tight|normal|wide|wider|widest)\b/g, // Letter spacing
  ],
  componentViolations: [
    /<h[1-6][^>]*>/g, // Raw heading tags
    /<p[^>]*>/g, // Raw paragraph tags
    /<span[^>]*className="[^"]*text-[^"]*"[^>]*>/g, // Spans with text classes
  ],
};

class DesignSystemAuditor {
  constructor() {
    this.violations = {
      hardcodedColors: [],
      hardcodedSpacing: [],
      hardcodedTypography: [],
      componentViolations: [],
      missingTokens: [],
    };
    this.stats = {
      filesScanned: 0,
      totalViolations: 0,
    };
  }

  scanFiles() {
    const files = glob.sync("**/*.{tsx,jsx,ts,js}", {
      ignore: [
        "node_modules/**",
        "dist/**",
        "build/**",
        ".next/**",
        "coverage/**",
      ],
    });

    console.log(
      `🔍 Scanning ${files.length} files for design system compliance...\n`,
    );

    files.forEach((file) => {
      this.scanFile(file);
    });

    this.stats.filesScanned = files.length;
    this.generateReport();
  }

  scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const relativePath = path.relative(process.cwd(), filePath);

      // Check for hardcoded colors
      VIOLATION_PATTERNS.hardcodedColors.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          // Skip if it's in a comment or design token definition
          if (!this.isInCommentOrToken(content, match.index)) {
            this.violations.hardcodedColors.push({
              file: relativePath,
              line: this.getLineNumber(content, match.index),
              violation: match[0],
              type: "hardcoded-color",
            });
          }
        }
      });

      // Check for hardcoded spacing
      VIOLATION_PATTERNS.hardcodedSpacing.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          this.violations.hardcodedSpacing.push({
            file: relativePath,
            line: this.getLineNumber(content, match.index),
            violation: match[0],
            type: "hardcoded-spacing",
          });
        }
      });

      // Check for hardcoded typography
      VIOLATION_PATTERNS.hardcodedTypography.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          this.violations.hardcodedTypography.push({
            file: relativePath,
            line: this.getLineNumber(content, match.index),
            violation: match[0],
            type: "hardcoded-typography",
          });
        }
      });

      // Check for component violations
      VIOLATION_PATTERNS.componentViolations.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          this.violations.componentViolations.push({
            file: relativePath,
            line: this.getLineNumber(content, match.index),
            violation: match[0],
            type: "component-violation",
          });
        }
      });

      // Check for missing design token usage
      this.checkMissingTokens(content, relativePath);
    } catch (error) {
      console.error(`Error scanning ${filePath}:`, error.message);
    }
  }

  isInCommentOrToken(content, index) {
    // Simple check - in a real implementation, you'd use AST parsing
    const before = content.substring(0, index);
    return (
      before.includes("//") || before.includes("/*") || before.includes("*")
    );
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split("\n").length;
  }

  checkMissingTokens(content, filePath) {
    // Check if file uses Tailwind classes but doesn't import design tokens
    const hasTailwindClasses =
      /\b(class|className)="[^"]*(text-|bg-|border-|p-|m-|space-)/.test(
        content,
      );
    const hasDesignTokenImports = /@components\/ui|@styles|@types\/ui/.test(
      content,
    );

    if (
      hasTailwindClasses &&
      !hasDesignTokenImports &&
      !filePath.includes("node_modules")
    ) {
      this.violations.missingTokens.push({
        file: filePath,
        violation: "File uses Tailwind classes without importing design tokens",
        type: "missing-tokens",
      });
    }
  }

  generateReport() {
    console.log("📊 Design System Audit Report\n");
    console.log("=".repeat(50));

    const totalViolations = Object.values(this.violations).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
    this.stats.totalViolations = totalViolations;

    console.log(`📁 Files scanned: ${this.stats.filesScanned}`);
    console.log(`🚨 Total violations: ${totalViolations}\n`);

    // Colors
    if (this.violations.hardcodedColors.length > 0) {
      console.log(
        `🎨 Hardcoded Colors: ${this.violations.hardcodedColors.length}`,
      );
      this.violations.hardcodedColors.slice(0, 10).forEach((v) => {
        console.log(`  ${v.file}:${v.line} - ${v.violation}`);
      });
      if (this.violations.hardcodedColors.length > 10) {
        console.log(
          `  ... and ${this.violations.hardcodedColors.length - 10} more`,
        );
      }
      console.log("");
    }

    // Spacing
    if (this.violations.hardcodedSpacing.length > 0) {
      console.log(
        `📏 Hardcoded Spacing: ${this.violations.hardcodedSpacing.length}`,
      );
      this.violations.hardcodedSpacing.slice(0, 10).forEach((v) => {
        console.log(`  ${v.file}:${v.line} - ${v.violation}`);
      });
      if (this.violations.hardcodedSpacing.length > 10) {
        console.log(
          `  ... and ${this.violations.hardcodedSpacing.length - 10} more`,
        );
      }
      console.log("");
    }

    // Typography
    if (this.violations.hardcodedTypography.length > 0) {
      console.log(
        `📝 Hardcoded Typography: ${this.violations.hardcodedTypography.length}`,
      );
      this.violations.hardcodedTypography.slice(0, 10).forEach((v) => {
        console.log(`  ${v.file}:${v.line} - ${v.violation}`);
      });
      if (this.violations.hardcodedTypography.length > 10) {
        console.log(
          `  ... and ${this.violations.hardcodedTypography.length - 10} more`,
        );
      }
      console.log("");
    }

    // Components
    if (this.violations.componentViolations.length > 0) {
      console.log(
        `🧩 Component Violations: ${this.violations.componentViolations.length}`,
      );
      this.violations.componentViolations.slice(0, 10).forEach((v) => {
        console.log(`  ${v.file}:${v.line} - ${v.violation}`);
      });
      if (this.violations.componentViolations.length > 10) {
        console.log(
          `  ... and ${this.violations.componentViolations.length - 10} more`,
        );
      }
      console.log("");
    }

    // Missing tokens
    if (this.violations.missingTokens.length > 0) {
      console.log(
        `🔗 Missing Token Imports: ${this.violations.missingTokens.length}`,
      );
      this.violations.missingTokens.slice(0, 10).forEach((v) => {
        console.log(`  ${v.file} - ${v.violation}`);
      });
      if (this.violations.missingTokens.length > 10) {
        console.log(
          `  ... and ${this.violations.missingTokens.length - 10} more`,
        );
      }
      console.log("");
    }

    // Recommendations
    this.printRecommendations();

    // Exit code based on violations
    process.exit(totalViolations > 0 ? 1 : 0);
  }

  getReportData() {
    const totalViolations = Object.values(this.violations).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
    this.stats.totalViolations = totalViolations;

    return {
      violations: this.violations,
      stats: this.stats,
    };
  }

  printRecommendations() {
    console.log("💡 Recommendations:");
    console.log("");

    if (this.violations.hardcodedColors.length > 0) {
      console.log("• Replace hardcoded colors with design tokens:");
      console.log("  - Use text-blackCorp instead of text-gray-700");
      console.log("  - Use bg-primary instead of bg-[#FF0037]");
      console.log("  - Use border-bColor instead of border-gray-300");
    }

    if (this.violations.hardcodedSpacing.length > 0) {
      console.log("• Replace hardcoded spacing with design tokens:");
      console.log("  - Use p-component-md instead of p-4");
      console.log("  - Use m-component-sm instead of m-2");
      console.log("  - Use gap-md instead of space-y-4");
    }

    if (this.violations.hardcodedTypography.length > 0) {
      console.log("• Replace hardcoded typography with design tokens:");
      console.log(
        '  - Use <Text variant="h1"> instead of <h1 className="text-2xl font-bold">',
      );
      console.log(
        '  - Use <Text variant="body"> instead of <p className="text-base">',
      );
    }

    if (this.violations.componentViolations.length > 0) {
      console.log("• Use design system components:");
      console.log("  - Use <Text> component for all text content");
      console.log("  - Use <Card> component for card layouts");
      console.log("  - Use <Button> component for interactive elements");
    }

    console.log("");
    console.log("Run migration scripts:");
    console.log("• npm run migrate-colors");
    console.log("• npm run migrate-spacing");
    console.log("• npm run migrate-text-classes");
    console.log("");
  }
}

// Run the audit
if (require.main === module) {
  const auditor = new DesignSystemAuditor();
  auditor.scanFiles();
}

module.exports = DesignSystemAuditor;
