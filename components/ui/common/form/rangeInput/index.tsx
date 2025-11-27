import { FC } from "react";
import XIcon from "@heroicons/react/outline/XIcon";
import { RangeInputProps } from "types/props";

const RangeInput: FC<RangeInputProps> = ({
  id,
  min,
  max,
  value,
  onChange,
  label,
  disabled,
  onMouseDown,
  onMouseUp,
  onTouchStart,
  onTouchEnd,
  testId,
  onClear,
}) => {
  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }

    onChange({ target: { value: "" } });
  };

  const showClear = Boolean(value) && !disabled;

  return (
    <div
      id={id}
      data-testid={testId}
      className="stack w-full"
      onMouseDownCapture={onMouseDown}
      onMouseUpCapture={onMouseUp}
      onTouchStartCapture={onTouchStart}
      onTouchEndCapture={onTouchEnd}
    >
      <div className="w-full flex justify-start items-center gap-2">
        <label htmlFor={id}>{label}</label>
        <div className="flex justify-start items-center text-primary gap-2 font-semibold font-barlow text-lg pb-1">
          {value} km
        </div>
        {showClear && (
          <XIcon
            className="w-5 h-5 text-primary cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label="Clear"
            onClick={handleClear}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClear();
              }
            }}
          />
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
};

RangeInput.displayName = "RangeInput";

export default RangeInput;
