import { SelectSkeletonProps } from "types/props";

export default function SelectSkeleton({
  label,
  className = "",
}: SelectSkeletonProps) {
  const containerClassName = ["w-full", className].filter(Boolean).join(" ");

  return (
    <div className={containerClassName} aria-hidden="true">
      {label ? <p className="text-foreground-strong font-bold">{label}</p> : null}
      <div
        className={`h-[42px] bg-muted border border-border rounded-lg animate-pulse ${
          label ? "mt-2" : ""
        }`}
      />
    </div>
  );
}
