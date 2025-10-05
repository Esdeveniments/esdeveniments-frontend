#!/usr/bin/env node

/**
 * Component Analysis Script
 *
 * Analyzes the components/ui directory to generate:
 * - Component inventory with usage counts
 * - Complexity metrics (LOC, dependencies)
 * - Import patterns and relationships
 *
 * Usage: node scripts/component-analysis/analyze-components.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const COMPONENTS_DIR = path.join(ROOT_DIR, "components/ui");
const OUTPUT_DIR = path.join(ROOT_DIR, "scripts/component-analysis/output");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Get all component directories in components/ui
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

        // Check if directory contains component files
        const files = fs.readdirSync(fullPath);
        const hasComponent = files.some(
          (f) => f.endsWith(".tsx") || f.endsWith(".jsx"),
        );

        if (hasComponent) {
          components.push({
            name: entry.name,
            path: fullPath,
            relativePath: relPath,
          });
        }

        // Recursively traverse subdirectories
        traverse(fullPath, relPath);
      }
    }
  }

  traverse(dir);
  return components;
}

/**
 * Count lines of code in a file
 */
function countLinesOfCode(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const codeLines = lines.filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed !== "" && !trimmed.startsWith("//") && !trimmed.startsWith("/*")
      );
    });
    return codeLines.length;
  } catch (error) {
    return 0;
  }
}

/**
 * Count imports in a file
 */
function countImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const importMatches = content.match(/^import\s/gm) || [];
    return importMatches.length;
  } catch (error) {
    return 0;
  }
}

/**
 * Count usage of a component across the codebase
 */
function countComponentUsage(componentName) {
  try {
    // Search for imports in app/ and components/ directories
    const appImports = execSync(
      `grep -r "import.*${componentName}" ${ROOT_DIR}/app 2>/dev/null | wc -l`,
      { encoding: "utf-8" },
    ).trim();

    const componentImports = execSync(
      `grep -r "import.*${componentName}" ${ROOT_DIR}/components 2>/dev/null | wc -l`,
      { encoding: "utf-8" },
    ).trim();

    return parseInt(appImports || 0) + parseInt(componentImports || 0);
  } catch (error) {
    return 0;
  }
}

/**
 * Analyze a single component
 */
function analyzeComponent(component) {
  const files = fs.readdirSync(component.path);

  // Find main component file
  const mainFile = files.find(
    (f) =>
      f.endsWith(".tsx") &&
      !f.endsWith(".test.tsx") &&
      !f.endsWith(".stories.tsx") &&
      (f === "index.tsx" || f === `${component.name}.tsx`),
  );

  if (!mainFile) {
    return null;
  }

  const mainFilePath = path.join(component.path, mainFile);
  const linesOfCode = countLinesOfCode(mainFilePath);
  const imports = countImports(mainFilePath);
  const usageCount = countComponentUsage(component.name);

  // Check for test file
  const hasTests = files.some(
    (f) => f.endsWith(".test.tsx") || f.endsWith(".test.ts"),
  );

  // Determine complexity score (simple heuristic)
  let complexityScore = "Low";
  if (linesOfCode > 200 || imports > 10) {
    complexityScore = "High";
  } else if (linesOfCode > 100 || imports > 5) {
    complexityScore = "Medium";
  }

  // Determine priority based on usage
  let priority = "Low";
  if (usageCount >= 10) {
    priority = "High";
  } else if (usageCount >= 5) {
    priority = "Medium";
  }

  // Categorize component (simple heuristic)
  let category = "Molecule";
  if (
    component.relativePath.includes("common") ||
    ["Button", "Input", "Badge"].includes(component.name)
  ) {
    category = "Atom";
  } else if (component.relativePath.includes("domain") || linesOfCode > 150) {
    category = "Organism";
  }

  return {
    name: component.name,
    path: component.relativePath,
    linesOfCode,
    imports,
    usageCount,
    complexity: complexityScore,
    priority,
    category,
    hasTests,
  };
}

/**
 * Main analysis function
 */
function runAnalysis() {
  console.log("🔍 Starting component analysis...\n");

  const components = getComponentDirectories(COMPONENTS_DIR);
  console.log(`Found ${components.length} component directories\n`);

  const analysis = [];

  for (const component of components) {
    console.log(`Analyzing: ${component.name}`);
    const result = analyzeComponent(component);
    if (result) {
      analysis.push(result);
    }
  }

  // Sort by usage count (descending)
  analysis.sort((a, b) => b.usageCount - a.usageCount);

  // Generate CSV report
  const csvHeaders =
    "Component Name,File Path,Usage Count,Lines of Code,Imports,Complexity,Priority,Category,Has Tests\n";
  const csvRows = analysis
    .map(
      (item) =>
        `${item.name},${item.path},${item.usageCount},${item.linesOfCode},${
          item.imports
        },${item.complexity},${item.priority},${item.category},${
          item.hasTests ? "Yes" : "No"
        }`,
    )
    .join("\n");

  const csvContent = csvHeaders + csvRows;
  const csvPath = path.join(OUTPUT_DIR, "component-inventory.csv");
  fs.writeFileSync(csvPath, csvContent);

  // Generate JSON report
  const jsonPath = path.join(OUTPUT_DIR, "component-inventory.json");
  fs.writeFileSync(jsonPath, JSON.stringify(analysis, null, 2));

  // Generate summary
  const summary = {
    totalComponents: analysis.length,
    highPriority: analysis.filter((c) => c.priority === "High").length,
    mediumPriority: analysis.filter((c) => c.priority === "Medium").length,
    lowPriority: analysis.filter((c) => c.priority === "Low").length,
    atoms: analysis.filter((c) => c.category === "Atom").length,
    molecules: analysis.filter((c) => c.category === "Molecule").length,
    organisms: analysis.filter((c) => c.category === "Organism").length,
    withTests: analysis.filter((c) => c.hasTests).length,
    withoutTests: analysis.filter((c) => !c.hasTests).length,
    averageLOC: Math.round(
      analysis.reduce((sum, c) => sum + c.linesOfCode, 0) / analysis.length,
    ),
    topUsedComponents: analysis
      .slice(0, 10)
      .map((c) => ({ name: c.name, usage: c.usageCount })),
  };

  const summaryPath = path.join(OUTPUT_DIR, "component-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  // Print summary to console
  console.log("\n✅ Analysis complete!\n");
  console.log("📊 Summary:");
  console.log(`   Total components: ${summary.totalComponents}`);
  console.log(`   High priority: ${summary.highPriority}`);
  console.log(`   Medium priority: ${summary.mediumPriority}`);
  console.log(`   Low priority: ${summary.lowPriority}`);
  console.log(`   Average LOC: ${summary.averageLOC}`);
  console.log(`   With tests: ${summary.withTests}`);
  console.log(`   Without tests: ${summary.withoutTests}`);
  console.log("\n🔝 Top 10 most used components:");
  summary.topUsedComponents.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.name} (${c.usage} usages)`);
  });
  console.log(`\n📁 Reports saved to: ${OUTPUT_DIR}`);
  console.log(`   - component-inventory.csv`);
  console.log(`   - component-inventory.json`);
  console.log(`   - component-summary.json`);
}

// Run the analysis
runAnalysis();
