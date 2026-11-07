import { useTranslations } from "next-intl";
import Input from "@components/ui/common/form/input";
import { EVENT_PRICE_TYPES, type EventPriceType } from "types/event";
import type { EventPriceFieldProps } from "types/props";

const OPTION_LABEL_KEYS = {
  free: "priceFree",
  paid: "pricePaid",
  unknown: "priceUnknown",
} as const;

// Stacked radios with the amount revealed under "paid" (GOV.UK conditional reveal).
export default function PriceField({ form, error, onChange }: EventPriceFieldProps) {
  const t = useTranslations("Components.EventForm");
  const priceType = form.priceType ?? "unknown";

  const selectType = (type: EventPriceType) => {
    onChange("priceType", type);
    // Picking a price replaces stored text the form can't show.
    if (form.originalPrice) onChange("originalPrice", null);
  };

  return (
    <fieldset className="w-full">
      <legend className="form-label">
        {t("price")} <span className="font-normal text-muted-foreground">{t("optional")}</span>
      </legend>
      {form.originalPrice ? (
        <p className="form-helper mt-1">{t("priceCurrent", { price: form.originalPrice })}</p>
      ) : null}
      <div className="mt-2 flex flex-col">
        {EVENT_PRICE_TYPES.map((type) => (
          <div key={type}>
            <label className="flex items-center gap-2 min-h-button body-normal text-foreground cursor-pointer">
              <input
                type="radio"
                name="price-type"
                value={type}
                checked={priceType === type}
                onChange={() => selectType(type)}
              />
              {t(OPTION_LABEL_KEYS[type])}
            </label>
            {type === "paid" && priceType === "paid" ? (
              <div className="ml-2 mb-2 border-l-4 border-border pl-4">
                <Input
                  id="price-amount"
                  title={t("priceAmount")}
                  subtitle={t("priceAmountHint")}
                  value={form.priceAmount ?? ""}
                  inputMode="decimal"
                  autoComplete="off"
                  maxLength={7}
                  // Keep digits and separators only, so a pasted "€" or space is dropped.
                  onChange={(e) => onChange("priceAmount", e.target.value.replace(/[^\d.,]/g, ""))}
                  error={error}
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </fieldset>
  );
}
