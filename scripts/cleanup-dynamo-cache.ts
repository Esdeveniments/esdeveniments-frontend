/**
 * Cache Cleanup Lambda
 *
 * Cleans up stale ISR cache entries from old deployments:
 * 1. DynamoDB: Removes orphaned cache entries from old build IDs
 * 2. S3: Removes stale __fetch/ cache objects that accumulate over time
 *
 * OpenNext creates cache entries prefixed with a build ID - each deployment
 * creates a new namespace, leaving old entries orphaned.
 *
 * Safety:
 * - Keeps entries from the most recent N builds (default: 3) for rollback safety
 * - Rate-limited to avoid DynamoDB/S3 throttling
 * - Dry-run mode for testing
 *
 * Schedule: Weekly via CloudWatch Events (configured in sst.config.ts)
 *
 * Local testing:
 *   CACHE_DYNAMO_TABLE=<table-name> CACHE_S3_BUCKET=<bucket-name> DRY_RUN=true npx tsx scripts/cleanup-dynamo-cache.ts
 */

import {
  DynamoDBClient,
  ScanCommand,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import type { _Object } from "@aws-sdk/client-s3";

import type { ScanCommandOutput } from "@aws-sdk/client-dynamodb";

// Types kept local (not in types/) for Lambda deployment simplicity - this script
// is bundled and deployed independently, avoiding cross-file dependencies.
interface CacheItem {
  tag?: { S?: string };
  path?: { S?: string };
}

/** Type guard to validate DynamoDB item has expected shape */
function isCacheItem(item: unknown): item is CacheItem {
  if (typeof item !== "object" || item === null) {
    return false;
  }
  const obj = item as Record<string, unknown>;
  return (
    (obj.tag === undefined ||
      (typeof obj.tag === "object" && obj.tag !== null && "S" in obj.tag)) &&
    (obj.path === undefined ||
      (typeof obj.path === "object" && obj.path !== null && "S" in obj.path))
  );
}

const REGION = process.env.AWS_REGION || "eu-west-3";
// No fallback - fail explicitly if env var not set (SST provides it dynamically)
const TABLE_NAME = process.env.CACHE_DYNAMO_TABLE;
// Optional: S3 bucket for fetch cache cleanup (set by SST from site.nodes.assets)
const S3_BUCKET_NAME = process.env.CACHE_S3_BUCKET;
const S3_FETCH_PREFIX = "_cache/__fetch/";
const S3_DELETE_BATCH_SIZE = 1000; // S3 DeleteObjects limit
const BUILDS_TO_KEEP = parseInt(process.env.BUILDS_TO_KEEP || "3", 10);
const DRY_RUN = process.env.DRY_RUN !== "false"; // Default to dry run for safety
// Safety gate: cleanup must be explicitly enabled in production
const CLEANUP_ENABLED = process.env.CACHE_CLEANUP_ENABLED === "true";
const BATCH_SIZE = 25; // DynamoDB BatchWriteItem limit
const SCAN_LIMIT = 5000; // Items per scan
const DELAY_BETWEEN_BATCHES_MS = 100; // Rate limiting
const MAX_RETRIES = 3; // Retries for unprocessed items with exponential backoff
const PROGRESS_LOG_INTERVAL = 1000; // Log progress every N items
// Threshold for validating timestamp-based build IDs (Jan 1, 2023 00:00:00 UTC)
const TIMESTAMP_THRESHOLD_MS = new Date("2023-01-01T00:00:00Z").getTime();

const dynamoClient = new DynamoDBClient({ region: REGION });
const s3Client = new S3Client({ region: REGION });

interface S3CleanupResult {
  objectsDeleted: number;
  errors: string[];
}

interface CleanupResult {
  totalItems: number;
  buildsFound: number;
  buildsKept: number;
  buildsDeleted: number;
  itemsDeleted: number;
  dryRun: boolean;
  keptBuilds: string[];
  deletedBuilds: string[];
  s3FetchCacheDeleted: number;
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

    const response: ScanCommandOutput = await dynamoClient.send(command);
    lastEvaluatedKey = response.LastEvaluatedKey;

    for (const rawItem of response.Items || []) {
      // Skip items that don't match expected shape
      if (!isCacheItem(rawItem)) {
        continue;
      }
      const tag = rawItem.tag?.S || "";
      const path = rawItem.path?.S || "";
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
      `Scanned ${totalScanned} items, ${buildGroups.size} unique builds found`,
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
  >,
): Set<string> {
  const builds = Array.from(buildGroups.entries()).map(([buildId, data]) => ({
    buildId,
    count: data.count,
    timestamp: Number(buildId),
  }));

  // Check if build IDs look like timestamps (e.g., > Jan 1, 2023 in ms)
  const allAreTimestamps = builds.every(
    (b) => !isNaN(b.timestamp) && b.timestamp > TIMESTAMP_THRESHOLD_MS,
  );

  if (allAreTimestamps) {
    console.log("\nSorting builds by timestamp (most recent first).");
    builds.sort((a, b) => b.timestamp - a.timestamp);
  } else {
    console.log(
      "\nSorting builds by item count (fallback: most active first).",
    );
    builds.sort((a, b) => b.count - a.count);
  }

  console.log("\nBuild summary (sorted):");
  builds.forEach((build, index) => {
    const keepMarker = index < BUILDS_TO_KEEP ? "✅ KEEP" : "🗑️  DELETE";
    console.log(`  ${keepMarker} ${build.buildId}: ${build.count} items`);
  });

  // Keep the top N builds
  return new Set(builds.slice(0, BUILDS_TO_KEEP).map((b) => b.buildId));
}

/**
 * Delete items in batches with rate limiting
 */
async function deleteItems(
  items: Array<{ tag: string; path: string }>,
  isDryRun: boolean,
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
      if (isDryRun) {
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
            const backoffMs =
              DELAY_BETWEEN_BATCHES_MS * Math.pow(2, retryCount);
            console.log(
              `Retrying ${pendingItems.length} unprocessed items (attempt ${retryCount}/${MAX_RETRIES}, waiting ${backoffMs}ms)`,
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

          const response = await dynamoClient.send(command);

          // Check for unprocessed items
          const unprocessedRequests =
            response.UnprocessedItems?.[tableName] || [];
          const processedCount =
            pendingItems.length - unprocessedRequests.length;
          deleted += processedCount;

          if (unprocessedRequests.length > 0) {
            // Extract keys from unprocessed requests for retry
            pendingItems = unprocessedRequests.flatMap((req) => {
              const key = req.DeleteRequest?.Key;
              if (!key) {
                return [];
              }
              return [
                {
                  tag: key["tag"]?.S ?? "",
                  path: key["path"]?.S ?? "",
                },
              ];
            });
            retryCount++;
          } else {
            pendingItems = [];
          }
        }

        // If still unprocessed after all retries, log error
        if (pendingItems.length > 0) {
          errors.push(
            `${pendingItems.length} items still unprocessed after ${MAX_RETRIES} retries in batch ${Math.floor(
              i / BATCH_SIZE,
            )}`,
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
        setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS),
      );
    }

    // Progress logging every PROGRESS_LOG_INTERVAL items
    if (
      (i + BATCH_SIZE) % PROGRESS_LOG_INTERVAL === 0 ||
      i + BATCH_SIZE >= items.length
    ) {
      console.log(
        `Delete progress: ${Math.min(i + BATCH_SIZE, items.length)}/${
          items.length
        } items`,
      );
    }
  }

  return { deleted, errors };
}

/**
 * Delete stale S3 fetch cache objects (_cache/__fetch/ prefix).
 * These accumulate from Next.js fetch caching and are not cleaned up on deploy.
 * Lists all objects under the prefix and deletes them in batches of 1000.
 */
async function cleanupS3FetchCache(
  isDryRun: boolean,
): Promise<S3CleanupResult> {
  if (!S3_BUCKET_NAME) {
    console.log("S3 cleanup skipped: CACHE_S3_BUCKET not set");
    return { objectsDeleted: 0, errors: [] };
  }

  console.log("\n=== S3 Fetch Cache Cleanup ===");
  console.log(`Bucket: ${S3_BUCKET_NAME}`);
  console.log(`Prefix: ${S3_FETCH_PREFIX}`);

  let totalDeleted = 0;
  const errors: string[] = [];
  let continuationToken: string | undefined;

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
      Prefix: S3_FETCH_PREFIX,
      MaxKeys: S3_DELETE_BATCH_SIZE,
      ContinuationToken: continuationToken,
    });

    const listResponse = await s3Client.send(listCommand);
    const objects = listResponse.Contents;

    if (!objects || objects.length === 0) {
      break;
    }

    if (isDryRun) {
      console.log(`[DRY RUN] Would delete ${objects.length} S3 objects`);
      totalDeleted += objects.length;
    } else {
      try {
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: S3_BUCKET_NAME,
          Delete: {
            Objects: objects
              .filter(
                (obj: _Object): obj is _Object & { Key: string } =>
                  obj.Key !== undefined,
              )
              .map((obj) => ({ Key: obj.Key })),
            Quiet: true,
          },
        });

        const deleteResponse = await s3Client.send(deleteCommand);
        const errCount = deleteResponse.Errors?.length ?? 0;

        totalDeleted += objects.length - errCount;
        if (errCount > 0) {
          errors.push(`${errCount} S3 objects failed to delete in batch`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`S3 delete batch failed: ${errorMsg}`);
        console.error(`S3 delete error: ${errorMsg}`);
      }

      // Rate limiting between S3 batches
      await new Promise((resolve) =>
        setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS),
      );
    }

    if (totalDeleted % 10000 === 0 && totalDeleted > 0) {
      console.log(`S3 delete progress: ${totalDeleted} objects`);
    }

    continuationToken = listResponse.IsTruncated
      ? listResponse.NextContinuationToken
      : undefined;
  } while (continuationToken);

  console.log(`S3 fetch cache: ${totalDeleted} objects deleted`);
  return { objectsDeleted: totalDeleted, errors };
}

