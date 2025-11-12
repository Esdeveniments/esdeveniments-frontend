/**
 * Server component for rendering JSON-LD structured data.
 *
 * Follows React best practices for dangerouslySetInnerHTML:
 * - Creates sanitized data object separately (not inline)
 * - Escapes </script> and < to prevent XSS
 * - Data comes from server-side API responses, not user input
 *
 * @see https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html
 */
export default function JsonLdServer({
  id,
  data,
}: {
  id?: string;
  data?: unknown;
}) {
  // No headers() needed - relaxed CSP allows inline scripts for ISR/PPR compatibility

  // Generate JSON string from data
  const json = JSON.stringify(data ?? {});

  // Escape </script> and < to prevent XSS in JSON-LD scripts
  // Order matters: escape </script> first, then any remaining < characters
  // This is safe because data comes from server-side API responses, not user input
  // Escape </script>, U+2028, U+2029 and < to prevent XSS in JSON-LD scripts
  // Order matters: escape </script> first, then any remaining line/paragraph separators, then any remaining < characters
  const sanitizedHtml = json
    .replace(/<\/script>/gi, "\\u003c/script\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
    .replace(/</g, "\\u003c");

  // Create sanitized data object separately (React best practice)
  // Per React docs: "You should only create the object with the __html key close to where HTML is generated"
  const sanitizedData = { __html: sanitizedHtml };

  return (
    <script
      id={id}
      type="application/ld+json"
      suppressHydrationWarning={true}
      dangerouslySetInnerHTML={sanitizedData}
    />
  );
}
