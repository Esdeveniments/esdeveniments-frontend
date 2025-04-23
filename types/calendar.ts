export interface CalendarParams {
  title: string;
  description: string;
  location: string;
  startDate: string | Date;
  endDate: string | Date;
  canonical: string;
}

export interface CalendarUrls {
  google: string;
  outlook: string;
  ical: string;
}
