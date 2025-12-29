import { NextRequest, NextResponse } from "next/server";

/**
 * Health check endpoint for monitoring cache infrastructure.
 * 
 * Public access: Returns simple status only (no sensitive details)
 * Authenticated access: Returns full diagnostic info
 * 
 * Usage: 
 *   GET /api/health → { status: "healthy" | "degraded" }
 *   GET /api/health?secret=<REVALIDATE_SECRET> → full details
 */

function isValidBucketName(name: string | undefined): boolean {
  if (!name) return false;
  // SST bucket names follow pattern like: production-site-xxxxx
  // Invalid values we've seen: "__fetch", undefined, null, empty string
  if (name === "__fetch" || name.startsWith("__")) return false;
  if (name.length < 3 || name.length > 63) return false;
  // Basic S3 bucket name validation (lowercase, numbers, hyphens)
  return /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(name);
}

function isValidTableName(name: string | undefined): boolean {
  if (!name) return false;
  // Invalid values: null, undefined, empty, or placeholder strings
  if (name === "null" || name === "undefined") return false;
  if (name.length < 3 || name.length > 255) return false;
  // DynamoDB table names: alphanumeric, hyphens, underscores, dots
  return /^[a-zA-Z0-9._-]+$/.test(name);
}

export async function GET(request: NextRequest) {
  const bucketName = process.env.CACHE_BUCKET_NAME;
  const tableName = process.env.CACHE_DYNAMO_TABLE;

  const s3Valid = isValidBucketName(bucketName);
  const dynamoValid = isValidTableName(tableName);
  const isHealthy = s3Valid && dynamoValid;

  // Check if authenticated (use same secret as revalidation endpoint)
  const secret = request.nextUrl.searchParams.get("secret");
  const isAuthenticated = secret && secret === process.env.REVALIDATE_SECRET;

  // Public response: minimal info only
  if (!isAuthenticated) {
    return NextResponse.json(
      {
        status: isHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
      },
      {
        status: isHealthy ? 200 : 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  // Authenticated response: full diagnostic details
  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      cache: {
        s3: {
          configured: s3Valid,
          // Only show bucket name if valid (don't leak invalid placeholder values)
          bucket: s3Valid ? bucketName : null,
          issue: s3Valid ? null : bucketName ? `invalid: "${bucketName}"` : "not set",
        },
        dynamodb: {
          configured: dynamoValid,
          table: dynamoValid ? tableName : null,
          issue: dynamoValid ? null : tableName ? `invalid: "${tableName}"` : "not set",
        },
      },
      environment: process.env.NODE_ENV,
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "unknown",
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
