#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const DesignSystemAuditor = require("./design-system-audit");

class AutomatedViolationDetector {
  constructor() {
    this.auditor = new DesignSystemAuditor();
    this.issuesDir = path.join(process.cwd(), ".github", "issues");
    this.ensureIssuesDir();
    this.baselineFile = path.join(
      process.cwd(),
      ".design-system-baseline.json",
    );
  }

  ensureIssuesDir() {
    const githubDir = path.join(process.cwd(), ".github");
    if (!fs.existsSync(githubDir)) {
      fs.mkdirSync(githubDir, { recursive: true });
    }
    if (!fs.existsSync(this.issuesDir)) {
      fs.mkdirSync(this.issuesDir, { recursive: true });
    }
  }

  loadBaseline() {
    if (fs.existsSync(this.baselineFile)) {
      try {
        return JSON.parse(fs.readFileSync(this.baselineFile, "utf8"));
      } catch (error) {
        console.warn("Warning: Could not load baseline file:", error.message);
      }
    }
    return { violations: {}, lastAudit: null };
  }

  saveBaseline(data) {
    fs.writeFileSync(this.baselineFile, JSON.stringify(data, null, 2), "utf8");
  }

  detectNewViolations() {
    console.log("🔍 Running automated violation detection...");

    // Run audit silently (don't print report)
    this.auditor.scanFiles();

    const currentData = this.auditor.getReportData();
    const baseline = this.loadBaseline();

    const newViolations = this.findNewViolations(
      currentData.violations,
      baseline.violations,
    );

    if (Object.keys(newViolations).length > 0) {
      console.log(
        `🚨 Found ${this.countTotalViolations(newViolations)} new violations!`,
      );
      this.createGitHubIssues(newViolations);
      this.sendSlackNotification(newViolations);
    } else {
      console.log("✅ No new violations detected.");
    }

    // Update baseline
    this.saveBaseline({
      violations: currentData.violations,
      lastAudit: new Date().toISOString(),
    });

    return newViolations;
  }

  findNewViolations(current, baseline) {
    const newViolations = {
      hardcodedColors: [],
      hardcodedSpacing: [],
      hardcodedTypography: [],
      componentViolations: [],
      missingTokens: [],
    };

    // Helper function to check if violation is new
    const isNewViolation = (violation, baselineArray) => {
      return !baselineArray.some(
        (baselineViolation) =>
          baselineViolation.file === violation.file &&
          baselineViolation.line === violation.line &&
          baselineViolation.violation === violation.violation,
      );
    };

    // Check each violation type
    Object.keys(newViolations).forEach((type) => {
      if (current[type]) {
        newViolations[type] = current[type].filter((violation) =>
          isNewViolation(violation, baseline[type] || []),
        );
      }
    });

    return newViolations;
  }

  countTotalViolations(violations) {
    return Object.values(violations).reduce((sum, arr) => sum + arr.length, 0);
  }

  createGitHubIssues(newViolations) {
    const totalNew = this.countTotalViolations(newViolations);

    if (totalNew === 0) return;

    // Create a summary issue for all new violations
    const issueTitle = `🚨 Design System Violations Detected (${totalNew} new)`;
    const issueBody = this.formatGitHubIssueBody(newViolations);

    this.createGitHubIssue(issueTitle, issueBody, [
      "design-system",
      "violations",
      "automated",
    ]);

    // Create individual issues for high-priority violations
    const highPriorityViolations = [
      ...newViolations.componentViolations.slice(0, 3), // Top 3 component violations
      ...newViolations.hardcodedColors.slice(0, 2), // Top 2 color violations
    ];

    highPriorityViolations.forEach((violation, index) => {
      const title = `Design System Violation: ${violation.type.replace(/([A-Z])/g, " $1").toLowerCase()}`;
      const body = this.formatIndividualIssueBody(violation);
      this.createGitHubIssue(title, body, [
        "design-system",
        "violation",
        violation.type,
      ]);
    });
  }

  createGitHubIssue(title, body, labels) {
    const issueFile = path.join(
      this.issuesDir,
      `${Date.now()}-${title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.md`,
    );

    const issueContent = `---
title: ${title}
labels: ${labels.join(", ")}
---

${body}
`;

    fs.writeFileSync(issueFile, issueContent, "utf8");
    console.log(`📝 Created GitHub issue draft: ${issueFile}`);

    // If GitHub CLI is available, create the actual issue
    try {
      const command = `gh issue create --title "${title}" --body "${body.replace(/"/g, '\\"')}" --label "${labels.join(",")}"`;
      execSync(command, { stdio: "inherit" });
      console.log(`✅ Created GitHub issue: ${title}`);
    } catch (error) {
      console.log(
        `⚠️  GitHub CLI not available or failed. Issue draft saved to: ${issueFile}`,
      );
    }
  }

