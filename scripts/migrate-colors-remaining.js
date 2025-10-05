import { replaceInFile as replace } from "replace-in-file";

const colorReplacements = [
  // Gray colors
  {
    from: /text-gray-200/g,
    to: "text-blackCorp/40",
  },
  {
    from: /bg-gray-200/g,
    to: "bg-darkCorp/80",
  },
  {
    from: /text-gray-500/g,
    to: "text-blackCorp/60",
  },
  {
    from: /text-gray-300/g,
    to: "text-blackCorp/50",
  },
  {
    from: /border-gray-100/g,
    to: "border-bColor/50",
  },

  // Yellow colors
  {
    from: /bg-yellow-100/g,
    to: "bg-warning/10",
  },
  {
    from: /border-yellow-300/g,
    to: "border-warning",
  },
  {
    from: /text-yellow-800/g,
    to: "text-warning",
  },
  {
    from: /text-yellow-700/g,
    to: "text-warning",
  },
  {
    from: /text-yellow-500/g,
    to: "text-warning/80",
  },

  // Green colors
  {
    from: /bg-green-50/g,
    to: "bg-success/10",
  },
  {
    from: /text-green-400/g,
    to: "text-success/80",
  },
  {
    from: /text-green-700/g,
    to: "text-success",
  },

  // Blue colors
  {
    from: /bg-blue-50/g,
    to: "bg-primary/10",
  },

  // Red colors
  {
    from: /text-red-500/g,
    to: "text-error/80",
  },
  {
    from: /bg-red-50/g,
    to: "bg-error/10",
  },
  {
    from: /bg-red-500/g,
    to: "bg-error",
  },
  {
    from: /text-red-600/g,
    to: "text-error",
  },
  {
    from: /border-red-200/g,
    to: "border-error/50",
  },
];

async function migrateRemainingColors() {
  for (const replacement of colorReplacements) {
    try {
      const results = await replace({
        files: ["app/**/*.{tsx,ts,jsx,js}", "components/**/*.{tsx,ts,jsx,js}"],
        from: replacement.from,
        to: replacement.to,
      });

      const changedFiles = results.filter((r) => r.hasChanged);
      if (changedFiles.length > 0) {
        console.log(`✅ Replaced ${replacement.from.source}:`);
        console.log(`   → ${changedFiles.length} files changed`);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }

  console.log("\n🎉 Remaining color migration complete!");
}

migrateRemainingColors();
