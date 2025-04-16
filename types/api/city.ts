export interface CitySummaryResponseDTO {
  id: number;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  postalCode: string;
  rssFeed: string;
  enabled: boolean;
}
