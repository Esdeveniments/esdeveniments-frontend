"use client";
import { JSX, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import XIcon from "@heroicons/react/solid/XIcon";
import ChevronDownIcon from "@heroicons/react/solid/ChevronDownIcon";
import { Text } from "@components/ui/primitives";
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
      className="nowrap flex min-w-max flex-shrink-0 items-center justify-center bg-whiteCorp"
      data-testid={testId}
    >
      <div
        className={`flex items-center justify-center gap-xs whitespace-nowrap px-component-xs py-component-xs font-medium duration-300 ease-in-out focus:outline-none ${
          enabled
            ? "text-primary"
            : "border-whiteCorp text-blackCorp hover:bg-darkCorp hover:text-blackCorp"
        }`}
      >
        <Text
          as="span"
          variant="body-sm"
          onClick={onOpenModal}
          className="cursor-pointer text-center font-barlow text-[16px] uppercase"
        >
          {text}
        </Text>
        {enabled ? (
          <XIcon
            className="ml-xs h-5 w-5 cursor-pointer rounded p-component-xs hover:bg-darkCorp"
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
