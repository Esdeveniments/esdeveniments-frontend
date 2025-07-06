export default function Head() {
  return (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      {/* Critical Resource Hints - Performance Boost */}
      <link
        rel="preload"
        href="/fonts/inter.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <link rel="preconnect" href="https://www.googletagmanager.com" />
      <link rel="preconnect" href="https://www.google-analytics.com" />
      <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
      <link rel="dns-prefetch" href="//cdnjs.cloudflare.com" />
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />

      {/* PWA Manifest */}
      <link rel="manifest" href="/manifest.json" />
      <meta name="theme-color" content="#000000" />

      {/* RSS Feed */}
      <link
        rel="alternate"
        title="RSS Feed Esdeveniments.cat"
        type="application/rss+xml"
        href="/rss.xml"
      />
    </>
  );
}
