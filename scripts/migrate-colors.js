import { replaceInFile as replace } from "replace-in-file";

const colorReplacements = [
  // Text colors
  {
    from: /text-gray-700/g,
    to: "text-blackCorp",
  },
  {
    from: /text-gray-600/g,
    to: "text-blackCorp/80",
  },
  {
    from: /text-gray-500/g,
    to: "text-blackCorp/60",
  },
  {
    from: /text-gray-400/g,
    to: "text-blackCorp/40",
  },
  {
    from: /text-gray-900/g,
    to: "text-blackCorp",
  },

  // Background colors
  {
    from: /bg-gray-100/g,
    to: "bg-darkCorp",
  },
  {
    from: /bg-gray-50/g,
    to: "bg-whiteCorp",
  },
  {
    from: /bg-gray-200/g,
    to: "bg-darkCorp/80",
  },

  // Border colors
  {
    from: /border-gray-300/g,
    to: "border-bColor",
  },
  {
    from: /border-gray-200/g,
    to: "border-bColor/50",
  },
];

async function migrateColors() {
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

  console.log("\n🎉 Color migration complete!");
}

migrateColors();
