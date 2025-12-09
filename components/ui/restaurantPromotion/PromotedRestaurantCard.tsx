import { getTranslations } from "next-intl/server";
import ImageServer from "@components/ui/common/image/ImageServer";
import { PromotedRestaurantCardProps } from "types/api/restaurant";

export default async function PromotedRestaurantCard({
  promotion,
}: PromotedRestaurantCardProps) {
  const t = await getTranslations("Components.PromotedRestaurantCard");
  const formatExpiryDate = (expiresAt: string) => {
    const date = new Date(expiresAt);
    return date.toLocaleDateString("ca-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="w-full flex justify-center items-start gap-2 px-4">
      <svg
        className="w-5 h-5 mt-1 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
      <div className="stack w-11/12">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <span className="badge-primary">{t("badge")}</span>
        </div>

        <div className="border border-primary/20 rounded-lg p-4 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-start gap-4">
            {/* Restaurant Image */}
            <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden">
              <ImageServer
                image={promotion.image.secure_url}
                title={promotion.restaurantName}
                alt={promotion.restaurantName}
                className="w-16 h-16"
                context="card"
                cacheKey={promotion.image.public_id || promotion.id}
              />
            </div>

            {/* Restaurant Info */}
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-foreground-strong">
                {promotion.restaurantName}
              </h3>
              <p className="text-foreground/80 mt-1">{promotion.location}</p>

              {/* Expiry Info */}
              <div className="mt-2 text-sm text-foreground/70">
                <span className="font-medium">
                  {t("activeUntil", { date: formatExpiryDate(promotion.expiresAt) })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
