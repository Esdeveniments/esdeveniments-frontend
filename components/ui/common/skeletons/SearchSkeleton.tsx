export default function SearchSkeleton() {
  return (
    <div
      className="w-full flex justify-center border border-border rounded-input pl-input-x mt-element-gap"
      aria-hidden="true"
    >
      <div className="w-full flex justify-start items-center gap-element-gap rounded-input">
        <div className="h-10 flex justify-center items-center px-button-x">
          <div className="h-5 w-5 bg-border/40 rounded-full animate-pulse" />
        </div>
        <div className="w-full h-10 bg-border/40 rounded animate-pulse" />
        <div className="flex justify-end items-center px-button-x">
          <div className="h-4 w-4 bg-border/40 rounded-full animate-pulse" />
        </div>
        <div className="h-10 flex justify-center items-center px-2 rounded-r-input">
          <div className="h-5 w-5 bg-border/40 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
