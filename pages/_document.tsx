import { JSX } from "react";
import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
  DocumentInitialProps,
} from "next/document";
import { env } from "@utils/helpers";

class MyDocument extends Document {
  static async getInitialProps(
    ctx: DocumentContext
  ): Promise<DocumentInitialProps> {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render(): JSX.Element {
    const meticulousScript =
      env === "dev" ? (
        // eslint-disable-next-line @next/next/no-sync-scripts
        <script
          data-project-id={process.env.NEXT_PUBLIC_METICULOUS_PROJECT_ID}
          data-is-production-environment="false"
          src="https://snippet.meticulous.ai/v1/meticulous.js"
        />
      ) : null;

    return (
      <Html>
        <Head>
          {meticulousScript}
          <link
            rel="preload"
            href="/static/fonts/BarlowCondensed-Regular.ttf"
            as="font"
            type="font/ttf"
            crossOrigin="anonymous"
          />
          <link
            rel="preload"
            href="/static/fonts/RobotoFlex-Regular.ttf"
            as="font"
            type="font/ttf"
            crossOrigin="anonymous"
          />
          <link rel="preconnect" href="https://www.googletagmanager.com" />
          <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
          <link rel="preconnect" href="https://www.google-analytics.com" />
          <link
            rel="preconnect"
            href="https://fundingchoicesmessages.google.com"
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
