"use client";

import { useMemo, useState } from "react";
import Select from "@components/ui/common/form/select";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
import { Option } from "types/common";
import { useRouter } from "next/navigation";

type PlaceClientProps = {
  currentParams: Record<string, string | number | undefined>;
  regionSlugByName: Record<string, string>;
};

export default function PlaceSelector({ currentParams, regionSlugByName }: PlaceClientProps) {
  const router = useRouter();
  const { regionsWithCities } = useGetRegionsWithCities();
  const [region, setRegion] = useState<Option | null>(null);
  const [city, setCity] = useState<Option | null>(null);

  const regionOptions: Option[] = useMemo(
    () =>
      (regionsWithCities || []).map((r) => ({ label: r.name, value: String(r.id) })),
    [regionsWithCities]
  );

  const cityOptions: Option[] = useMemo(() => {
    if (!regionsWithCities || !region) return [];
    const r = regionsWithCities.find((rr) => String(rr.id) === (region?.value as string));
    return r ? r.cities.map((c) => ({ label: c.label, value: String(c.id) })) : [];
  }, [regionsWithCities, region]);

  const navigateWithPlace = (placeSlug: string) => {
    const sp = new URLSearchParams();
    Object.entries(currentParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null) sp.set(k, String(v));
    });
    sp.set("place", placeSlug);
    router.push(`/promociona?${sp.toString()}`);
  };

  const onRegionChange = (opt: Option | null) => {
    setRegion(opt);
    setCity(null);
    if (opt) {
      const slug = regionSlugByName[opt.label] || "catalunya";
      navigateWithPlace(slug);
    }
  };

  const onCityChange = (opt: Option | null) => {
    setCity(opt);
    if (!opt) return;
    // We don't have city slugs from this hook, so fallback to label sanitize is not ideal; rely on backend later.
    // For MVP, use opt.label lowercased without spaces; backend contract will provide real slugs later.
    const citySlug = opt.label.toLowerCase().replace(/\s+/g, "-");
    navigateWithPlace(citySlug);
  };

  return (
    <div className="space-y-3">
      <Select
        id="promo-region"
        title="Regió"
        value={region}
        onChange={onRegionChange}
        options={regionOptions}
        isClearable
        placeholder="Tria una regió"
      />
      <Select
        id="promo-city"
        title="Ciutat"
        value={city}
        onChange={onCityChange}
        options={cityOptions}
        isClearable
        placeholder="Tria una ciutat"
      />
    </div>
  );
}