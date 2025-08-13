import Document, { Html, Head, Main, NextScript } from "next/document";
import { env } from "@utils/helpers";
import { siteUrl } from "@config/index";

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    const meticulousScript =
      env === "dev" ? (
        // eslint-disable-next-line @next/next/no-sync-scripts
        <script
          data-project-id={process.env.NEXT_PUBLIC_METICULOUS_PROJECT_ID}
          data-is-production-environment="false"
          src="https://snippet.meticulous.ai/v1/meticulous.js"
        />
      ) : null;

    const orgJsonLd = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Esdeveniments.cat",
      url: siteUrl,
      logo: `${siteUrl}/static/images/logo-seo-meta.webp`,
      sameAs: [
        "https://twitter.com/esdeveniments_",
        "https://www.instagram.com/esdevenimentscat/",
        "https://t.me/esdeveniments",
        "https://www.facebook.com/esdeveniments.cat/",
      ],
    };

    const webSiteJsonLd = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      url: siteUrl,
      name: "Esdeveniments.cat",
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    };

    return (
      <Html lang="ca-ES">
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
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
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
