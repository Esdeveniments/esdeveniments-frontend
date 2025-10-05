const fs = require("fs");
const { glob } = require("glob");

const spacingPattern = /\b(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr)-(\d+)\b/g;

async function analyzeSpacing() {
  const spacingUsage = {};
  const filesWithSpacing = [];

  const files = await glob("**/*.{tsx,jsx}", { ignore: "node_modules/**" });
  console.log(`Found ${files.length} files to analyze`);

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    let match;
    const fileSpacing = new Set();

    while ((match = spacingPattern.exec(content)) !== null) {
      const fullClass = match[0];
      spacingUsage[fullClass] = (spacingUsage[fullClass] || 0) + 1;
      fileSpacing.add(fullClass);
    }

    if (fileSpacing.size > 0) {
      filesWithSpacing.push({
        file,
        classes: Array.from(fileSpacing),
        count: fileSpacing.size,
      });
    }
  });

  // Sort by frequency
  const sorted = Object.entries(spacingUsage).sort((a, b) => b[1] - a[1]);

  const totalUsages = Object.values(spacingUsage).reduce(
    (sum, count) => sum + count,
    0,
  );
  const uniqueClasses = Object.keys(spacingUsage).length;

  console.log(`📊 Total spacing classes: ${totalUsages}`);
  console.log(`📊 Unique spacing values: ${uniqueClasses}`);
  console.log(`📊 Files with spacing: ${filesWithSpacing.length}`);
  console.log("\n📊 Top 30 spacing classes:\n");

  // Show top 30 for better analysis
  sorted.slice(0, 30).forEach(([className, count]) => {
    console.log(`${className.padEnd(10)} → ${count} usages`);
  });

  console.log("\n📊 Migration Priority Analysis:\n");

  // Group by spacing value for migration planning
  const valueGroups = {};
  sorted.forEach(([className, count]) => {
    const match = className.match(/-(\d+)$/);
    if (match) {
      const value = match[1];
      if (!valueGroups[value]) valueGroups[value] = { count: 0, classes: [] };
      valueGroups[value].count += count;
      valueGroups[value].classes.push(className);
    }
  });

  // Sort value groups by total usage
  const sortedValues = Object.entries(valueGroups)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15);

  console.log("Top spacing values by total usage:");
  sortedValues.forEach(([value, data]) => {
    const tailwindValue = parseInt(value);
    const remValue = (tailwindValue * 0.25).toFixed(2);
    console.log(
      `  ${value.padEnd(2)} (${remValue}rem) → ${data.count} total usages`,
    );
    console.log(
      `     Classes: ${data.classes.slice(0, 5).join(", ")}${data.classes.length > 5 ? "..." : ""}`,
    );
  });

  console.log("\n📊 Files with highest spacing violations:\n");
  filesWithSpacing
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .forEach(({ file, count }) => {
      console.log(`${count.toString().padEnd(3)} violations → ${file}`);
    });

  return { sorted, totalUsages, uniqueClasses, filesWithSpacing };
}

analyzeSpacing().catch(console.error);
