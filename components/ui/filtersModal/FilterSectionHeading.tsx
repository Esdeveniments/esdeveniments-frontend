import type { FilterSectionHeadingProps } from "types/props";

// The modal focuses this heading (out of the tab order) and scrolls it to the
// top when the chip for its filter opened the modal.
const FilterSectionHeading = ({
  section,
  initialSection,
  initialSectionRef,
  className,
  children,
}: FilterSectionHeadingProps) => {
  const isInitial = section === initialSection;
  return (
    <p
      ref={isInitial ? initialSectionRef : undefined}
      tabIndex={isInitial ? -1 : undefined}
      className={`font-semibold font-barlow uppercase scroll-mt-4 focus:outline-none ${className}`}
    >
      {children}
    </p>
  );
};

export default FilterSectionHeading;
