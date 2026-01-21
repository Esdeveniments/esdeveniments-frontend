import type { CalculateMetadataFunction } from "remotion";
import { Composition, Folder } from "remotion";
import type {
  CitySpotlightProps,
  WeeklyHighlightsProps,
} from "types/video";

import { CitySpotlight } from "./compositions/CitySpotlight";
import { WeeklyHighlights } from "./compositions/WeeklyHighlights";

const fps = 30;
const width = 1080;
const height = 1920;

const getDurationInFrames = (
  itemCount: number,
  introSeconds: number,
  itemSeconds: number,
  outroSeconds: number
): number => {
  const safeCount = Math.max(1, itemCount);
  const totalSeconds = introSeconds + safeCount * itemSeconds + outroSeconds;
  return Math.round(totalSeconds * fps);
};

const weeklyDefaults = {
  title: "Highlights de la setmana",
  subtitle: "Barcelona - 5 plans destacats",
  events: [
    {
      title: "Concert al parc",
      dateText: "Divendres, 20:30",
      locationText: "Parc de la Ciutadella",
      imageUrl: "",
    },
    {
      title: "Fira de disseny",
      dateText: "Dissabte, 11:00",
      locationText: "El Born",
      imageUrl: "",
    },
    {
      title: "Cinema a la fresca",
      dateText: "Diumenge, 21:30",
      locationText: "Poble-sec",
      imageUrl: "",
    },
  ],
  ctaText: "Descobreix mes a quefer.cat",
} satisfies WeeklyHighlightsProps;

const cityDefaults = {
  cityName: "Girona",
  dateRangeText: "Del 12 al 18 d'agost",
  events: [
    {
      title: "Ruta gastronomica",
      dateText: "Tot el cap de setmana",
      locationText: "Barri Vell",
      imageUrl: "",
    },
    {
      title: "Teatre a la placa",
      dateText: "Dissabte, 19:00",
      locationText: "Placa del Vi",
      imageUrl: "",
    },
    {
      title: "Concerts al riu",
      dateText: "Diumenge, 20:00",
      locationText: "Devesa",
      imageUrl: "",
    },
  ],
  ctaText: "Guarda la data i comparteix",
} satisfies CitySpotlightProps;

const weeklyMetadata: CalculateMetadataFunction<WeeklyHighlightsProps> = ({
  props,
}) => {
  return {
    durationInFrames: getDurationInFrames(props.events.length, 2, 2.5, 1),
  };
};

const cityMetadata: CalculateMetadataFunction<CitySpotlightProps> = ({
  props,
}) => {
  return {
    durationInFrames: getDurationInFrames(props.events.length, 2, 2.2, 1),
  };
};

export const RemotionRoot = () => {
  return (
    <Folder name="Marketing">
      <Composition
        id="WeeklyHighlights"
        component={WeeklyHighlights}
        durationInFrames={150}
        fps={fps}
        width={width}
        height={height}
        defaultProps={weeklyDefaults}
        calculateMetadata={weeklyMetadata}
      />
      <Composition
        id="CitySpotlight"
        component={CitySpotlight}
        durationInFrames={140}
        fps={fps}
        width={width}
        height={height}
        defaultProps={cityDefaults}
        calculateMetadata={cityMetadata}
      />
    </Folder>
  );
};
