import { EventImageProps } from "types/event";
import { FC } from "react";
import NextImage from "next/image";
import ImageDefault from "components/ui/imgDefault";
import { getOptimalImageQuality } from "@utils/image-quality";

const EventImage: FC<EventImageProps> = ({ image, title }) => {
  if (!image) {
    return (
      <div className="w-full aspect-[16/9] sm:aspect-[21/9] overflow-hidden rounded-card">
        <ImageDefault title={title} />
      </div>
    );
  }

  const imageQuality = getOptimalImageQuality({
    isPriority: true,
    isExternal: true,
  });

  // Avoid using unvalidated external URLs directly in href to prevent execution of javascript:, data:, and other dangerous schemes.
  const sanitizedHref = (() => {
    if (!image || typeof image !== 'string') return undefined;
    const trimmed = image.trim();
    // Allow only http(s) absolute URLs, protocol-relative (//), or root-relative paths (/)
    // This rejects javascript:, data:, vbscript:, and other non-http schemes.
    return /^(https?:\/\/|\/\/|\/)\S*$/i.test(trimmed) ? trimmed : undefined;
  })();

  // Compute a safe href for the anchor preventing dangerous schemes like javascript:, data:, vbscript:
  const sanitizedHref = (() => {
    if (!image || typeof image !== 'string') return undefined;
    const trimmed = image.trim();
    // Allow only http(s) absolute URLs, protocol-relative (//), or root-relative paths (/)
    // This rejects javascript:, data:, and other non-http schemes.
    return /^(https?:\/\/|\/\/|\/)\S*$/i.test(trimmed) ? trimmed : undefined;
  })();

  // Compute a safe href for the anchor preventing dangerous schemes like javascript:, data:, vbscript:
  const sanitizedHref = (() => {
    if (!image || typeof image !== 'string') return undefined;
    const trimmed = image.trim();
    // Allow only http(s) absolute URLs, protocol-relative (//), or root-relative paths (/)
    // This rejects javascript:, data:, and other non-http schemes.
    return /^(https?:\/\/|\/\/|\/)\S*$/i.test(trimmed) ? trimmed : undefined;
  })();

  // Sanitize hrefs coming from external/event-controlled sources to prevent execution of javascript: or data: URIs
  const sanitizeHref = (url?: string): string | undefined => {
    if (!url || typeof url !== "string") return undefined;
    const trimmed = url.trim();
    // Allow only http(s) absolute URLs, protocol-relative, or root-relative paths. Reject javascript:, data:, vbscript:, and other schemes.
    if (/^(https?:\/\/|\/\/|\/)\S*$/i.test(trimmed)) return trimmed;
    return undefined;
  };

  // Sanitize hrefs coming from external/event-controlled sources to prevent execution of javascript: or data: URIs
  const sanitizeHref = (url?: string): string | undefined => {
    if (!url || typeof url !== "string") return undefined;
    const trimmed = url.trim();
    // Allow absolute http(s), protocol-relative (//), or root-relative paths (/)
    if (/^(https?:\/\/|\/\/|\/)\S*/i.test(trimmed)) return trimmed;
    return undefined;
  };

  // Sanitize hrefs coming from external/event-controlled sources to prevent JS/data URIs
  const sanitizeHref = (url?: string) => {
    if (!url || typeof url !== "string") return undefined;
    const trimmed = url.trim();
    // Allow absolute http(s), protocol-relative (//), or root-relative paths (/)
    if (/^(https?:\/\/|\/\/|\/)i.test(trimmed)) return trimmed;
    return undefined;
  };

  return (
    <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] overflow-hidden rounded-card bg-muted">
      <a
        href={sanitizeHref(image)}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full h-full cursor-pointer hover:opacity-95 transition-opacity"
        aria-label={`Veure imatge completa de ${title}`}
      >
        <NextImage
          src={image}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1200px"
          className="object-cover"
          priority={true}
          quality={imageQuality}
          loading="eager"
          fetchPriority="high"
        />
      </a>
    </div>
  );
};

export default EventImage;
