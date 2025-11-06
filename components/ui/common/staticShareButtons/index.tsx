import Link from "next/link";
import { JSX } from "react";
import { siteUrl } from "@config/index";

export default function StaticShareButtons({
  slug,
  title = "",
  description = "",
  location = "",
  date = "",
  compact = true,
}: {
  slug: string;
  title?: string;
  description?: string;
  location?: string;
  date?: string;
  compact?: boolean;
}): JSX.Element {
  const eventUrl = `${siteUrl}/e/${slug}`;
  const encodedUrl = encodeURIComponent(eventUrl);

  // Create rich share text like the old native share button
  const shareText = [
    title,
    description && `\n\n${description}`,
    date && `\nData: ${date}`,
    location && `\nLloc: ${location}`,
    `\n\n${eventUrl}`,
  ]
    .filter(Boolean)
    .join("");

  const encodedShareText = encodeURIComponent(shareText);
  const encodedTitle = encodeURIComponent(title);

  // These URLs trigger native apps on mobile devices (true native sharing!)
  const shareUrls = {
    // Social apps (open native apps on mobile)
    whatsapp: `https://wa.me/?text=${encodedShareText}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,

    // Native device protocols (truly native!)
    sms: `sms:?body=${encodedShareText}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedShareText}`,
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* WhatsApp - Most popular for sharing */}
        <Link
          href={shareUrls.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Compartir a WhatsApp"
          className="flex items-center justify-center w-7 h-7 bg-background rounded-full hover:opacity-80 transition-opacity"
        >
          <svg className="w-4 h-4 fill-[#25D366]" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.89 3.488" />
          </svg>
        </Link>

        {/* SMS - Native device sharing */}
        <Link
          href={shareUrls.sms}
          aria-label="Compartir per SMS"
          className="flex items-center justify-center w-7 h-7 bg-background rounded-full hover:opacity-80 transition-opacity"
        >
          <svg className="w-4 h-4 fill-gray-600" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
          </svg>
        </Link>

        {/* Email - Native device sharing */}
        <Link
          href={shareUrls.email}
          aria-label="Compartir per email"
          className="flex items-center justify-center w-7 h-7 bg-background rounded-full hover:opacity-80 transition-opacity"
        >
          <svg className="w-4 h-4 fill-gray-600" viewBox="0 0 24 24">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
          </svg>
        </Link>

        {/* Telegram */}
        <Link
          href={shareUrls.telegram}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Compartir a Telegram"
          className="flex items-center justify-center w-7 h-7 bg-background rounded-full hover:opacity-80 transition-opacity"
        >
          <svg className="w-4 h-4 fill-[#0088cc]" viewBox="0 0 24 24">
            <path d="M18.384 22.779a1.19 1.19 0 0 0 1.107.145 1.16 1.16 0 0 0 .724-.84C21.084 18 23.192 7.663 23.983 3.948a.78.78 0 0 0-.26-.758.8.8 0 0 0-.797-.14C18.733 4.602 5.82 9.447.542 11.4a.827.827 0 0 0-.542.799c.012.354.25.661.593.764 2.367.708 5.474 1.693 5.474 1.693s1.452 4.385 2.209 6.615c.095.28.314.5.603.576a.866.866 0 0 0 .811-.207l3.096-2.923s3.572 2.619 5.598 4.062z" />
          </svg>
        </Link>
      </div>
    );
  }

  // Full share options for non-compact display
  return (
    <div className="grid grid-cols-2 gap-2 w-full">
      <Link
        href={shareUrls.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-2 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
      >
        <svg className="w-5 h-5 fill-[#25D366]" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.89 3.488" />
        </svg>
        <span className="text-sm">WhatsApp</span>
      </Link>

      <Link
        href={shareUrls.sms}
        className="flex items-center gap-2 p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
      >
        <svg className="w-5 h-5 fill-blue-600" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
        </svg>
        <span className="text-sm">SMS</span>
      </Link>

      <Link
        href={shareUrls.email}
        className="flex items-center gap-2 p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
      >
        <svg className="w-5 h-5 fill-foreground/80" viewBox="0 0 24 24">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
        </svg>
        <span className="text-sm">Email</span>
      </Link>

      <Link
        href={shareUrls.telegram}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
      >
        <svg className="w-5 h-5 fill-[#0088cc]" viewBox="0 0 24 24">
          <path d="M18.384 22.779a1.19 1.19 0 0 0 1.107.145 1.16 1.16 0 0 0 .724-.84C21.084 18 23.192 7.663 23.983 3.948a.78.78 0 0 0-.26-.758.8.8 0 0 0-.797-.14C18.733 4.602 5.82 9.447.542 11.4a.827.827 0 0 0-.542.799c.012.354.25.661.593.764 2.367.708 5.474 1.693 5.474 1.693s1.452 4.385 2.209 6.615c.095.28.314.5.603.576a.866.866 0 0 0 .811-.207l3.096-2.923s3.572 2.619 5.598 4.062z" />
        </svg>
        <span className="text-sm">Telegram</span>
      </Link>
    </div>
  );
}
