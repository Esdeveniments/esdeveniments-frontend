import { ImageServer, Text } from "@components/ui/primitives";
import { PromotedRestaurantCardProps } from "types/api/restaurant";

export default function PromotedRestaurantCard({
  promotion,
}: PromotedRestaurantCardProps) {
  const formatExpiryDate = (expiresAt: string) => {
    const date = new Date(expiresAt);
    return date.toLocaleDateString("ca-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="flex w-full items-start justify-center gap-component-xs px-component-md">
      <svg
        className="mt-component-xs h-5 w-5 text-primary"
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
      <div className="flex w-11/12 flex-col gap-component-md">
        <div className="flex items-center gap-component-xs">
          <Text as="h2" variant="h2">
            Restaurant promocionat
          </Text>
          <Text
            variant="caption"
            className="text-white rounded-full bg-primary px-component-xs py-component-xs"
          >
            Patrocinat
          </Text>
        </div>

        <div className="rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-component-md">
          <div className="flex items-start gap-component-md">
            {/* Restaurant Image */}
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
              <ImageServer
                image={promotion.image.secure_url}
                title={promotion.restaurantName}
                alt={promotion.restaurantName}
                className="h-16 w-16"
                context="card"
              />
            </div>

            {/* Restaurant Info */}
            <div className="flex-1">
              <Text as="h3" variant="h3" className="text-blackCorp">
                {promotion.restaurantName}
              </Text>
              <Text variant="body" className="mt-component-xs text-blackCorp/80">
                {promotion.location}
              </Text>

              {/* Expiry Info */}
              <div className="mt-component-xs">
                <Text variant="body-sm" className="text-blackCorp/60">
                  Promoció activa fins al{" "}
                  <Text
                    as="span"
                    variant="body-sm"
                    className="font-medium text-blackCorp/60"
                  >
                    {formatExpiryDate(promotion.expiresAt)}
                  </Text>
                </Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
