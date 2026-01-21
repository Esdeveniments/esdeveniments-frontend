export type VideoEventItem = {
  title: string;
  dateText: string;
  locationText: string;
  imageUrl: string;
};

export type WeeklyHighlightsProps = {
  title: string;
  subtitle?: string;
  events: VideoEventItem[];
  ctaText?: string;
  ctaUrl?: string;
};

export type CitySpotlightProps = {
  cityName: string;
  dateRangeText: string;
  events: VideoEventItem[];
  ctaText?: string;
  ctaUrl?: string;
};

export type WeeklyHighlightsIntroProps = {
  title: string;
  subtitle?: string;
  opacity: number;
  translateY: number;
};

export type WeeklyHighlightsItemProps = {
  event: VideoEventItem;
  index: number;
  total: number;
  opacity: number;
  translateY: number;
};

export type WeeklyHighlightsOutroProps = {
  ctaText: string;
  opacity: number;
};

export type CitySpotlightIntroProps = {
  cityName: string;
  dateRangeText: string;
  opacity: number;
  translateY: number;
};

export type CitySpotlightItemProps = {
  event: VideoEventItem;
  opacity: number;
  translateY: number;
};

export type CitySpotlightOutroProps = {
  ctaText: string;
  opacity: number;
};
