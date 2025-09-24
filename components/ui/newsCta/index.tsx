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
      aria-label={`Accedeix a ${label.toLowerCase()}`}
      rel="related"
      {...rest}
      className="group relative inline-flex items-center gap-2.5 rounded-xl border border-bColor/60 bg-whiteCorp px-4 py-2.5 sm:py-2 text-sm font-semibold text-fullBlackCorp shadow-sm hover:shadow-md hover:border-primary/50 hover:bg-darkCorp/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.99] sm:active:scale-[0.985] transition-[background,box-shadow,transform,border-color] duration-200 min-h-[44px] sm:min-h-[auto]"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-bColor bg-darkCorp group-hover:border-primary/40 group-hover:bg-whiteCorp transition-colors">
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
      <span className="flex-1 font-roboto tracking-normal text-[13px] sm:text-[14px] leading-relaxed truncate">
        {label}
      </span>
      <span
        aria-hidden
        className="flex h-6 w-6 items-center justify-center rounded-md text-primary/90 group-hover:text-primary transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 translate-x-0 group-hover:translate-x-0.5 transition-transform"
        >
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}

export default NewsCta;
