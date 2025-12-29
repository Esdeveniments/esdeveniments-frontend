import type { JSX } from "react";
import PressableAnchorClient from "@components/ui/primitives/PressableAnchorClient";
import type { NoEventsFoundContentProps } from "types/props";

export default function NoEventsFoundContent({
  title,
  description,
  ctaLabel,
  helperText,
}: NoEventsFoundContentProps): JSX.Element {

  return (
    <div
      className="flex flex-col items-center gap-element-gap py-section-y"
      data-testid="no-events-found"
    >
      <div className="flex flex-col justify-center items-center gap-element-gap px-section-x">
        <div className="w-full flex justify-center">
          <svg
            viewBox="0 0 400 300"
            className="w-full relative z-10"
            style={{ filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.05))" }}
          >
            {/* Empty calendar pages - floating */}
            <g className="animate-float" style={{ animationDelay: "0s" }}>
              <rect
                x="80"
                y="60"
                width="100"
                height="120"
                rx="8"
                fill="#FFFFFF"
                stroke="#E5E7EB"
                strokeWidth="2"
              />
              <rect
                x="90"
                y="70"
                width="80"
                height="15"
                rx="4"
                fill="#FEF3C7"
              />
              <line
                x1="95"
                y1="100"
                x2="165"
                y2="100"
                stroke="#D1D5DB"
                strokeWidth="2"
              />
              <line
                x1="95"
                y1="115"
                x2="165"
                y2="115"
                stroke="#D1D5DB"
                strokeWidth="2"
              />
              <line
                x1="95"
                y1="130"
                x2="140"
                y2="130"
                stroke="#D1D5DB"
                strokeWidth="2"
              />
              <circle cx="100" cy="155" r="4" fill="#FCA5A5" opacity="0.5" />
              <circle cx="120" cy="155" r="4" fill="#FCA5A5" opacity="0.5" />
              <circle cx="140" cy="155" r="4" fill="#FCA5A5" opacity="0.5" />
            </g>

            <g className="animate-float" style={{ animationDelay: "0.5s" }}>
              <rect
                x="220"
                y="80"
                width="100"
                height="120"
                rx="8"
                fill="#FFFFFF"
                stroke="#E5E7EB"
                strokeWidth="2"
              />
              <rect
                x="230"
                y="90"
                width="80"
                height="15"
                rx="4"
                fill="#DBEAFE"
              />
              <line
                x1="235"
                y1="120"
                x2="305"
                y2="120"
                stroke="#D1D5DB"
                strokeWidth="2"
              />
              <line
                x1="235"
                y1="135"
                x2="305"
                y2="135"
                stroke="#D1D5DB"
                strokeWidth="2"
              />
              <line
                x1="235"
                y1="150"
                x2="280"
                y2="150"
                stroke="#D1D5DB"
                strokeWidth="2"
              />
              <circle cx="240" cy="175" r="4" fill="#93C5FD" opacity="0.5" />
              <circle cx="260" cy="175" r="4" fill="#93C5FD" opacity="0.5" />
              <circle cx="280" cy="175" r="4" fill="#93C5FD" opacity="0.5" />
            </g>

            {/* Center decorative element - abstract venue/stage */}
            <g className="animate-float" style={{ animationDelay: "0.25s" }}>
              <path
                d="M 150 140 Q 200 120 250 140 L 250 200 L 150 200 Z"
                fill="#FFFBEB"
                stroke="#FBBF24"
                strokeWidth="2"
                opacity="0.6"
              />
              <circle
                cx="200"
                cy="160"
                r="20"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2"
                strokeDasharray="4 4"
                opacity="0.4"
              />
              <circle
                cx="200"
                cy="160"
                r="12"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.4"
              />
            </g>

            {/* Decorative dots pattern - Catalan tile inspiration */}
            <g opacity="0.3">
              <circle
                cx="50"
                cy="40"
                r="3"
                fill="#EF4444"
                className="animate-pulse"
                style={{ animationDelay: "0s" }}
              />
              <circle
                cx="350"
                cy="60"
                r="3"
                fill="#FBBF24"
                className="animate-pulse"
                style={{ animationDelay: "0.3s" }}
              />
              <circle
                cx="70"
                cy="240"
                r="3"
                fill="#3B82F6"
                className="animate-pulse"
                style={{ animationDelay: "0.6s" }}
              />
              <circle
                cx="330"
                cy="220"
                r="3"
                fill="#EF4444"
                className="animate-pulse"
                style={{ animationDelay: "0.9s" }}
              />
            </g>

            {/* Plus signs suggesting "add more" */}
            <g opacity="0.2" className="animate-pulse">
              <line
                x1="200"
                y1="230"
                x2="200"
                y2="250"
                stroke="#9CA3AF"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <line
                x1="190"
                y1="240"
                x2="210"
                y2="240"
                stroke="#9CA3AF"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>
        {title && (
          <h3 className="text-xl font-semibold text-foreground text-center">
            {title}
          </h3>
        )}
      </div>
      <div className="flex flex-col items-center gap-4 text-center max-w-lg">
        {description && (
          <p className="text-foreground leading-relaxed">{description}</p>
        )}
      </div>
      <div className="flex flex-col items-center gap-3">
        <PressableAnchorClient
          href="/publica"
          prefetch={false}
          className="group relative inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary-dark text-primary-foreground font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          variant="inline"
        >
          <svg
            className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="uppercase tracking-wide text-sm">{ctaLabel}</span>
        </PressableAnchorClient>
        <p className="text-sm text-foreground opacity-70">{helperText}</p>
      </div>
    </div>
  );
}

