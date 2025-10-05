const fs = require("fs");
const glob = require("glob");
const path = require("path");

/**
 * Typography Coherence Audit Script
 *
 * Analyzes typography usage across the codebase to identify:
 * - Direct HTML heading usage (<Text as="h1" variant="h1">, <Text as="h2" variant="h2">, <Text as="h3" variant="h3">)
 * - Hardcoded text sizing classes
 * - Text component adoption
 * - Typography consistency patterns
 */

function getLineNumber(content, index) {
  const lines = content.substring(0, index).split("\n");
  return lines.length;
}

function getContext(content, index, radius = 2) {
  const lines = content.split("\n");
  const lineNum = getLineNumber(content, index);
  const start = Math.max(0, lineNum - radius - 1);
  const end = Math.min(lines.length, lineNum + radius);
  return lines.slice(start, end).join("\n");
}

function analyzeTypography() {
  console.log("🔤 Starting typography coherence analysis...\n");

  const typographyStats = {
    directHeadings: { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 },
    hardcodedTextSizes: {},
    textComponentUsage: 0,
    filesWithTypography: 0,
    totalTypographyElements: 0,
    directElements: [], // Array to store detailed info
  };

  // Find all TypeScript/React files
  const files = glob.sync("**/*.{tsx,jsx,ts,js}", {
    ignore: ["node_modules/**", ".next/**", "out/**"],
  });

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    let hasTypography = false;

    // Count direct HTML headings
    const headingMatches = content.match(/<h[1-6]\b[^>]*>/g);
    if (headingMatches) {
      headingMatches.forEach((match) => {
        const headingType = match.match(/<h([1-6])\b/);
        if (headingType) {
          const index = content.indexOf(match);
          const line = getLineNumber(content, index);
          const context = getContext(content, index);
          typographyStats.directHeadings[`h${headingType[1]}`]++;
          typographyStats.directElements.push({
            type: `h${headingType[1]}`,
            file: file,
            line: line,
            context: context,
            element: match,
          });
          hasTypography = true;
        }
      });
    }

    // Count hardcoded text sizes
    const textSizeMatches = content.match(
      /\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)\b/g,
    );
    if (textSizeMatches) {
      textSizeMatches.forEach((match) => {
        typographyStats.hardcodedTextSizes[match] =
          (typographyStats.hardcodedTextSizes[match] || 0) + 1;
      });
      hasTypography = true;
    }

    // Count Text component usage
    const textComponentMatches = content.match(/<Text\b[^>]*>/g);
    if (textComponentMatches) {
      typographyStats.textComponentUsage += textComponentMatches.length;
      hasTypography = true;
    }

    if (hasTypography) {
      typographyStats.filesWithTypography++;
    }
  });

  // Calculate totals
  typographyStats.totalTypographyElements =
    Object.values(typographyStats.directHeadings).reduce(
      (sum, count) => sum + count,
      0,
    ) +
    Object.values(typographyStats.hardcodedTextSizes).reduce(
      (sum, count) => sum + count,
      0,
    ) +
    typographyStats.textComponentUsage;

  // Display results
  console.log("📊 Typography Coherence Analysis Results");
  console.log("==========================================\n");

  console.log("🎯 Direct HTML Typography Elements Usage:");
  Object.entries(typographyStats.directHeadings).forEach(([tag, count]) => {
    if (count > 0) {
      console.log(`   ${tag.padEnd(3)} → ${count} instances`);
    }
  });

  console.log(
    `\n📏 Hardcoded Text Sizes (${Object.keys(typographyStats.hardcodedTextSizes).length} unique classes):`,
  );
  Object.entries(typographyStats.hardcodedTextSizes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([className, count]) => {
      console.log(`   ${className.padEnd(12)} → ${count} usages`);
    });

  console.log(`\n🧩 Text Component Usage:`);
  console.log(
    `   <Text> components → ${typographyStats.textComponentUsage} instances`,
  );

  console.log(`\n📁 Files Analysis:`);
  console.log(
    `   Files with typography → ${typographyStats.filesWithTypography}`,
  );
  console.log(`   Total files scanned → ${files.length}`);
  console.log(
    `   Typography coverage → ${((typographyStats.filesWithTypography / files.length) * 100).toFixed(1)}%`,
  );

  console.log(`\n📈 Migration Readiness:`);
  const directHeadingsTotal = Object.values(
    typographyStats.directHeadings,
  ).reduce((sum, count) => sum + count, 0);
  const migrationProgress =
    (typographyStats.textComponentUsage /
      (typographyStats.textComponentUsage + directHeadingsTotal)) *
    100;

  console.log(`   Text component adoption → ${migrationProgress.toFixed(1)}%`);
  console.log(`   Remaining direct HTML → ${directHeadingsTotal} elements`);
  console.log(
    `   Hardcoded text classes → ${Object.values(typographyStats.hardcodedTextSizes).reduce((sum, count) => sum + count, 0)} instances`,
  );

  // Detailed breakdown of remaining elements
  console.log(
    `\n📋 Detailed Breakdown of ${typographyStats.directElements.length} Remaining Direct HTML Elements:`,
  );
  console.log("=".repeat(80));

  // Group by file for better organization
  const groupedByFile = typographyStats.directElements.reduce((acc, elem) => {
    if (!acc[elem.file]) acc[elem.file] = [];
    acc[elem.file].push(elem);
    return acc;
  }, {});

  // Sort files by priority (pages first, then components)
  const sortedFiles = Object.keys(groupedByFile).sort((a, b) => {
    const isPageA = a.includes("/page.") || a.includes("/page/");
    const isPageB = b.includes("/page.") || b.includes("/page/");
    if (isPageA && !isPageB) return -1;
    if (!isPageA && isPageB) return 1;
    return a.localeCompare(b);
  });

  sortedFiles.forEach((file) => {
    console.log(`\n📄 ${file}:`);
    groupedByFile[file].forEach((elem, index) => {
      console.log(`   ${index + 1}. <${elem.type}> at line ${elem.line}`);
      console.log(`      Element: ${elem.element}`);
      console.log(`      Context:`);
      elem.context.split("\n").forEach((line, i) => {
        console.log(`        ${line}`);
      });
      console.log("");
    });
  });

  // Recommendations
  console.log(`\n💡 Recommendations:`);
  if (directHeadingsTotal > 0) {
    console.log(
      `   🔴 Replace ${directHeadingsTotal} direct HTML typography elements with <Text as="h1|h2|h3">`,
    );
  }
  if (Object.keys(typographyStats.hardcodedTextSizes).length > 10) {
    console.log(
      `   🟡 Review ${Object.keys(typographyStats.hardcodedTextSizes).length} hardcoded text sizes for semantic variants`,
    );
  }
  if (typographyStats.textComponentUsage === 0) {
    console.log(
      `   🔴 Start migration by adopting Text component in high-priority components`,
    );
  }

  console.log(`\n✅ Analysis complete!`);

  return typographyStats;
}

// Export for use in other scripts
module.exports = { analyzeTypography };

// Run if called directly
if (require.main === module) {
  analyzeTypography();
}
