"use client";

import { useState, useEffect } from "react";
import { CloudinaryUploadWidget } from "./CloudinaryUploadWidget";
import {
  getAvailableDurations,
  getAvailableGeoScopes,
  getPricingConfig,
} from "config/pricing";
import { GeoScopeType } from "config/pricing";
import {
  PromotionsConfigResponse,
  PricePreviewResponse,
  RestaurantPromotionFormProps,
  RestaurantFormData,
} from "types/api/restaurant";
import { Text } from "@components/ui/primitives";

export default function RestaurantPromotionForm({
  eventId,
  eventLocation,
  onSuccess,
  onError,
}: RestaurantPromotionFormProps) {
  // Suppress unused parameter warnings for optional callbacks
  void onSuccess;
  void onError;

  const [serverConfig, setServerConfig] =
    useState<PromotionsConfigResponse | null>(null);
  const [pricePreview, setPricePreview] = useState<PricePreviewResponse | null>(
    null,
  );
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  const [formData, setFormData] = useState<RestaurantFormData>({
    restaurantName: "",
    location: eventLocation || "",
    displayDurationDays: 3,
    geoScopeType: "town",
    geoScopeId: "",
    image: null,
    placeId: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load server config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("/api/promotions/config");
        if (response.ok) {
          const config = await response.json();
          setServerConfig(config);
          // Update form with server defaults
          setFormData((prev) => ({
            ...prev,
            displayDurationDays: config.durations[0] || 3,
            geoScopeType: config.geoScopes[0] || "town",
          }));
        }
      } catch (error) {
        console.error("Failed to load server config:", error);
      } finally {
        setIsLoadingConfig(false);
      }
    };
    loadConfig();
  }, []);

  // Fetch price preview when form changes
  useEffect(() => {
    if (
      !serverConfig ||
      !formData.displayDurationDays ||
      !formData.geoScopeType
    )
      return;

    const fetchPricePreview = async () => {
      setIsLoadingPrice(true);
      try {
        const response = await fetch("/api/promotions/price-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            durationDays: formData.displayDurationDays,
            geoScopeType: formData.geoScopeType,
          }),
        });
        if (response.ok) {
          const preview = await response.json();
          setPricePreview(preview);
        }
      } catch (error) {
        console.error("Failed to fetch price preview:", error);
      } finally {
        setIsLoadingPrice(false);
      }
    };

    fetchPricePreview();
  }, [formData.displayDurationDays, formData.geoScopeType, serverConfig]);

  // Fallback to local config if server config not available
  const durations = serverConfig?.durations || getAvailableDurations();
  const geoScopes = serverConfig?.geoScopes || getAvailableGeoScopes();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.restaurantName.trim()) {
      newErrors.restaurantName = "Restaurant name is required";
    }

    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
    }

    if (!formData.geoScopeId.trim()) {
      newErrors.geoScopeId = "Please select a geographic scope";
    }

    if (!formData.image) {
      newErrors.image = "Restaurant image is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Create restaurant lead
      const leadResponse = await fetch("/api/leads/restaurant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          eventId,
          _honey: "", // Honeypot field
        }),
      });

      if (!leadResponse.ok) {
        const errorData = await leadResponse.json();
        throw new Error(errorData.error || "Failed to create lead");
      }

      const { leadId } = await leadResponse.json();

      // Create Stripe checkout session
      const checkoutResponse = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId,
          eventId,
        }),
      });

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const { sessionUrl } = await checkoutResponse.json();

      // Redirect to Stripe Checkout
      window.location.href = sessionUrl;
    } catch (error) {
      console.error("Error submitting promotion:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      setErrors({ submit: errorMessage });
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (imageData: {
    public_id: string;
    secure_url: string;
  }) => {
    setFormData((prev) => ({ ...prev, image: imageData }));
    if (errors.image) {
      setErrors((prev) => ({ ...prev, image: "" }));
    }
  };

  const getPriceDisplay = () => {
    // Use server price preview if available, fallback to local config
    if (pricePreview) {
      const amount = (pricePreview.unitAmount / 100).toFixed(2);
      return `${amount} ${pricePreview.currency.toUpperCase()}`;
    }

    // Fallback to local pricing config
    const pricing = getPricingConfig(
      formData.displayDurationDays,
      formData.geoScopeType,
    );
    if (!pricing) return "Price not available";
    const amount = (pricing.unitAmount / 100).toFixed(2);
    return `${amount} ${pricing.currency.toUpperCase()}`;
  };

  if (isLoadingConfig) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="mb-component-md h-6 w-1/2 rounded bg-darkCorp/80"></div>
          <div className="space-y-4">
            <div className="h-4 w-3/4 rounded bg-darkCorp/80"></div>
            <div className="h-4 w-1/2 rounded bg-darkCorp/80"></div>
            <div className="h-4 w-2/3 rounded bg-darkCorp/80"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Text as="h3" variant="h3" className="mb-component-md">
          Promote Your Restaurant
        </Text>
        <Text
          as="p"
          variant="body-sm"
          color="muted"
          className="mb-component-lg"
        >
          Get your restaurant featured on this event page and reach more
          customers.
        </Text>
      </div>

      {/* Restaurant Name */}
      <div>
        <label htmlFor="restaurantName" className="mb-component-xs block">
          <Text variant="body-sm" className="font-medium">
            Restaurant Name *
          </Text>
        </label>
        <input
          type="text"
          id="restaurantName"
          value={formData.restaurantName}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, restaurantName: e.target.value }))
          }
          className="focus:border-transparent w-full rounded-md border border-bColor px-component-sm py-component-xs focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Enter your restaurant name"
        />
        {errors.restaurantName && (
          <Text as="p" variant="body-sm" className="mt-component-xs text-error">
            {errors.restaurantName}
          </Text>
        )}
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" className="mb-component-xs block">
          <Text variant="body-sm" className="font-medium">
            Location *
          </Text>
        </label>
        <input
          type="text"
          id="location"
          value={formData.location}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, location: e.target.value }))
          }
          className="focus:border-transparent w-full rounded-md border border-bColor px-component-sm py-component-xs focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Enter restaurant location"
        />
        {errors.location && (
          <Text as="p" variant="body-sm" className="mt-component-xs text-error">
            {errors.location}
          </Text>
        )}
      </div>

      {/* Duration */}
      <div>
        <label htmlFor="duration" className="mb-component-xs block">
          <Text variant="body-sm" className="font-medium">
            Promotion Duration *
          </Text>
        </label>
        <select
          id="duration"
          value={formData.displayDurationDays}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              displayDurationDays: parseInt(e.target.value),
            }))
          }
          className="focus:border-transparent w-full rounded-md border border-bColor px-component-sm py-component-xs focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {durations.map((duration) => (
            <option key={duration} value={duration}>
              {duration} day{duration > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Geo Scope Type */}
      <div>
        <label htmlFor="geoScopeType" className="mb-component-xs block">
          <Text variant="body-sm" className="font-medium">
            Geographic Scope *
          </Text>
        </label>
        <select
          id="geoScopeType"
          value={formData.geoScopeType}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              geoScopeType: e.target.value as GeoScopeType,
            }))
          }
          className="focus:border-transparent w-full rounded-md border border-bColor px-component-sm py-component-xs focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {geoScopes.map((scope) => (
            <option key={scope} value={scope}>
              {scope === "town" ? "Town/City" : "Region"}
            </option>
          ))}
        </select>
      </div>

      {/* Geo Scope ID */}
      <div>
        <label htmlFor="geoScopeId" className="mb-component-xs block">
          <Text variant="body-sm" className="font-medium">
            {formData.geoScopeType === "town" ? "Town/City" : "Region"} *
          </Text>
        </label>
        <input
          type="text"
          id="geoScopeId"
          value={formData.geoScopeId}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, geoScopeId: e.target.value }))
          }
          className="focus:border-transparent w-full rounded-md border border-bColor px-component-sm py-component-xs focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={`Enter ${
            formData.geoScopeType === "town" ? "town or city" : "region"
          } name`}
        />
        {errors.geoScopeId && (
          <Text as="p" variant="body-sm" className="mt-component-xs text-error">
            {errors.geoScopeId}
          </Text>
        )}
      </div>

      {/* Google Place ID (Optional) */}
      <div>
        <label htmlFor="placeId" className="mb-component-xs block">
          <Text variant="body-sm" className="font-medium">
            Google Place ID (Optional)
          </Text>
        </label>
        <input
          type="text"
          id="placeId"
          value={formData.placeId}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, placeId: e.target.value }))
          }
          className="focus:border-transparent w-full rounded-md border border-bColor px-component-sm py-component-xs focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Enter Google Place ID if available"
        />
        <Text as="p" variant="body" size="xs" color="muted" className="mt-component-xs">
          If your restaurant is on Google Maps, you can find the Place ID in the
          URL
        </Text>
      </div>

      {/* Image Upload */}
      <div>
        <Text variant="body-sm" className="mb-component-xs block font-medium">
          Restaurant Image *
        </Text>
        <CloudinaryUploadWidget
          onUpload={handleImageUpload}
          image={formData.image}
        />
        {errors.image && (
          <Text as="p" variant="body-sm" className="mt-component-xs text-error">
            {errors.image}
          </Text>
        )}
      </div>

      {/* Price Display */}
      <div className="rounded-md bg-whiteCorp p-component-md">
        <div className="flex items-center justify-between">
          <span className="font-medium">Total Price:</span>
          <Text variant="body-lg" className="font-bold text-primary">
            {isLoadingPrice ? "Loading..." : getPriceDisplay()}
          </Text>
        </div>
        <Text as="p" variant="body" size="xs" color="muted" className="mt-component-xs">
          Payment will be processed securely via Stripe
        </Text>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="text-white w-full rounded-md bg-primary px-component-md py-component-sm font-medium hover:bg-primarydark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Processing..." : "Proceed to Payment"}
      </button>

      {errors.submit && (
        <Text as="p" variant="body-sm" className="text-center text-error">
          {errors.submit}
        </Text>
      )}
    </form>
  );
}
