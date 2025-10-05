import { replaceInFile as replace } from "replace-in-file";

/**
 * Text Classes to Design Tokens Migration Script
 *
 * Automates common transformations from hardcoded text-* classes to Text component variants.
 * This script handles the most straightforward cases and provides guidance for complex ones.
 */

// Migration patterns from text-* classes to Text component variants
const textClassMigrations = [
  // Simple span replacements with text-xs
  {
    from: /<span className="([^"]*?)text-xs([^"]*?)">([^<]+)<\/span>/g,
    to: (match, before, after, content) => {
      const className = `${before}${after}`.trim();
      return `<Text variant="caption"${className ? ` className="${className}"` : ""}>${content}</Text>`;
    },
  },

  // Simple span replacements with text-sm
  {
    from: /<span className="([^"]*?)text-sm([^"]*?)">([^<]+)<\/span>/g,
    to: (match, before, after, content) => {
      const className = `${before}${after}`.trim();
      return `<Text variant="body-sm"${className ? ` className="${className}"` : ""}>${content}</Text>`;
    },
  },

  // Simple span replacements with text-base
  {
    from: /<span className="([^"]*?)text-base([^"]*?)">([^<]+)<\/span>/g,
    to: (match, before, after, content) => {
      const className = `${before}${after}`.trim();
      return `<Text variant="body"${className ? ` className="${className}"` : ""}>${content}</Text>`;
    },
  },

  // Simple span replacements with text-lg
  {
    from: /<span className="([^"]*?)text-lg([^"]*?)">([^<]+)<\/span>/g,
    to: (match, before, after, content) => {
      const className = `${before}${after}`.trim();
      return `<Text variant="body-lg"${className ? ` className="${className}"` : ""}>${content}</Text>`;
    },
  },

  // Simple p replacements with text-base
  {
    from: /<p className="([^"]*?)text-base([^"]*?)">([^<]+)<\/p>/g,
    to: (match, before, after, content) => {
      const className = `${before}${after}`.trim();
      return `<Text as="p" variant="body"${className ? ` className="${className}"` : ""}>${content}</Text>`;
    },
  },

  // Simple p replacements with text-lg
  {
    from: /<p className="([^"]*?)text-lg([^"]*?)">([^<]+)<\/p>/g,
    to: (match, before, after, content) => {
      const className = `${before}${after}`.trim();
      return `<Text as="p" variant="body-lg"${className ? ` className="${className}"` : ""}>${content}</Text>`;
    },
  },
];

// Additional targeted replacements for specific patterns
const targetedMigrations = [
  // FormField labels (common pattern)
  {
    from: /<label className="([^"]*?)text-sm([^"]*?)">([^<]+)<\/label>/g,
    to: (match, before, after, content) => {
      const className = `${before}${after}`.trim();
      return `<Text as="label" variant="body-sm"${className ? ` className="${className}"` : ""}>${content}</Text>`;
    },
  },

  // Error messages
  {
    from: /<span className="([^"]*?)text-sm([^"]*?)text-red-600([^"]*?)">([^<]+)<\/span>/g,
    to: (match, before, middle, after, content) => {
      const className = `${before}${middle}${after}`.trim();
      return `<Text variant="body-sm" color="error"${className ? ` className="${className}"` : ""}>${content}</Text>`;
    },
  },

  // Success messages
  {
    from: /<span className="([^"]*?)text-sm([^"]*?)text-green-600([^"]*?)">([^<]+)<\/span>/g,
    to: (match, before, middle, after, content) => {
      const className = `${before}${middle}${after}`.trim();
      return `<Text variant="body-sm" color="success"${className ? ` className="${className}"` : ""}>${content}</Text>`;
    },
  },
];

async function migrateTextClasses() {
  console.log("🔄 Starting text classes to design tokens migration...\n");

  const allMigrations = [...textClassMigrations, ...targetedMigrations];
  let totalFilesChanged = 0;
  let totalReplacements = 0;

  for (const migration of allMigrations) {
    try {
      const results = await replace({
        files: ["app/**/*.{tsx,ts,jsx,js}", "components/**/*.{tsx,ts,jsx,js}"],
        from: migration.from,
        to: migration.to,
        countMatches: true,
      });

      const changedFiles = results.filter((r) => r.hasChanged);
      if (changedFiles.length > 0) {
        console.log(`✅ Applied migration pattern:`);
        console.log(`   Pattern: ${migration.from.source}`);
        console.log(`   Files changed: ${changedFiles.length}`);
        const matches = changedFiles.reduce(
          (sum, r) => sum + r.numReplacements,
          0,
        );
        console.log(`   Total replacements: ${matches}`);
        totalFilesChanged += changedFiles.length;
        totalReplacements += matches;
      }
    } catch (error) {
      console.error("Error applying migration:", error);
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   Files modified: ${totalFilesChanged}`);
  console.log(`   Total replacements: ${totalReplacements}`);

  if (totalReplacements > 0) {
    console.log(`\n⚠️  Important Notes:`);
    console.log(`   - Review all changes for semantic correctness`);
    console.log(`   - Ensure Text component is imported in modified files`);
    console.log(`   - Test visual consistency after migration`);
    console.log(`   - Some complex cases may need manual migration`);
  }

  console.log(`\n✅ Automated migration complete!`);
  console.log(`\n💡 Next Steps:`);
  console.log(`   1. Run: npm run analyze:text-classes`);
  console.log(`   2. Review remaining hardcoded text classes`);
  console.log(`   3. Handle complex cases manually`);
  console.log(`   4. Test and validate changes`);
}

// Export for use in other scripts
export { migrateTextClasses };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateTextClasses();
}
