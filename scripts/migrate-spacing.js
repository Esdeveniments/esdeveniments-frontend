import { replaceInFile as replace } from "replace-in-file";

// Mapping of arbitrary spacing values to standardized spacing tokens
// Based on analysis: 24 unique values, targeting 8 standardized tokens
const spacingMap = {
  0: "xs", // Special case: no spacing (maps to xs for consistency)
  1: "xs", // 0.25rem → xs (0.25rem base)
  2: "sm", // 0.50rem → sm base (0.50rem)
  3: "sm", // 0.75rem → sm (close to 0.50rem, but we'll standardize)
  4: "md", // 1.00rem → md base (1.00rem)
  5: "md", // 1.25rem → md (close to 1.00rem)
  6: "lg", // 1.50rem → lg base (1.50rem)
  8: "xl", // 2.00rem → xl base (2.00rem)
  10: "2xl", // 2.50rem → 2xl base (2.50rem)
  12: "3xl", // 3.00rem → 3xl base (3.00rem)
  14: "3xl", // 3.50rem → 3xl (close to 3.00rem)
  16: "4xl", // 4.00rem → 4xl base (4.00rem)
  20: "4xl", // 5.00rem → 4xl (close to 4.00rem/6.00rem range)
};

// Specific mappings for high-usage spacing classes identified in analysis
const specificSpacingMap = {
  "px-0": "px-xs", // 19 usages - most common
  "my-1": "my-xs", // 5 usages
  "pb-14": "pb-3xl", // 5 usages
  "ml-1": "ml-xs", // 4 usages
  "mx-1": "mx-xs", // 4 usages
  "mb-10": "mb-2xl", // 3 usages
  "m-0": "m-xs", // 3 usages
  "mb-0": "mb-xs", // 3 usages
  "p-0": "p-xs", // 2 usages
  "pl-0": "pl-xs", // 2 usages
  "pt-10": "pt-2xl", // 2 usages
  "mr-1": "mr-xs", // 2 usages
  "pr-10": "pr-2xl", // 2 usages
  "px-5": "px-md", // 2 usages
  "pb-0": "pb-xs", // 2 usages
  "mt-0": "mt-xs", // 2 usages
  "pt-1": "pt-xs", // 2 usages
  "pb-10": "pb-2xl", // 2 usages
};

// Properties to replace
const properties = [
  "p",
  "px",
  "py",
  "pt",
  "pb",
  "pl",
  "pr",
  "m",
  "mx",
  "my",
  "mt",
  "mb",
  "ml",
  "mr",
  "gap",
];

const spacingReplacements = [];

// Generate replacements for each property and mapped value
properties.forEach((prop) => {
  Object.entries(spacingMap).forEach(([num, token]) => {
    spacingReplacements.push({
      from: new RegExp(`\\b${prop}-${num}\\b`, "g"),
      to: `${prop}-${token}`,
    });
  });
});

// Add responsive variants for md breakpoint (e.g., md:px-sm)
const responsiveProperties = [
  "p",
  "px",
  "py",
  "pt",
  "pb",
  "pl",
  "pr",
  "m",
  "mx",
  "my",
  "mt",
  "mb",
  "ml",
  "mr",
];
responsiveProperties.forEach((prop) => {
  Object.entries(spacingMap).forEach(([num, token]) => {
    spacingReplacements.push({
      from: new RegExp(`\\bmd:${prop}-${num}\\b`, "g"),
      to: `md:${prop}-${token}`,
    });
  });
});

// Generate replacements for specific high-usage classes
Object.entries(specificSpacingMap).forEach(([from, to]) => {
  spacingReplacements.push({
    from: new RegExp(`\\b${from}\\b`, "g"),
    to: to,
  });
});

async function migrateSpacing(dryRun = false) {
  console.log("🚀 Starting spacing standardization migration...");
  console.log(`📊 Processing ${spacingReplacements.length} spacing patterns`);
  console.log(
    `🎯 Target: Reduce 24 unique spacing values to 8 standardized tokens\n`,
  );

  let totalChangedFiles = 0;
  let totalReplacements = 0;

  for (const replacement of spacingReplacements) {
    try {
      const results = await replace({
        files: ["app/**/*.{tsx,jsx}", "components/**/*.{tsx,jsx}"],
        from: replacement.from,
        to: replacement.to,
        dry: dryRun,
      });

      const changedFiles = results.filter((r) => r.hasChanged);
      if (changedFiles.length > 0) {
        console.log(`✅ ${replacement.from.source} → ${replacement.to}`);
        console.log(`   → ${changedFiles.length} files changed`);
        totalChangedFiles += changedFiles.length;
        totalReplacements++;
      }
    } catch (error) {
      console.error("❌ Error:", error);
    }
  }

  console.log(`\n🎉 Spacing migration ${dryRun ? "preview" : "complete"}!`);
  console.log(`📊 Summary:`);
  console.log(`   • Patterns processed: ${spacingReplacements.length}`);
  console.log(`   • Patterns applied: ${totalReplacements}`);
  console.log(`   • Files changed: ${totalChangedFiles}`);

  if (dryRun) {
    console.log(
      `\n💡 This was a dry run. Run without --dry-run to apply changes.`,
    );
  } else {
    console.log(
      `\n✅ Migration successful! Review changes and test components.`,
    );
  }
}

// Check for dry-run flag
const dryRun = process.argv.includes("--dry-run");
migrateSpacing(dryRun);

migrateSpacing();
