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

    const site = new sst.aws.Nextjs("site", {
      domain: {
        name: "esdeveniments.cat",
        aliases: ["www.esdeveniments.cat"],
        dns: false, // Correct: disables SST managing Route53
        cert: certArn,
      },
      environment: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL!,
      },
      warm: 2,
      transform: {
        server: {
          memory: "2048 MB",
          timeout: "20 seconds",
          architecture: "arm64",
        },
      },
      imageOptimization: {
        memory: "2048 MB", // more CPU for resizing
        // staticEtag: true,    // optional: stronger caching behaviour
      },
    });

    return {
      SiteUrl: site.url,
    };
  },
});
