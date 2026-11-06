import NewsListSkeleton from "@components/noticies/NewsListSkeleton";

// Covers /noticies and /noticies/[place]; both read request data before
// rendering, so without this boundary they would block the layout shell.
export default function NoticiesLoading() {
  return (
    <div className="w-full bg-background pb-section-y" aria-hidden="true">
      <div className="container flex flex-col gap-element-gap min-w-0 pt-4">
        <div className="h-4 w-40 bg-border/40 rounded animate-pulse" />
        <div className="h-8 w-2/3 mt-element-gap bg-border/40 rounded animate-pulse" />
        <div className="h-5 w-full mb-element-gap bg-border/40 rounded animate-pulse" />
        <NewsListSkeleton />
      </div>
    </div>
  );
}
