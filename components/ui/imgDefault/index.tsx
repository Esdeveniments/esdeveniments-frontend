import { useState, useEffect, memo, useCallback, FC } from "react";
import LocationMarkerIcon from "@heroicons/react/outline/LocationMarkerIcon";
import NextImage from "next/image";
import Tickets from "public/static/images/tickets-color.svg";

let lastRandomIndex: number | null = null;

interface Gradient {
  gradient: string;
  color: string;
}

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

interface ImgDefaultProps {
  date: string;
  location: string;
  subLocation: string;
}

const ImgDefault: FC<ImgDefaultProps> = ({ date, location, subLocation }) => {
  const [background, setBackground] = useState<Gradient>(gradients[0]);

  const getRandomBackground = useCallback((): Gradient => {
    let randomIndex: number;

    do {
      randomIndex = Math.floor(Math.random() * gradients.length);
    } while (randomIndex === lastRandomIndex);

    lastRandomIndex = randomIndex;

    return gradients[randomIndex];
  }, []);

  useEffect(() => {
    setBackground(getRandomBackground());
  }, [getRandomBackground]);

  return (
    <div
      className="w-full flex flex-col justify-center items-start gap-4 p-10"
      style={{
        backgroundImage: background.gradient,
        backgroundSize: "cover",
        backgroundPosition: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <div className="w-full flex justify-start items-start gap-2">
        <LocationMarkerIcon className="text-whiteCorp w-9 h-9 drop-shadow-md" />
        <div className="w-full flex flex-col justify-start items-start gap-1">
          <h1
            className="font-bold uppercase font-roboto text-whiteCorp text-[32px] tracking-wide drop-shadow-md"
            aria-label={location}
          >
            {location}
          </h1>
          <h2 className="text-whiteCorp font-normal">{subLocation}</h2>
        </div>
      </div>
      <div className="w-1/2 ml-10 border-t-2 border-whiteCorp drop-shadow-md"></div>
      <div className={`w-full pl-10 flex flex-col justify-center items-center`}>
        <h3
          className="w-full text-whiteCorp font-roboto font-normal tracking-wider drop-shadow-md"
          aria-label={date}
        >
          {date}
        </h3>
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
