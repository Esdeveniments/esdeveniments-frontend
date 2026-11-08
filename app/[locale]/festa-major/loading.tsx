import SitemapLayout from "@components/ui/sitemap/SitemapLayout";
import SitemapSkeleton from "@components/sitemap/SitemapSkeleton";

// Covers /festa-major/<place> and /festa-major/<town>/<festa>: both wait on
// connection() and the backend before rendering.
export default function FestaMajorLoading() {
  return (
    <SitemapLayout>
      <SitemapSkeleton />
    </SitemapLayout>
  );
}
