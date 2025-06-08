"use client";

import { memo, FC } from "react";
import NextImage from "next/image";
import Tickets from "public/static/images/tickets-color.svg";
import { Gradient, ImgDefaultProps } from "types/common";

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

const ImgDefault: FC<ImgDefaultProps> = ({ title }) => {
  // Use deterministic gradient selection based on title to avoid hydration issues
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
      {/* Top section - Event Title */}
      <div className="w-full flex justify-start items-start gap-2">
        <div className="w-full flex flex-col justify-start items-start gap-1 min-w-0">
          <h1
            className="font-bold uppercase font-roboto text-whiteCorp text-2xl leading-tight tracking-wide drop-shadow-md break-words"
            aria-label={title}
          >
            {title}
          </h1>
        </div>
      </div>

      {/* Bottom section - Tickets */}
      <div className="w-full pl-10 flex flex-col justify-center items-center">
        <div className="w-full h-28 flex justify-end items-end">
          <NextImage
            className="w-6/12 drop-shadow-md"
            src={Tickets}
            alt="Tickets.svg"
            width={200}
            height={200}
          />
        </div>
      </div>
    </div>
  );
};

export default memo(ImgDefault);
