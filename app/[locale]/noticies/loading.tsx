import NewsListSkeleton from "@components/noticies/NewsListSkeleton";

// Covers /noticies and /noticies/[place]; both read request data before
// rendering, so without this boundary they would block the layout shell.
export default function NoticiesLoading() {
  return (
    <div className="w-full bg-background pb-10" aria-hidden="true">
      <div className="container flex flex-col gap-section-y min-w-0">
        <NewsListSkeleton />
      </div>
    </div>
  );
}
