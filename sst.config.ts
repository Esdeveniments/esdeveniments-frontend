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
      },
      warm: 5,
      transform: {
        server: (args) => {
          // All Lambda functions (server, image optimizer, warmer, revalidation) use nodejs22.x
          // OpenNext applies this runtime to all Lambda functions it creates
          args.runtime = "nodejs22.x"; // Upgraded from nodejs20.x (deprecated April 2026)
          args.memory = "3008 MB"; // Maximum allowed: 3 GB = 3 vCPUs (AWS Lambda limit for arm64/eu-west-3)
          args.timeout = "20 seconds";
          args.architecture = "arm64";
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
        memory: "3008 MB", // Maximum allowed for image optimizer Lambda (3 vCPUs)
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

    return {
      SiteUrl: site.url,
    };
  },
});
