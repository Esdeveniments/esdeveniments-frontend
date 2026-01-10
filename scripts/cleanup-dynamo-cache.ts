/**
 * DynamoDB Cache Cleanup Lambda
 *
 * Cleans up stale ISR cache entries from old deployments.
 * OpenNext creates cache entries prefixed with a build ID - each deployment
 * creates a new namespace, leaving old entries orphaned.
 *
 * Safety:
 * - Keeps entries from the most recent N builds (default: 3) for rollback safety
 * - Rate-limited to avoid DynamoDB throttling
 * - Dry-run mode for testing
 *
 * Schedule: Weekly via CloudWatch Events (configured in sst.config.ts)
 *
 * Local testing:
 *   CACHE_DYNAMO_TABLE=<table-name> DRY_RUN=true npx tsx scripts/cleanup-dynamo-cache.ts
 */

import {
  DynamoDBClient,
  ScanCommand,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";

import type { ScanCommandOutput } from "@aws-sdk/client-dynamodb";

// Type for our table items (tag and path columns)
interface CacheItem {
  tag?: { S?: string };
  path?: { S?: string };
}

const REGION = process.env.AWS_REGION || "eu-west-3";
// No fallback - fail explicitly if env var not set (SST provides it dynamically)
const TABLE_NAME = process.env.CACHE_DYNAMO_TABLE;
const BUILDS_TO_KEEP = parseInt(process.env.BUILDS_TO_KEEP || "3", 10);
const DRY_RUN = process.env.DRY_RUN !== "false"; // Default to dry run for safety
const BATCH_SIZE = 25; // DynamoDB BatchWriteItem limit
const SCAN_LIMIT = 5000; // Items per scan
const DELAY_BETWEEN_BATCHES_MS = 100; // Rate limiting
const MAX_RETRIES = 3; // Retries for unprocessed items with exponential backoff

const client = new DynamoDBClient({ region: REGION });

interface CleanupResult {
  totalItems: number;
  buildsFound: number;
  buildsKept: number;
  buildsDeleted: number;
  itemsDeleted: number;
  dryRun: boolean;
  keptBuilds: string[];
  deletedBuilds: string[];
  errors: string[];
}

/**
 * Extract build ID from a tag string (format: "buildId/rest-of-tag")
 */
function extractBuildId(tag: string): string {
  const slashIndex = tag.indexOf("/");
  return slashIndex > 0 ? tag.substring(0, slashIndex) : tag;
}

/**
 * Scan entire table and group by build ID
 */
async function scanAndGroupByBuild(): Promise<
  Map<string, { count: number; items: Array<{ tag: string; path: string }> }>
> {
  const buildGroups = new Map<
    string,
    { count: number; items: Array<{ tag: string; path: string }> }
  >();
  let lastEvaluatedKey: ScanCommandOutput["LastEvaluatedKey"] = undefined;
  let totalScanned = 0;

  console.log(`Scanning table: ${TABLE_NAME}`);

  do {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      Limit: SCAN_LIMIT,
      ExclusiveStartKey: lastEvaluatedKey,
      ProjectionExpression: "#t, #p",
      ExpressionAttributeNames: {
        "#t": "tag",
        "#p": "path",
      },
    });

    const response: ScanCommandOutput = await client.send(command);
    lastEvaluatedKey = response.LastEvaluatedKey;

    for (const rawItem of response.Items || []) {
      // Type narrow the item to our expected shape
      const item = rawItem as CacheItem;
      const tag = item.tag?.S || "";
      const path = item.path?.S || "";
      const buildId = extractBuildId(tag);

      let group = buildGroups.get(buildId);
      if (!group) {
        group = { count: 0, items: [] };
        buildGroups.set(buildId, group);
      }

      group.count++;
      group.items.push({ tag, path });
    }

    totalScanned += response.Items?.length || 0;
    console.log(
      `Scanned ${totalScanned} items, ${buildGroups.size} unique builds found`
    );
  } while (lastEvaluatedKey);

  return buildGroups;
}

/**
 * Determine which builds to keep (most entries = most recent/active)
 */
function selectBuildsToKeep(
  buildGroups: Map<
    string,
    { count: number; items: Array<{ tag: string; path: string }> }
  >
): Set<string> {
  // Sort builds by item count (descending) - more items = more recent/active
  const sortedBuilds = Array.from(buildGroups.entries())
    .map(([buildId, data]) => ({ buildId, count: data.count }))
    .sort((a, b) => b.count - a.count);

  console.log("\nBuild summary (sorted by item count):");
  sortedBuilds.forEach((build, index) => {
    const keepMarker = index < BUILDS_TO_KEEP ? "✅ KEEP" : "🗑️  DELETE";
    console.log(`  ${keepMarker} ${build.buildId}: ${build.count} items`);
  });

  // Keep the top N builds
  return new Set(sortedBuilds.slice(0, BUILDS_TO_KEEP).map((b) => b.buildId));
}

/**
 * Delete items in batches with rate limiting
 */
