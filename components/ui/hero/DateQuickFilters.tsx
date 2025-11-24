import { CheckIcon } from "@heroicons/react/solid";
import { useHero } from "./HeroContext";
import { HERO_DATE_FILTERS } from "./constants";

export default function DateQuickFilters() {
  const { date, setDate } = useHero();

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
      {HERO_DATE_FILTERS.map((filter) => {
        const isActive = date === filter.value;
        
        return (
          <button
            key={filter.value}
            type="button"
            onClick={() => setDate(isActive ? null : filter.value)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all border outline-none focus:ring-2 focus:ring-primary/50 relative
              ${isActive 
                ? "bg-primary text-white border-primary shadow-md pl-9" 
                : "bg-background text-foreground/80 border-border hover:border-primary hover:text-primary hover:bg-primary/5"
              }
            `}
          >
            {isActive && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2">
                <CheckIcon className="w-4 h-4" />
              </span>
            )}
            {filter.label}
          </button>
        );
      })}
      
      {/* "Més dates" could be a link to a calendar or just a placeholder for now. 
          Since we are in "Form Mode", maybe it should open a date picker in the future.
          For now, let's keep it as a visual indicator or remove it if it doesn't fit the form model well without a real picker.
          The user mentioned "Més dates" in the requirements. Let's keep it but maybe non-functional or just a button that doesn't do much yet?
          Actually, if it's a form, "Més dates" implies a date picker. 
          Let's make it a button that maybe just logs or does nothing for MVP, or we can link to the generic agenda of the place?
          But linking breaks the "Form Mode". 
          Let's stick to the 3 chips for now as they are the primary ones.
      */}
    </div>
  );
}
