/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(_input) {
    return {
      name: "esdeveniments-frontend",
      home: "aws",
      providers: {
        aws: {
          region: "eu-west-3",
          // Don't specify profile - use environment variables in CI
          // Local development will use default AWS credentials
        },
      },
    };
  },
  async run() {
    // Set Node.js 22.x runtime for ALL Lambda functions globally
    // This applies to server, image optimizer, warmer, and revalidation functions
    // Upgraded from nodejs20.x (deprecated April 2026)
    $transform(sst.aws.Function, (args) => {
      args.runtime = "nodejs22.x";

      // Fix OpenNext/SST image optimizer S3 access:
      // The optimizer reads from the site assets bucket using BUCKET_NAME/BUCKET_KEY_PREFIX.
      // It needs ListBucket on the bucket ARN (not just GetObject on bucket/*).
      const environment = args.environment as
        | Record<string, unknown>
        | undefined;
      const bucketKeyPrefix = environment?.BUCKET_KEY_PREFIX;
      const bucketName = environment?.BUCKET_NAME;

      if (bucketKeyPrefix === "_assets" && bucketName) {
        const listBucketPermission = {
          actions: ["s3:ListBucket"],
          resources: [`arn:aws:s3:::${String(bucketName)}`],
        };

        const existingPermissions = args.permissions;
        if (!existingPermissions) {
          args.permissions = [listBucketPermission];
        } else if (Array.isArray(existingPermissions)) {
          const alreadyHasListBucket = existingPermissions.some((p) => {
            if (!p || typeof p !== "object") return false;
            const actions = (p as { actions?: unknown }).actions;
            const resources = (p as { resources?: unknown }).resources;
            if (!Array.isArray(actions) || !Array.isArray(resources))
              return false;
            return (
              actions.includes("s3:ListBucket") &&
              resources.some(
                (r) => String(r) === String(listBucketPermission.resources[0])
              )
            );
          });

          if (!alreadyHasListBucket)
            existingPermissions.push(listBucketPermission);
        }
      }

      // Add CloudFront invalidation permission for revalidation endpoint
      // This allows the Lambda to create cache invalidations when places/regions change
      const cloudfrontDistributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
      const awsAccountId = process.env.AWS_ACCOUNT_ID;
      if (cloudfrontDistributionId && awsAccountId) {
        const cloudfrontPermission = {
          actions: ["cloudfront:CreateInvalidation"],
          resources: [
            // CloudFront is a global service but ARN requires account ID for IAM
            `arn:aws:cloudfront::${awsAccountId}:distribution/${cloudfrontDistributionId}`,
          ],
        };

        const existingPerms = args.permissions;
        if (!existingPerms) {
          args.permissions = [cloudfrontPermission];
        } else if (Array.isArray(existingPerms)) {
          const targetResource = `arn:aws:cloudfront::${awsAccountId}:distribution/${cloudfrontDistributionId}`;
          const alreadyHasCloudFront = existingPerms.some((p) => {
            if (!p || typeof p !== "object") return false;
            const stmt = p as { actions?: unknown; resources?: unknown };
            return (
              Array.isArray(stmt.actions) &&
              stmt.actions.includes("cloudfront:CreateInvalidation") &&
              Array.isArray(stmt.resources) &&
              stmt.resources.includes(targetResource)
            );
          });

          if (!alreadyHasCloudFront) existingPerms.push(cloudfrontPermission);
        }
      }
    });

    // Helper function to get parameter from SSM Parameter Store
    async function getSsmParameter(parameterName: string): Promise<string> {
      // Dynamic import to avoid top-level imports
      const { SSMClient, GetParameterCommand } = await import(
        "@aws-sdk/client-ssm"
      );

      const client = new SSMClient({
        region: process.env.AWS_REGION || "eu-west-3",
      });

      try {
        const command = new GetParameterCommand({
          Name: parameterName,
          WithDecryption: true, // For SecureString parameters
        });
        const response = await client.send(command);
        if (!response.Parameter?.Value) {
          throw new Error(`SSM parameter ${parameterName} has no value`);
        }
        return response.Parameter.Value;
      } catch (error) {
        console.error(`Failed to fetch SSM parameter ${parameterName}:`, error);
        throw error;
      }
    }

    // Fetch certificate ARN from SSM Parameter Store
    // Falls back to environment variable if SSM parameter is not found
    const certArn =
      process.env.ACM_CERTIFICATE_ARN ||
      (await getSsmParameter(
        "/esdeveniments-frontend/acm-certificate-arn"
      ).catch(() => process.env.ACM_CERTIFICATE_ARN || ""));

    if (!certArn) {
      throw new Error(
        "ACM_CERTIFICATE_ARN must be set either as environment variable or SSM parameter at /esdeveniments-frontend/acm-certificate-arn"
      );
    }

    const alarmsTopic = new sst.aws.SnsTopic("SiteAlarms");

    // Alarm email endpoint - configurable per environment
    const alarmEmail =
      process.env.ALARM_EMAIL || "esdeveniments.catalunya.cat@gmail.com";

    new aws.sns.TopicSubscription("SiteAlarmsEmail", {
      topic: alarmsTopic.arn,
      protocol: "email",
      endpoint: alarmEmail,
    });

    // Alarm for the OpenNext image optimizer Lambda (Next.js /_next/image).
    // SST doesn't currently expose this function under `site.nodes`, so we detect it
    // by its environment vars and attach a CloudWatch alarm.
    // Also configure timeout and SSL settings for the image optimizer.
    $transform(aws.lambda.Function, (args, _opts, name) => {
      const environment = args.environment as unknown;
      const variables =
        environment &&
        typeof environment === "object" &&
        "variables" in environment &&
        typeof (environment as { variables?: unknown }).variables === "object"
          ? (environment as { variables?: Record<string, unknown> })
              .variables ?? undefined
          : undefined;

      const bucketKeyPrefix = variables?.["BUCKET_KEY_PREFIX"];
      if (bucketKeyPrefix !== "_assets") return;

      // Configure image optimizer Lambda settings:
      // - Increase timeout for slow external image sources (default is 25s)
      // - Disable strict SSL verification for external images with incomplete certificate chains
      //   (e.g., biguesiriells.cat missing intermediate certs). This is a security tradeoff -
      //   ideally those servers should fix their SSL config.
      args.timeout = 60;
      if (variables && typeof variables === "object") {
        (variables as Record<string, unknown>)["NODE_TLS_REJECT_UNAUTHORIZED"] =
          "0";
      }

      new aws.cloudwatch.MetricAlarm(
        `${name}ImageOptimizerErrorAlarm`,
        {
          comparisonOperator: "GreaterThanThreshold",
          evaluationPeriods: 1,
          metricName: "Errors",
          namespace: "AWS/Lambda",
          period: 60,
          statistic: "Sum",
          threshold: 5,
          treatMissingData: "notBreaching",
          dimensions: {
            FunctionName: args.name,
          },
          alarmActions: [alarmsTopic.arn],
        },
        { parent: alarmsTopic }
      );
    });

    const site = new sst.aws.Nextjs("site", {
      domain: {
        name: "esdeveniments.cat",
        aliases: ["www.esdeveniments.cat"],
        dns: false, // DNS managed externally via Cloudflare instead of Route53
        cert: certArn,
      },
      environment: {
        NEXT_PUBLIC_API_URL: (() => {
          const url = process.env.NEXT_PUBLIC_API_URL;
          if (!url) {
            throw new Error(
              "NEXT_PUBLIC_API_URL environment variable must be set for SST deployment"
            );
          }
          return url;
        })(),
        // Public site URL for SEO, metadata, canonical URLs
        // This should always be the production domain for proper SEO
        NEXT_PUBLIC_SITE_URL: "https://www.esdeveniments.cat",
        // Note: INTERNAL_SITE_URL cannot be set here as it references site.url
        // which isn't available during resource creation. The code will fall back
        // to NEXT_PUBLIC_SITE_URL if INTERNAL_SITE_URL is not set.
        HMAC_SECRET: (() => {
          const secret = process.env.HMAC_SECRET;
          if (!secret) {
            throw new Error(
              "HMAC_SECRET environment variable must be set for SST deployment"
            );
          }
          return secret;
        })(),
        REVALIDATE_SECRET: (() => {
          const secret = process.env.REVALIDATE_SECRET;
          if (!secret) {
            throw new Error(
              "REVALIDATE_SECRET environment variable must be set for SST deployment"
            );
          }
          return secret;
        })(),
        DEEPL_API_KEY: (() => {
          const key = process.env.DEEPL_API_KEY;
          if (!key) {
            throw new Error(
              "DEEPL_API_KEY environment variable must be set for SST deployment"
            );
          }
          return key;
        })(),
        // Optional: Pipedream webhook URL for new event email notifications
        // If not set, email notifications will be silently skipped
        ...(process.env.NEW_EVENT_EMAIL_URL && {
          NEW_EVENT_EMAIL_URL: process.env.NEW_EVENT_EMAIL_URL,
        }),
        // Optional: CloudFront distribution ID for cache invalidation
        // Used by /api/revalidate to purge CDN cache when places/regions change
        // If not set, CloudFront invalidation is skipped gracefully
        ...(process.env.CLOUDFRONT_DISTRIBUTION_ID && {
          CLOUDFRONT_DISTRIBUTION_ID: process.env.CLOUDFRONT_DISTRIBUTION_ID,
        }),
      },
      warm: 3, // Reduced from 5 to save ~$20/month on idle warm instances
      server: {
        // Install sharp with linux-x64 binaries in the server function bundle.
        // OpenNext excludes sharp by default (only installs it for the image optimizer).
        // Since we have a custom /api/image-proxy using sharp, we need to include it.
        // Include platform-specific packages explicitly for Lambda (linux-x64)
        install: [
          "sharp",
          "@img/sharp-linux-x64",
          "@img/sharp-libvips-linux-x64",
        ],
      },
      transform: {
        server: (args) => {
          // All Lambda functions (server, image optimizer, warmer, revalidation) use nodejs22.x
          // OpenNext applies this runtime to all Lambda functions it creates
          args.runtime = "nodejs22.x"; // Upgraded from nodejs20.x (deprecated April 2026)
          args.memory = "1792 MB"; // Reduced from 3008 MB (1 vCPU equivalent) - saves ~$30/month
          args.timeout = "20 seconds";
          // Using x64 architecture for better compatibility with native modules (sharp)
          // CI builds on ubuntu-latest (x64), so Lambda must also be x64
          args.architecture = "x86_64";
          // Sentry layer ARN - configurable per environment/region
          // Defaults to eu-west-3 version 283 if not specified
          args.layers = process.env.SENTRY_LAYER_ARN
            ? [process.env.SENTRY_LAYER_ARN]
            : [
                "arn:aws:lambda:eu-west-3:943013980633:layer:SentryNodeServerlessSDK:283",
              ];
          // IMPORTANT: Merge with existing environment to preserve SST's auto-set variables
          // SST automatically sets CACHE_BUCKET_NAME, CACHE_BUCKET_KEY_PREFIX, CACHE_BUCKET_REGION
          // for OpenNext ISR/fetch caching. Overwriting environment loses these.
          args.environment = {
            ...args.environment,
            SENTRY_DSN: (() => {
              const dsn = process.env.SENTRY_DSN;
              if (!dsn) {
                throw new Error(
                  "SENTRY_DSN environment variable must be set for SST deployment"
                );
              }
              return dsn;
            })(),
            SENTRY_TRACES_SAMPLE_RATE:
              process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1",
            // Bypass strict SSL verification for external images with incomplete certificate
            // chains (e.g., biguesiriells.cat missing intermediate certs). This allows the
            // /api/image-proxy route to fetch images from misconfigured municipal servers.
            // Security tradeoff: ideally these servers should fix their SSL config.
            NODE_TLS_REJECT_UNAUTHORIZED: "0",
          };
        },
      },
      imageOptimization: {
        memory: "2048 MB", // Increased from 1536 MB - large external images need more RAM for Sharp processing
        staticEtag: true, // Enable stronger caching for optimized images
      },
      // Explicitly invalidate robots.txt on deploy to ensure route handler changes take effect
      // CloudFront caches robots.txt with s-maxage=86400 (24 hours) by default, so we need
      // to invalidate it after deployment to serve the new route handler response
      // Note: Since robots.txt is NOT in public/, it should be handled by app/robots.txt/route.ts
      // The invalidation ensures CloudFront doesn't serve a cached version
      invalidation: {
        paths: ["/robots.txt"],
        wait: true, // Wait for invalidation to complete before deployment finishes
      },
    });

    // Validate that server node exists before creating alarms
    if (!site.nodes.server) {
      throw new Error("Server node is not available for alarm configuration");
    }

    // Create an alarm for 5xx Errors (Server Faults)
    new aws.cloudwatch.MetricAlarm("ServerErrorAlarm", {
      comparisonOperator: "GreaterThanThreshold",
      evaluationPeriods: 1,
      metricName: "Errors",
      namespace: "AWS/Lambda",
      period: 60,
      statistic: "Sum",
      threshold: 10,
      dimensions: {
        FunctionName: site.nodes.server.name,
      },
      alarmActions: [alarmsTopic.arn],
    });

    // Create an alarm for Throttling (Too many requests or concurrency limit)
    new aws.cloudwatch.MetricAlarm("ThrottlingAlarm", {
      comparisonOperator: "GreaterThanThreshold",
      evaluationPeriods: 1,
      metricName: "Throttles",
      namespace: "AWS/Lambda",
      period: 60,
      statistic: "Sum",
      threshold: 5,
      dimensions: {
        FunctionName: site.nodes.server.name,
      },
      alarmActions: [alarmsTopic.arn],
    });

    // CRITICAL: DynamoDB Write Spike Alarm
    // This catches issues like the Dec 28, 2025 incident ($282 cost spike)
    // where searchParams usage caused 200M writes in 16 hours.
    // Threshold: 100,000 writes/hour (baseline is ~1,500/hour)
    // Note: Without dimensions, this monitors ALL DynamoDB tables in the account.
    // Since we only have one table (siteRevalidationTable), this is fine.
    // If more tables are added, we should add dimensions with the specific table name.
    new aws.cloudwatch.MetricAlarm("DynamoDBWriteSpikeAlarm", {
      comparisonOperator: "GreaterThanThreshold",
      evaluationPeriods: 1,
      metricName: "ConsumedWriteCapacityUnits",
      namespace: "AWS/DynamoDB",
      period: 3600, // 1 hour
      statistic: "Sum",
      threshold: 100000, // 100K writes/hour (incident had 22M/hour at peak)
      treatMissingData: "notBreaching",
      alarmDescription:
        "DynamoDB writes exceeded 100K/hour. Check for searchParams usage in listing pages!",
      alarmActions: [alarmsTopic.arn],
      // Note: okActions removed to reduce email noise. You'll only get alerts when threshold is breached.
    });

    // DynamoDB Read Spike Alarm (secondary indicator of cache issues)
    new aws.cloudwatch.MetricAlarm("DynamoDBReadSpikeAlarm", {
      comparisonOperator: "GreaterThanThreshold",
      evaluationPeriods: 1,
      metricName: "ConsumedReadCapacityUnits",
      namespace: "AWS/DynamoDB",
      period: 3600, // 1 hour
      statistic: "Sum",
      threshold: 500000, // 500K reads/hour
      treatMissingData: "notBreaching",
      alarmDescription:
        "DynamoDB reads exceeded 500K/hour. Possible cache thrashing.",
      alarmActions: [alarmsTopic.arn],
    });

    // =========================================================================
    // ADDITIONAL COST MONITORING ALARMS
    // Baselines established Dec 30, 2025:
    //   - Lambda: ~66K invocations/day (~2,750/hour)
    //   - Monthly cost: ~$2-4/month healthy
    // =========================================================================

    // --- LAMBDA COST ALARMS ---

    // Lambda Invocation Spike (baseline: ~2,750/hour = 66K/day)
    // High invocations = high Lambda cost
    new aws.cloudwatch.MetricAlarm("LambdaInvocationSpikeAlarm", {
      comparisonOperator: "GreaterThanThreshold",
      evaluationPeriods: 1,
      metricName: "Invocations",
      namespace: "AWS/Lambda",
      period: 3600, // 1 hour
      statistic: "Sum",
      threshold: 50000, // 50K invocations/hour (~18x baseline)
      treatMissingData: "notBreaching",
      dimensions: {
        FunctionName: site.nodes.server.name,
      },
      alarmDescription:
        "Lambda invocations exceeded 50K/hour. Check for traffic spike or infinite loops.",
      alarmActions: [alarmsTopic.arn],
    });

    // Lambda Duration Spike (baseline: ~625K ms/hour)
    // High duration = slow code or external API issues
    new aws.cloudwatch.MetricAlarm("LambdaDurationSpikeAlarm", {
      comparisonOperator: "GreaterThanThreshold",
      evaluationPeriods: 1,
      metricName: "Duration",
      namespace: "AWS/Lambda",
      period: 3600, // 1 hour
      statistic: "Sum",
      threshold: 10000000, // 10M ms/hour (~16x baseline)
      treatMissingData: "notBreaching",
      dimensions: {
        FunctionName: site.nodes.server.name,
      },
      alarmDescription:
        "Lambda total duration exceeded 10M ms/hour. Check for slow external APIs or code issues.",
      alarmActions: [alarmsTopic.arn],
    });

    // Lambda Concurrent Executions (can trigger throttling and cost)
    new aws.cloudwatch.MetricAlarm("LambdaConcurrencyAlarm", {
      comparisonOperator: "GreaterThanThreshold",
      evaluationPeriods: 1,
      metricName: "ConcurrentExecutions",
      namespace: "AWS/Lambda",
      period: 60,
      statistic: "Maximum",
      threshold: 100, // High concurrency threshold
      treatMissingData: "notBreaching",
      dimensions: {
        FunctionName: site.nodes.server.name,
      },
      alarmDescription:
        "Lambda concurrent executions exceeded 100. High traffic or slow responses.",
      alarmActions: [alarmsTopic.arn],
    });

    // --- CLOUDFRONT ALARMS ---
    // Note: CloudFront metrics require DistributionId dimension.
    // SST's Nextjs component exposes site.nodes.cdn (the Cdn component),
    // which in turn exposes site.nodes.cdn.nodes.distribution (the Pulumi AWS Distribution).
    // We need to guard against undefined since nodes.cdn might not exist in some configurations.

    // Get CloudFront distribution ID from SST (only if cdn node exists)
    if (site.nodes.cdn) {
      const distributionId = site.nodes.cdn.nodes.distribution.id;

      // CloudFront 5xx Error Rate (indicates origin issues)
      new aws.cloudwatch.MetricAlarm("CloudFront5xxErrorAlarm", {
        comparisonOperator: "GreaterThanThreshold",
        evaluationPeriods: 2,
        metricName: "5xxErrorRate",
        namespace: "AWS/CloudFront",
        period: 300, // 5 minutes
        statistic: "Average",
        threshold: 5, // 5% error rate
        treatMissingData: "notBreaching",
        dimensions: {
          DistributionId: distributionId,
          Region: "Global", // CloudFront metrics are always Global
        },
        alarmDescription:
          "CloudFront 5xx error rate exceeded 5%. Check Lambda errors and origin health.",
        alarmActions: [alarmsTopic.arn],
      });

      // CloudFront Request Spike (traffic anomaly detection)
      new aws.cloudwatch.MetricAlarm("CloudFrontRequestSpikeAlarm", {
        comparisonOperator: "GreaterThanThreshold",
        evaluationPeriods: 1,
        metricName: "Requests",
        namespace: "AWS/CloudFront",
        period: 3600, // 1 hour
        statistic: "Sum",
        threshold: 1000000, // 1M requests/hour
        treatMissingData: "notBreaching",
        dimensions: {
          DistributionId: distributionId,
          Region: "Global",
        },
        alarmDescription:
          "CloudFront requests exceeded 1M/hour. Check for bot traffic or DDoS.",
        alarmActions: [alarmsTopic.arn],
      });
    }

    // Note: S3 request metrics require enabling request metrics on the bucket,
    // which adds ~$0.01/1000 requests. Not enabled by default.
    // The Lambda and DynamoDB alarms cover the main cost drivers.
    // If you want S3 monitoring, enable request metrics in the S3 console first.

    // =========================================================================
    // CACHE CLEANUP LAMBDA
    // Cleans up stale ISR cache entries from old deployments.
    // Each deployment creates a new build ID prefix - old entries become orphaned.
    // Runs weekly to keep the DynamoDB table size manageable.
    // =========================================================================

    // Get the revalidation table from OpenNext - this is the ISR cache table
    const revalidationTable = site.nodes.revalidationTable;

    // Only set up cleanup if the revalidation table exists
    // (it won't exist in dev mode or if ISR is not configured)
    // Note: SST v3 handles Output<T> types natively in environment/permissions
    if (revalidationTable) {
      const cacheCleanupLambda = new sst.aws.Function("CacheCleanupLambda", {
        handler: "scripts/cleanup-dynamo-cache.handler",
        runtime: "nodejs22.x",
        timeout: "15 minutes",
        memory: "256 MB",
        environment: {
          // SST resolves Output<string> at deploy time
          CACHE_DYNAMO_TABLE: revalidationTable.name,
          BUILDS_TO_KEEP: "3", // Keep last 3 builds for rollback safety
          // Allow override via deployment env for safe testing in production
          DRY_RUN: process.env.CACHE_CLEANUP_DRY_RUN ?? "false",
        },
        permissions: [
          {
            actions: ["dynamodb:Scan", "dynamodb:BatchWriteItem"],
            // SST resolves Output<string> at deploy time
            resources: [revalidationTable.arn],
          },
        ],
      });

      // Schedule: Run every Sunday at 3 AM UTC (low traffic time)
      // SST Cron handles EventRule, EventTarget, and Lambda permissions automatically
      new sst.aws.Cron("CacheCleanupCron", {
        schedule: "cron(0 3 ? * SUN *)",
        job: cacheCleanupLambda,
      });
    }

    return {
      SiteUrl: site.url,
    };
  },
});
