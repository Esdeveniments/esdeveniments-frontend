#!/usr/bin/env node

/**
 * Duplicate Component Detection Script
 *
 * Identifies components with similar functionality that could be consolidated:
 * - Similar prop interfaces
 * - Similar file names/patterns
 * - Overlapping functionality
 *
 * Usage: node scripts/component-analysis/find-duplicates.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const COMPONENTS_DIR = path.join(ROOT_DIR, "components/ui");
const OUTPUT_DIR = path.join(ROOT_DIR, "scripts/component-analysis/output");

/**
 * Get all component directories
 */
function getComponentDirectories(dir) {
  const components = [];

  function traverse(currentDir, relativePath = "") {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(currentDir, entry.name);
        const relPath = relativePath
          ? `${relativePath}/${entry.name}`
          : entry.name;

        const files = fs.readdirSync(fullPath);
        const componentFiles = files.filter(
          (f) =>
            (f.endsWith(".tsx") || f.endsWith(".jsx")) &&
            !f.endsWith(".test.tsx") &&
            !f.endsWith(".test.jsx") &&
            !f.endsWith(".stories.tsx"),
        );

        if (componentFiles.length > 0) {
          components.push({
            name: entry.name,
            path: fullPath,
            relativePath: relPath,
            files: componentFiles,
          });
        }

        traverse(fullPath, relPath);
      }
    }
  }

  traverse(dir);
  return components;
}

/**
 * Extract prop interface from component file
 */
function extractPropInterface(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");

    // Match interface or type definitions that look like props
    const interfaceRegex =
      /(?:interface|type)\s+(\w+Props)\s*(?:extends[^{]*)?{([^}]*)}/g;
    const props = [];

    let match;
    while ((match = interfaceRegex.exec(content)) !== null) {
      const interfaceName = match[1];
      const interfaceBody = match[2];

      // Extract individual prop names
      const propRegex = /(\w+)\??:\s*([^;]+);/g;
      let propMatch;
      while ((propMatch = propRegex.exec(interfaceBody)) !== null) {
        props.push({
          name: propMatch[1],
          type: propMatch[2].trim(),
        });
      }
    }

    return props;
  } catch (error) {
    return [];
  }
}

/**
 * Calculate similarity score between two prop interfaces
 */
function calculatePropSimilarity(props1, props2) {
  if (props1.length === 0 || props2.length === 0) {
    return 0;
  }

  const names1 = new Set(props1.map((p) => p.name));
  const names2 = new Set(props2.map((p) => p.name));

  const intersection = [...names1].filter((name) => names2.has(name));
  const union = new Set([...names1, ...names2]);

  return intersection.length / union.size;
}

/**
 * Calculate name similarity (Levenshtein distance)
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

function calculateNameSimilarity(name1, name2) {
  const maxLength = Math.max(name1.length, name2.length);
  const distance = levenshteinDistance(
    name1.toLowerCase(),
    name2.toLowerCase(),
  );
  return 1 - distance / maxLength;
}

/**
 * Find duplicate or similar components
 */
