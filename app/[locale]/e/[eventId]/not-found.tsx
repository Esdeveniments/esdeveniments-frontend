import NoEventFound from "@components/ui/common/noEventFound";

/**
 * Route-specific not-found page for event routes
 * This ensures that when notFound() is called from app/e/[eventId]/page.tsx,
 * users see the event-specific "Event not found" UI instead of the generic 404 page.
 * 
 * Next.js automatically returns HTTP 404 status for this page, fixing the Soft 404 SEO issue.
 */
export default function EventNotFound() {
  return <NoEventFound />;
}

