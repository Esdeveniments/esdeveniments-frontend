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
      },
      warm: 5,
      transform: {
        server: {
          // All Lambda functions (server, image optimizer, warmer, revalidation) use nodejs22.x
          // OpenNext applies this runtime to all Lambda functions it creates
          runtime: "nodejs22.x", // Upgraded from nodejs20.x (deprecated April 2026)
          memory: "3008 MB", // Maximum allowed: 3 GB = 3 vCPUs (AWS Lambda limit for arm64/eu-west-3)
          timeout: "20 seconds",
          architecture: "arm64",
          // Sentry layer ARN - configurable per environment/region
          // Defaults to eu-west-3 version 283 if not specified
          layers: process.env.SENTRY_LAYER_ARN
            ? [process.env.SENTRY_LAYER_ARN]
            : [
                "arn:aws:lambda:eu-west-3:943013980633:layer:SentryNodeServerlessSDK:283",
              ],
          environment: {
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
          },
        },
      },
      imageOptimization: {
        memory: "3008 MB", // Maximum allowed for image optimizer Lambda (3 vCPUs)
        staticEtag: true, // Enable stronger caching for optimized images
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
