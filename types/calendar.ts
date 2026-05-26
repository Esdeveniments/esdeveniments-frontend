export interface CalendarParams {
  title: string;
  description: string;
  location: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  canonical: string;
}

export interface CalendarUrls {
  google: string;
  outlook: string;
  ical: string;
}

export interface CalendarLabels {
  moreInfoHtml: string;
  moreInfoText: string;
  dateRange: string;
  dateSingle: string;
}
