import SitemapLayout from "@components/ui/sitemap/SitemapLayout";
import SitemapSkeleton from "@components/sitemap/SitemapSkeleton";

// /festa-major/<place> waits on connection() and the backend before rendering.
export default function FestaMajorLoading() {
  return (
    <SitemapLayout>
      <SitemapSkeleton />
    </SitemapLayout>
  );
}
