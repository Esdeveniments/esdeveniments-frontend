import { describe, expect, it } from "vitest";
import {
  formPriceToPayload,
  parsePaidAmount,
  parseSchemaPrice,
  priceToFormFields,
} from "@utils/event-price";
import { eventDtoToFormData, formDataToBackendDTO } from "@utils/form-helpers";
import type { EventDetailResponseDTO } from "types/api/event";

const storedEvent = (price: string | null) =>
  ({
    id: "1",
    title: "Concert",
    description: "Desc",
    startDate: "2026-11-20",
    startTime: "20:00",
    endDate: "2026-11-20",
    endTime: "22:00",
    region: { id: 1, name: "Osona", slug: "osona" },
    city: { id: 2, name: "Vic", slug: "vic" },
    location: "Plaça Major",
    url: null,
    categories: [],
    price,
  }) as unknown as EventDetailResponseDTO;

const resave = (price: string | null) =>
  formDataToBackendDTO(eventDtoToFormData(storedEvent(price))).price;

describe("event price in the publish and edit forms", () => {
  it.each([
    ["free", "", "0"],
    ["paid", "10", "10"],
    ["paid", "12,50", "12.5"],
    ["paid", " 7.5 ", "7.5"],
    ["unknown", "", null],
  ] as const)("sends %s %j as %j", (priceType, priceAmount, expected) => {
    expect(formPriceToPayload({ priceType, priceAmount })).toBe(expected);
  });

  it.each(["", "0", "abc", "10 €", "12,505", "-3", "12345"])(
    "rejects %j as a paid amount",
    (amount) => {
      expect(parsePaidAmount(amount)).toBeNull();
      expect(formPriceToPayload({ priceType: "paid", priceAmount: amount })).toBeNull();
    },
  );

  it("reads stored prices back into the form", () => {
    expect(priceToFormFields("0")).toMatchObject({ priceType: "free" });
    expect(priceToFormFields("Gratuït")).toMatchObject({ priceType: "free" });
    expect(priceToFormFields("12.5")).toMatchObject({ priceType: "paid", priceAmount: "12.5" });
    expect(priceToFormFields("10 €")).toMatchObject({ priceType: "paid", priceAmount: "10" });
    expect(priceToFormFields(null)).toEqual({ priceType: "unknown", priceAmount: "", originalPrice: null });
  });

  // The backend clears the price on any update that doesn't send it.
  it.each([
    ["0", "0"],
    ["10", "10"],
    ["Gratuït", "0"],
    ["10 € taquilla · 5 € online", "10 € taquilla · 5 € online"],
    [null, null],
  ])("keeps a stored %j price when an event is edited without touching it", (stored, sent) => {
    expect(resave(stored)).toBe(sent);
  });

  it("drops the stored text once the user picks a price", () => {
    const form = eventDtoToFormData(storedEvent("10 € taquilla · 5 € online"));
    expect(formPriceToPayload({ ...form, priceType: "paid", priceAmount: "8", originalPrice: null })).toBe("8");
  });

  it("gives Google a number for the bare amounts the form sends", () => {
    expect(parseSchemaPrice("0")).toBe(0);
    expect(parseSchemaPrice("12.5")).toBe(12.5);
  });
});
