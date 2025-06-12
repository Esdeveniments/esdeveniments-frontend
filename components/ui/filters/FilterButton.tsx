import { JSX, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import XIcon from "@heroicons/react/solid/XIcon";
import ChevronDownIcon from "@heroicons/react/solid/ChevronDownIcon";
import { FilterButtonProps } from "types/props";

const FilterButton = ({
  text,
  enabled,
  removeUrl,
  onOpenModal,
}: FilterButtonProps): JSX.Element => {
  const router = useRouter();

  const handleRemove = (e: MouseEvent) => {
    e.stopPropagation();
    router.push(removeUrl);
    // Scroll to top for better UX
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="w-full bg-whiteCorp flex justify-center items-center nowrap">
      <div
        className={`w-full flex justify-center items-center gap-1 px-1 ease-in-out duration-300 focus:outline-none font-medium ${
          enabled
            ? "text-primary"
            : "border-whiteCorp text-blackCorp hover:bg-darkCorp hover:text-blackCorp"
        }`}
      >
        <span
          onClick={onOpenModal}
          className="w-full text-center font-barlow uppercase text-[16px]"
        >
          {text}
        </span>
        {enabled ? (
          <XIcon
            className="h-5 w-5"
            aria-hidden="true"
            onClick={handleRemove}
          />
        ) : (
          <ChevronDownIcon
            className="h-5 w-5"
            aria-hidden="true"
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
              onOpenModal();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default FilterButton;