/**
 * Main cleanup handler
 */
export async function handler(event?: {
  dryRun?: boolean;
}): Promise<CleanupResult> {
  // Validate required environment variables first (fail fast)
  if (!CLEANUP_ENABLED) {
    throw new Error(
      "CACHE_CLEANUP_ENABLED not set to 'true'; cleanup is disabled for safety",
    );
  }

  if (!TABLE_NAME) {
    throw new Error("CACHE_DYNAMO_TABLE environment variable not set");
  }

  const isDryRun = event?.dryRun ?? DRY_RUN;

  console.log("=== Cache Cleanup ===");
  console.log(`DynamoDB Table: ${TABLE_NAME}`);
  console.log(`S3 Bucket: ${S3_BUCKET_NAME || "(not configured)"}`);
  console.log(`Builds to keep: ${BUILDS_TO_KEEP}`);
  console.log(`Dry run: ${isDryRun}`);
  console.log(`Cleanup enabled: ${CLEANUP_ENABLED}`);
  console.log("");

  const result: CleanupResult = {
    totalItems: 0,
    buildsFound: 0,
    buildsKept: 0,
    buildsDeleted: 0,
    itemsDeleted: 0,
    dryRun: isDryRun,
    keptBuilds: [],
    deletedBuilds: [],
    s3FetchCacheDeleted: 0,
    errors: [],
  };

  try {
    // Step 1: Scan and group by build
    const buildGroups = await scanAndGroupByBuild();
    result.buildsFound = buildGroups.size;
    result.totalItems = Array.from(buildGroups.values()).reduce(
      (sum, g) => sum + g.count,
      0,
    );

    if (buildGroups.size === 0) {
      console.log("No DynamoDB items found in table");
      // Still run S3 cleanup even if DynamoDB is empty
      const s3Result = await cleanupS3FetchCache(isDryRun);
      result.s3FetchCacheDeleted = s3Result.objectsDeleted;
      result.errors.push(...s3Result.errors);
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
      console.log("No DynamoDB items to delete");
      // Still run S3 cleanup even if no DynamoDB items to delete
      const s3Result = await cleanupS3FetchCache(isDryRun);
      result.s3FetchCacheDeleted = s3Result.objectsDeleted;
      result.errors.push(...s3Result.errors);
      return result;
    }

    // Step 4: Delete DynamoDB items
    const { deleted, errors } = await deleteItems(itemsToDelete, isDryRun);
    result.itemsDeleted = deleted;
    result.errors = errors;

    // Step 5: Clean up stale S3 fetch cache objects
    const s3Result = await cleanupS3FetchCache(isDryRun);
    result.s3FetchCacheDeleted = s3Result.objectsDeleted;
    result.errors.push(...s3Result.errors);

    console.log("\n=== Cleanup Complete ===");
    console.log(`DynamoDB - Total items: ${result.totalItems}`);
    console.log(`DynamoDB - Builds found: ${result.buildsFound}`);
    console.log(
      `DynamoDB - Builds kept: ${result.buildsKept} (${result.keptBuilds.join(", ")})`,
    );
    console.log(`DynamoDB - Builds deleted: ${result.buildsDeleted}`);
    console.log(`DynamoDB - Items deleted: ${result.itemsDeleted}`);
    console.log(
      `S3 - Fetch cache objects deleted: ${result.s3FetchCacheDeleted}`,
    );
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
// Uses ESM-compatible check (SST bundles as .mjs so `module` is undefined in ESM scope)
if (process.argv[1]?.includes("cleanup-dynamo-cache")) {
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