function findDuplicates(components) {
  const duplicates = [];
  const consolidationOpportunities = [];

  // Known patterns from the codebase
  const knownPatterns = [
    {
      pattern: "card",
      components: ["card", "cardHorizontal", "newsCard", "newsRichCard"],
      reason:
        "Multiple card variations can be consolidated into a single Card component with variants",
    },
    {
      pattern: "loading",
      components: ["cardLoading", "loading"],
      reason:
        "Loading states can be unified into a Skeleton component with variants",
    },
    {
      pattern: "form",
      components: [
        "input",
        "select",
        "textarea",
        "datePicker",
        "multiSelect",
        "radioInput",
        "rangeInput",
      ],
      reason:
        "Form components can be standardized with consistent wrapper pattern",
    },
  ];

  // Check for known patterns
  for (const pattern of knownPatterns) {
    const matchingComponents = components.filter((c) =>
      pattern.components.some((p) =>
        c.name.toLowerCase().includes(p.toLowerCase()),
      ),
    );

    if (matchingComponents.length >= 2) {
      consolidationOpportunities.push({
        pattern: pattern.pattern,
        components: matchingComponents.map((c) => ({
          name: c.name,
          path: c.relativePath,
        })),
        reason: pattern.reason,
        count: matchingComponents.length,
      });
    }
  }

  // Find similar components by name and props
  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      const comp1 = components[i];
      const comp2 = components[j];

      // Skip if already in consolidation opportunities
      if (
        consolidationOpportunities.some((opp) =>
          opp.components.some(
            (c) => c.name === comp1.name || c.name === comp2.name,
          ),
        )
      ) {
        continue;
      }

      const nameSimilarity = calculateNameSimilarity(comp1.name, comp2.name);

      // Get main files
      const mainFile1 = comp1.files[0];
      const mainFile2 = comp2.files[0];

      const props1 = extractPropInterface(path.join(comp1.path, mainFile1));
      const props2 = extractPropInterface(path.join(comp2.path, mainFile2));

      const propSimilarity = calculatePropSimilarity(props1, props2);

      // Consider similar if name similarity > 0.6 OR prop similarity > 0.5
      if (nameSimilarity > 0.6 || propSimilarity > 0.5) {
        duplicates.push({
          component1: {
            name: comp1.name,
            path: comp1.relativePath,
            props: props1.map((p) => p.name),
          },
          component2: {
            name: comp2.name,
            path: comp2.relativePath,
            props: props2.map((p) => p.name),
          },
          nameSimilarity: Math.round(nameSimilarity * 100),
          propSimilarity: Math.round(propSimilarity * 100),
          overallSimilarity: Math.round(
            ((nameSimilarity + propSimilarity) / 2) * 100,
          ),
        });
      }
    }
  }

  // Sort by similarity
  duplicates.sort((a, b) => b.overallSimilarity - a.overallSimilarity);

  return { duplicates, consolidationOpportunities };
}

/**
 * Main analysis function
 */
function runAnalysis() {
  console.log("🔍 Finding duplicate and similar components...\n");

  const components = getComponentDirectories(COMPONENTS_DIR);
  console.log(`Analyzing ${components.length} components\n`);

  const { duplicates, consolidationOpportunities } = findDuplicates(components);

  // Save report
  const report = {
    duplicates,
    consolidationOpportunities,
    summary: {
      totalComponents: components.length,
      potentialDuplicates: duplicates.length,
      consolidationOpportunities: consolidationOpportunities.length,
    },
  };

  const reportPath = path.join(OUTPUT_DIR, "duplicate-analysis.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print summary
  console.log("✅ Analysis complete!\n");
  console.log("📊 Summary:");
  console.log(`   Total components: ${report.summary.totalComponents}`);
  console.log(`   Potential duplicates: ${report.summary.potentialDuplicates}`);
  console.log(
    `   Consolidation opportunities: ${report.summary.consolidationOpportunities}`,
  );

  if (consolidationOpportunities.length > 0) {
    console.log("\n🎯 Top Consolidation Opportunities:");
    consolidationOpportunities.forEach((opp, i) => {
      console.log(
        `\n   ${i + 1}. ${opp.pattern.toUpperCase()} (${opp.count} components)`,
      );
      console.log(`      Reason: ${opp.reason}`);
      console.log("      Components:");
      opp.components.forEach((c) => {
        console.log(`         - ${c.name} (${c.path})`);
      });
    });
  }

  if (duplicates.length > 0) {
    console.log("\n⚠️  Potential Duplicates (Top 5):");
    duplicates.slice(0, 5).forEach((dup, i) => {
      console.log(
        `\n   ${i + 1}. ${dup.component1.name} ↔ ${dup.component2.name}`,
      );
      console.log(
        `      Similarity: ${dup.overallSimilarity}% (name: ${dup.nameSimilarity}%, props: ${dup.propSimilarity}%)`,
      );
    });
  }

  console.log(`\n📁 Report saved to: ${OUTPUT_DIR}/duplicate-analysis.json`);
}

// Run the analysis
runAnalysis();
