"use client";
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
  testId,
}: FilterButtonProps): JSX.Element => {
  const router = useRouter();

  const handleRemove = (e: MouseEvent) => {
    e.stopPropagation();
    router.push(removeUrl);
    // Scroll to top for better UX
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      className="flex-shrink-0 bg-whiteCorp flex justify-center items-center nowrap min-w-max"
      data-testid={testId}
    >
      <div
        className={`flex justify-center items-center gap-1 px-2 py-1 ease-in-out duration-300 focus:outline-none font-medium whitespace-nowrap ${
          enabled
            ? "text-primary"
            : "border-whiteCorp text-blackCorp hover:bg-darkCorp hover:text-blackCorp"
        }`}
      >
        <span
          onClick={onOpenModal}
          className="text-center font-barlow uppercase text-[16px] cursor-pointer"
        >
          {text}
        </span>
        {enabled ? (
          <XIcon
            className="h-5 w-5 cursor-pointer ml-1 p-1 hover:bg-muted rounded"
            aria-hidden="true"
            onClick={handleRemove}
            data-testid={`${testId}-remove`}
          />
        ) : (
          <ChevronDownIcon
            className="h-5 w-5 cursor-pointer"
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