async function deleteItems(
  items: Array<{ tag: string; path: string }>
): Promise<{ deleted: number; errors: string[] }> {
  let deleted = 0;
  const errors: string[] = [];

  // Split into batches of 25 (DynamoDB limit)
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    // Use SDK's WriteRequest type for compatibility with UnprocessedItems
    let pendingItems = batch.map((item) => ({
      tag: item.tag,
      path: item.path,
    }));

    try {
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would delete batch of ${batch.length} items`);
        deleted += batch.length;
      } else {
        // TABLE_NAME is validated at handler entry, safe to assert here
        const tableName = TABLE_NAME as string;

        // Retry loop with exponential backoff for unprocessed items
        let retryCount = 0;
        while (pendingItems.length > 0 && retryCount <= MAX_RETRIES) {
          if (retryCount > 0) {
            // Exponential backoff: 200ms, 400ms, 800ms
            const backoffMs = DELAY_BETWEEN_BATCHES_MS * Math.pow(2, retryCount);
            console.log(
              `Retrying ${pendingItems.length} unprocessed items (attempt ${retryCount}/${MAX_RETRIES}, waiting ${backoffMs}ms)`
            );
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }

          // Build delete requests from pending items
          const deleteRequests = pendingItems.map((item) => ({
            DeleteRequest: {
              Key: {
                tag: { S: item.tag },
                path: { S: item.path },
              },
            },
          }));

          const command = new BatchWriteItemCommand({
            RequestItems: {
              [tableName]: deleteRequests,
            },
          });

          const response = await client.send(command);

          // Check for unprocessed items
          const unprocessedRequests =
            response.UnprocessedItems?.[tableName] || [];
          const processedCount =
            pendingItems.length - unprocessedRequests.length;
          deleted += processedCount;

          if (unprocessedRequests.length > 0) {
            // Extract keys from unprocessed requests for retry
            pendingItems = unprocessedRequests
              .filter((req) => req.DeleteRequest?.Key)
              .map((req) => ({
                tag: req.DeleteRequest!.Key!["tag"]?.S || "",
                path: req.DeleteRequest!.Key!["path"]?.S || "",
              }));
            retryCount++;
          } else {
            pendingItems = [];
          }
        }

        // If still unprocessed after all retries, log error
        if (pendingItems.length > 0) {
          errors.push(
            `${pendingItems.length} items still unprocessed after ${MAX_RETRIES} retries in batch ${Math.floor(
              i / BATCH_SIZE
            )}`
          );
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE)} failed: ${errorMsg}`);
      console.error(`Error deleting batch: ${errorMsg}`);
    }

    // Rate limiting
    if (i + BATCH_SIZE < items.length) {
      await new Promise((resolve) =>
        setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS)
      );
    }

    // Progress logging every 1000 items
    if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= items.length) {
      console.log(
        `Delete progress: ${Math.min(i + BATCH_SIZE, items.length)}/${
          items.length
        } items`
      );
    }
  }

  return { deleted, errors };
}

/**
 * Main cleanup handler
 */
export async function handler(event?: {
  dryRun?: boolean;
}): Promise<CleanupResult> {
  const isDryRun = event?.dryRun ?? DRY_RUN;

  console.log("=== DynamoDB Cache Cleanup ===");
  console.log(`Table: ${TABLE_NAME}`);
  console.log(`Builds to keep: ${BUILDS_TO_KEEP}`);
  console.log(`Dry run: ${isDryRun}`);
  console.log("");

  if (!TABLE_NAME) {
    throw new Error("CACHE_DYNAMO_TABLE environment variable not set");
  }

  const result: CleanupResult = {
    totalItems: 0,
    buildsFound: 0,
    buildsKept: 0,
    buildsDeleted: 0,
    itemsDeleted: 0,
    dryRun: isDryRun,
    keptBuilds: [],
    deletedBuilds: [],
    errors: [],
  };

  try {
    // Step 1: Scan and group by build
    const buildGroups = await scanAndGroupByBuild();
    result.buildsFound = buildGroups.size;
    result.totalItems = Array.from(buildGroups.values()).reduce(
      (sum, g) => sum + g.count,
      0
    );

    if (buildGroups.size === 0) {
      console.log("No items found in table");
      return result;
    }

    // Step 2: Determine which builds to keep
    const buildsToKeep = selectBuildsToKeep(buildGroups);
    result.buildsKept = buildsToKeep.size;
    result.keptBuilds = Array.from(buildsToKeep);

    // Step 3: Collect items to delete
    const itemsToDelete: Array<{ tag: string; path: string }> = [];

    for (const [buildId, data] of buildGroups.entries()) {
      if (!buildsToKeep.has(buildId)) {
        result.deletedBuilds.push(buildId);
        itemsToDelete.push(...data.items);
      }
    }

    result.buildsDeleted = result.deletedBuilds.length;

    console.log(`\nItems to delete: ${itemsToDelete.length}`);

    if (itemsToDelete.length === 0) {
      console.log("No items to delete");
      return result;
    }

    // Step 4: Delete items
    const { deleted, errors } = await deleteItems(itemsToDelete);
    result.itemsDeleted = deleted;
    result.errors = errors;

    console.log("\n=== Cleanup Complete ===");
    console.log(`Total items: ${result.totalItems}`);
    console.log(`Builds found: ${result.buildsFound}`);
    console.log(
      `Builds kept: ${result.buildsKept} (${result.keptBuilds.join(", ")})`
    );
    console.log(`Builds deleted: ${result.buildsDeleted}`);
    console.log(`Items deleted: ${result.itemsDeleted}`);
    if (result.errors.length > 0) {
      console.log(`Errors: ${result.errors.length}`);
    }

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.errors.push(errorMsg);
    console.error(`Cleanup failed: ${errorMsg}`);
    throw error;
  }
}

// Allow running directly with: npx tsx scripts/cleanup-dynamo-cache.ts
// Default is DRY_RUN=true for safety
if (
  require.main === module ||
  process.argv[1]?.includes("cleanup-dynamo-cache")
) {
  handler()
    .then((result) => {
      console.log("\nResult:", JSON.stringify(result, null, 2));
      process.exit(result.errors.length > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}
