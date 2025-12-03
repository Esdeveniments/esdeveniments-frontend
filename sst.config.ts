/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(_input) {
    return {
      name: "esdeveniments-frontend",
      home: "aws",
      providers: {
        aws: {
          region: "eu-west-3", // Explicitly set your region here
          profile: "default", // Use the default AWS profile
        },
      },
    };
  },
  async run() {
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
        return response.Parameter?.Value || "";
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

    new aws.sns.TopicSubscription("SiteAlarmsEmail", {
      topic: alarmsTopic.arn,
      protocol: "email",
      endpoint: "esdeveniments.catalunya.cat@gmail.com",
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
      },
      warm: 5,
      transform: {
        server: {
          runtime: "nodejs22.x", // Upgraded from nodejs20.x (deprecated April 2026)
          memory: "2048 MB",
          timeout: "20 seconds",
          architecture: "arm64",
          layers: [
            "arn:aws:lambda:eu-west-3:943013980633:layer:SentryNodeServerlessSDK:283",
          ],
          environment: {
            SENTRY_DSN: process.env.SENTRY_DSN!,
            SENTRY_TRACES_SAMPLE_RATE: "1.0",
          },
        },
      },
      imageOptimization: {
        memory: "2048 MB", // more CPU for resizing
        staticEtag: true, // Enable stronger caching for optimized images
      },
    });

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
        FunctionName: site.nodes.server!.name,
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
        FunctionName: site.nodes.server!.name,
      },
      alarmActions: [alarmsTopic.arn],
    });

    return {
      SiteUrl: site.url,
    };
  },
});
