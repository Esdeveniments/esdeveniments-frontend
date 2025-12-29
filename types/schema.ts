// Schema.org structured data interfaces for SEO and rich snippets

export interface VideoObject {
  "@type": "VideoObject";
  name: string;
  contentUrl: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
}

// Type for schema.org Place object used in structured data (more flexible than SchemaOrgEvent location)
export interface SchemaPlaceLocation {
  "@type": "Place";
  name: string | undefined;
  address?: {
    "@type": "PostalAddress";
    addressCountry: string;
    addressLocality?: string;
    addressRegion?: string;
  };
}

/**
 * Schema.org Event structured data for SEO and rich snippets.
 *
 * Note: The `keywords` property was intentionally removed in favor of `genre`.
 * Schema.org Event type recommends using `genre` for event categorization,
 * which aligns better with our category-based classification system.
 * Keywords remain available for NewsArticle schema where they are more appropriate.
 */
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
      /**
       * Region name (e.g., "Catalunya", "CT"). Defaults to "CT" (Catalonia) when region data is unavailable.
       * All events are in Catalonia, so this default ensures accurate schema.org data.
       */
      addressRegion: string;
    };
  };
  image: string[];
  description: string;
  inLanguage: string;
  /**
   * Event genres/categories. Replaces the removed `keywords` property.
   * More semantically appropriate for schema.org Event type.
   */
  genre?: string[];
  performer: {
    "@type": "PerformingGroup";
    name: string;
  };
  organizer: {
    "@type": "Organization";
    name: string;
    url: string;
  };
  offers?: {
    "@type": "Offer";
    price: number | string;
    priceCurrency: string;
    availability: string;
    url: string;
    validFrom: string;
    priceSpecification?: {
      "@type": "PriceSpecification";
      priceCurrency: string;
      description?: string;
    };
  };
  isAccessibleForFree?: boolean;
  duration?: string;
  video?: VideoObject;
}

export interface HowToStep {
  "@type": "HowToStep";
  text: string;
}

export interface HowTo {
  "@context": "https://schema.org";
  "@type": "HowTo";
  name: string;
  step: HowToStep[];
}