  formatGitHubIssueBody(newViolations) {
    const date = new Date().toLocaleDateString();
    let body = `## Design System Violations Detected

**Date:** ${date}
**Total New Violations:** ${this.countTotalViolations(newViolations)}

### Summary

`;

    const violationTypes = {
      componentViolations: "🧩 Component Violations",
      hardcodedColors: "🎨 Hardcoded Colors",
      hardcodedSpacing: "📏 Hardcoded Spacing",
      hardcodedTypography: "📝 Hardcoded Typography",
      missingTokens: "🔗 Missing Token Imports",
    };

    Object.entries(violationTypes).forEach(([key, label]) => {
      if (newViolations[key] && newViolations[key].length > 0) {
        body += `- ${label}: ${newViolations[key].length}\n`;
      }
    });

    body += "\n### Details\n\n";

    Object.entries(violationTypes).forEach(([key, label]) => {
      if (newViolations[key] && newViolations[key].length > 0) {
        body += `#### ${label} (${newViolations[key].length})\n\n`;
        body += "| File | Line | Violation |\n";
        body += "|------|------|-----------|\n";

        newViolations[key].slice(0, 10).forEach((v) => {
          body += `| \`${v.file}\` | ${v.line} | \`${v.violation.replace(/\|/g, "\\|")}\` |\n`;
        });

        if (newViolations[key].length > 10) {
          body += `\n*... and ${newViolations[key].length - 10} more violations*\n`;
        }

        body += "\n";
      }
    });

    body += `### Recommended Actions

1. **Review and fix violations** in the affected files
2. **Run migration scripts** for automated fixes:
   - \`npm run migrate-colors\`
   - \`npm run migrate-spacing\`
   - \`npm run migrate-text-classes\`

3. **Update design system documentation** if needed

### Automated Detection

This issue was created automatically by the Design System Violation Detection system.
Last baseline updated: ${new Date().toISOString()}

---
*This issue was auto-generated. Please address the violations and close this issue once resolved.*`;

    return body;
  }

  formatIndividualIssueBody(violation) {
    const recommendations = {
      "component-violation":
        "Replace raw HTML tags with design system components. Use `<Text>`, `<Card>`, `<Button>` components.",
      "hardcoded-color":
        "Replace hardcoded colors with design system tokens like `text-blackCorp`, `bg-primary`, etc.",
      "hardcoded-spacing":
        "Replace hardcoded spacing with design system tokens like `p-component-md`, `m-component-sm`, etc.",
      "hardcoded-typography":
        'Replace hardcoded typography with design system components. Use `<Text variant="h1">` instead of raw HTML.',
      "missing-tokens":
        "Import design system tokens or ensure proper token usage in this file.",
    };

    return `## Design System Violation

**File:** \`${violation.file}\`
**Line:** ${violation.line}
**Type:** ${violation.type}
**Violation:** \`${violation.violation}\`

### Recommended Fix

${recommendations[violation.type] || "Please review the design system guidelines and fix this violation."}

### Location
\`\`\`
${violation.file}:${violation.line}
${violation.violation}
\`\`\`

### Automated Detection

This issue was created automatically by the Design System Violation Detection system.

---
*This issue was auto-generated. Please fix the violation and close this issue.*`;
  }

  sendSlackNotification(newViolations) {
    const totalNew = this.countTotalViolations(newViolations);

    if (totalNew === 0) return;

    const slackMessage = {
      text: `🚨 Design System Alert: ${totalNew} new violations detected!`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🚨 Design System Violations Detected",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${totalNew} new violations* found in the codebase.\n\n*Breakdown:*`,
          },
        },
      ],
    };

    // Add violation counts
    const fields = [];
    if (newViolations.componentViolations.length > 0) {
      fields.push({
        type: "mrkdwn",
        text: `🧩 *Component:* ${newViolations.componentViolations.length}`,
      });
    }
    if (newViolations.hardcodedColors.length > 0) {
      fields.push({
        type: "mrkdwn",
        text: `🎨 *Colors:* ${newViolations.hardcodedColors.length}`,
      });
    }
    if (newViolations.hardcodedSpacing.length > 0) {
      fields.push({
        type: "mrkdwn",
        text: `📏 *Spacing:* ${newViolations.hardcodedSpacing.length}`,
      });
    }

    if (fields.length > 0) {
      slackMessage.blocks.push({
        type: "section",
        fields: fields,
      });
    }

    slackMessage.blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "Check the GitHub issues for details and fix recommendations.",
      },
    });

    // Try to send Slack notification
    try {
      const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (slackWebhookUrl) {
        // Note: In a real implementation, you'd use a proper HTTP client
        console.log(
          "📢 Slack notification would be sent:",
          JSON.stringify(slackMessage, null, 2),
        );
        console.log(
          `🔗 Webhook URL configured: ${slackWebhookUrl ? "Yes" : "No"}`,
        );
      } else {
        console.log(
          "⚠️  Slack webhook URL not configured. Set SLACK_WEBHOOK_URL environment variable.",
        );
        console.log(
          "📢 Slack notification payload:",
          JSON.stringify(slackMessage, null, 2),
        );
      }
    } catch (error) {
      console.error("❌ Failed to send Slack notification:", error.message);
    }
  }
}

// Run the automated detection
if (require.main === module) {
  const detector = new AutomatedViolationDetector();
  const newViolations = detector.detectNewViolations();

  // Exit with error code if new violations found
  const totalNew = detector.countTotalViolations(newViolations);
  process.exit(totalNew > 0 ? 1 : 0);
}

module.exports = AutomatedViolationDetector;
