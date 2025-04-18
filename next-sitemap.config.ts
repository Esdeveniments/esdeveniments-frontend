import type { IConfig } from 'next-sitemap';

const siteUrl =
  process.env.NODE_ENV !== 'production'
    ? 'http://localhost:3000'
    : process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' ||
      process.env.NEXT_PUBLIC_VERCEL_ENV === 'development'
    ? 'https://esdeveniments.vercel.app'
    : 'https://www.esdeveniments.cat';

const config: IConfig = {
  siteUrl,
  changefreq: 'daily',
  priority: 0.7,
  exclude: [
    '/api/*',
    '/_app',
    '/_document',
    '/404',
    '/_error',
    '/sitemap.xml',
    '/server-sitemap.xml',
    '/rss.xml',
    '/.next/*',
    '/___next_launcher',
    '/___vc/*',
    '/node_modules/*',
    '/package.json',
    '/e/[eventId]/*',
    '/[place]/*',
  ],
  generateRobotsTxt: true,
  generateIndexSitemap: true,
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', disallow: ['/404'] },
      { userAgent: '*', allow: '/' },
    ],
    additionalSitemaps: [
      `${siteUrl}/sitemap.xml`,
      `${siteUrl}/server-sitemap.xml`,
    ],
  },
  output: 'standalone',
};

export default config;
