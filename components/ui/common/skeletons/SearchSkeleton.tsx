export default function SearchSkeleton() {
  return (
    <div className="w-full flex justify-center mt-element-gap" aria-hidden="true">
      <div className="w-full flex justify-center border border-border rounded-input pl-input-x">
        <div className="w-full flex items-center gap-element-gap rounded-input py-2">
          <div className="h-10 w-10 bg-border/40 rounded animate-pulse" />
          <div className="flex-1 h-10 bg-border/40 rounded animate-pulse" />
          <div className="h-10 w-10 bg-border/40 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
