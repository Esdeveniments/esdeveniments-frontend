import NextImage from "next/image";
import Tickets from "public/static/images/tickets-color.svg";
import { ImgDefaultProps, Gradient } from "types/common";
import { Text } from "@components/ui/primitives";

const gradients: Gradient[] = [
  {
    gradient: "linear-gradient(120deg, #ff0037, #ff440d, #FF921A)",
    color: "#ff440d",
  },
  {
    gradient: "linear-gradient(120deg, #FF0033, #FF8340, #F8FFC6)",
    color: "#FF8340",
  },
  {
    gradient: "linear-gradient(120deg, #FF0033, #FF1D00, #FFA785)",
    color: "#FF1D00",
  },
  {
    gradient: "linear-gradient(120deg, #F06E0C, #EBAB07, #EFE900)",
    color: "#EBAB07",
  },
  {
    gradient: "linear-gradient(120deg, #03001e, #7303c0, #ec38bc)",
    color: "#7303c0",
  },
  { gradient: "linear-gradient(120deg, #0575e6, #00f260)", color: "#0575e6" },
  {
    gradient: "linear-gradient(120deg, #2948ff, #396afc, #4B88FA)",
    color: "#396afc",
  },
];

// Simple hash function to get deterministic gradient selection
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

const ImgDefaultCore: React.FC<ImgDefaultProps> = ({
  title,
  location,
  region,
  date,
}) => {
  // Use deterministic gradient selection based on title
  const gradientIndex = hashString(title || "default") % gradients.length;
  const background = gradients[gradientIndex];

  return (
    <div
      className="flex h-full w-full flex-col items-start justify-between p-component-md"
      style={{
        backgroundImage: background.gradient,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "260px",
      }}
    >
      {/* Top section - Event Info */}
      <div className="flex w-full items-start justify-start gap-component-xs">
        <div className="flex w-full min-w-0 flex-col items-start justify-start gap-component-xs">
          {/* Location Icon and City */}
          {location && (
            <div className="flex items-center gap-component-xs">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-whiteCorp/20">
                <div className="h-2 w-2 rounded-full bg-whiteCorp"></div>
              </div>
              <Text as="h2" variant="h2" className="uppercase drop-shadow-md">
                {location}
              </Text>
            </div>
          )}

          {/* Region */}
          {region && (
            <Text variant="body-sm" className="ml-component-lg drop-shadow-md">
              {region}
            </Text>
          )}

          <div className="my-component-xs h-px w-full bg-whiteCorp/30"></div>

          {/* Event Title (non-heading to avoid outline pollution) */}
          <Text
            variant="h1"
            className="break-words font-roboto uppercase leading-tight tracking-wide drop-shadow-md"
          >
            {title}
          </Text>

          {/* Date */}
          {date && (
            <Text variant="body-sm" className="drop-shadow-md">
              {date}
            </Text>
          )}
        </div>
      </div>

      {/* Bottom section - Tickets */}
      <div className="flex w-full items-end justify-end">
        <div className="h-12 w-20">
          <NextImage
            className="h-full w-full drop-shadow-md"
            src={Tickets}
            alt="Tickets.svg"
            width={80}
            height={48}
          />
        </div>
      </div>
    </div>
  );
};

export default ImgDefaultCore;
