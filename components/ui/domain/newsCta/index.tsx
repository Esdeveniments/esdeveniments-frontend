import Link from "next/link";
import type { NewsCtaProps } from "types/ui";

/**
 * Polished inline CTA inspired by large event platforms (Timeout/Eventbrite style):
 * - Compact pill/card hybrid
 * - Icon avatar + strong text + arrow affordance
 * - Accessible focus state & reduced motion friendly transitions
 */
export function NewsCta({ href, label, ...rest }: NewsCtaProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      aria-label={`Accedeix a ${label}`}
      rel="related"
      {...rest}
      className="gap-component-xs.5 py-component-xs.5 group relative inline-flex min-h-[44px] items-center rounded-xl border border-bColor/60 bg-whiteCorp px-component-md font-semibold text-fullBlackCorp shadow-sm transition-[background,box-shadow,transform,border-color] duration-200 hover:border-primary/50 hover:bg-darkCorp/30 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.99] sm:min-h-[auto] sm:py-component-xs sm:active:scale-[0.985]"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-bColor bg-darkCorp transition-colors group-hover:border-primary/40 group-hover:bg-whiteCorp">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 text-primary"
        >
          <rect x="3" y="4" width="13" height="16" rx="2" ry="2" />
          <path d="M16 8h2a2 2 0 0 1 2 2v8c0 1.1-.9 2-2 2h-9" />
          <path d="M7 8h5" />
          <path d="M7 12h8" />
          <path d="M7 16h6" />
        </svg>
      </span>
      <span className="flex-1 truncate font-roboto text-[13px] leading-relaxed tracking-normal sm:text-[14px]">
        {label}
      </span>
      <span
        aria-hidden
        className="flex h-6 w-6 items-center justify-center rounded-md text-primary/90 transition-colors group-hover:text-primary"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 translate-x-0 transition-transform group-hover:translate-x-0.5"
        >
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}

export default NewsCta;
