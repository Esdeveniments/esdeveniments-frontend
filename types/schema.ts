// Schema.org structured data interfaces for SEO and rich snippets

export interface VideoObject {
  "@type": "VideoObject";
  name: string;
  contentUrl: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
}

export interface SchemaOrgEvent {
  "@context": "https://schema.org";
  "@type": "Event";
  "@id": string;
  name: string | undefined;
  url: string;
  startDate: string;
  endDate: string;
  eventAttendanceMode: string;
  eventStatus: string;
  location: {
    "@type": "Place";
    name: string | undefined;
    geo?: {
      "@type": "GeoCoordinates";
      latitude: number;
      longitude: number;
    };
    address: {
      "@type": "PostalAddress";
      streetAddress: string | undefined;
      addressLocality: string | undefined;
      postalCode: string | undefined;
      addressCountry: string;
      addressRegion: string;
    };
  };
  image: string[];
  description: string;
  inLanguage: string;
  keywords?: string;
  genre?: string[];
  performer: {
    "@type": "PerformingGroup";
    name: string | undefined;
  };
  organizer: {
    "@type": "Organization";
    name: string | undefined;
    url: string;
  };
  offers: {
    "@type": "Offer";
    price: number | string;
    priceCurrency: string;
    availability: string;
    url: string;
    validFrom: string;
    priceSpecification?: {
      "@type": "PriceSpecification";
      priceCurrency: string;
    };
  };
  isAccessibleForFree: boolean;
  duration?: string;
  video?: VideoObject;
}
