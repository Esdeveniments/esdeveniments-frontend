import NextImage from "next/image";
import { ImgDefaultProps, Gradient } from "types/common";

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
      className="w-full h-full flex flex-col justify-between items-start p-4"
      style={{
        backgroundImage: background.gradient,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "260px",
      }}
    >
      {/* Top section - Event Info */}
      <div className="w-full flex justify-start items-start gap-2">
        <div className="w-full flex flex-col justify-start items-start gap-2 min-w-0">
          {/* Location Icon and City */}
          {location && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-background/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-background"></div>
              </div>
              <h2 className="font-bold uppercase text-background text-lg drop-shadow-md">
                {location}
              </h2>
            </div>
          )}

          {/* Region */}
          {region && (
            <p className="text-background/90 text-sm drop-shadow-md ml-6">
              {region}
            </p>
          )}

          <div className="w-full h-px bg-background/30 my-2"></div>

          {/* Event Title (non-heading to avoid outline pollution) */}
          <p className="font-bold uppercase font-roboto text-background text-xl leading-tight tracking-wide drop-shadow-md break-words">
            {title}
          </p>

          {/* Date */}
          {date && (
            <p className="text-background/90 text-sm drop-shadow-md">{date}</p>
          )}
        </div>
      </div>

      {/* Bottom section - Tickets */}
      <div className="w-full flex justify-end items-end">
        <div className="w-20 h-12">
          <NextImage
            className="w-full h-full drop-shadow-md"
            src="/static/images/tickets-color.svg"
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
