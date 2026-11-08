import SitemapLayout from "@components/ui/sitemap/SitemapLayout";
import SitemapSkeleton from "@components/sitemap/SitemapSkeleton";

// /festes-majors waits on connection() and the backend before rendering.
export default function FestesMajorsLoading() {
  return (
    <SitemapLayout>
      <SitemapSkeleton />
    </SitemapLayout>
  );
}
