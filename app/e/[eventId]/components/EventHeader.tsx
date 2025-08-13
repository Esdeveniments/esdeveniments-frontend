"use client";

export default function EventHeader({ title }: { title: string }) {
  return (
    <div className="w-full flex items-center justify-between px-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
    </div>
  );
}
