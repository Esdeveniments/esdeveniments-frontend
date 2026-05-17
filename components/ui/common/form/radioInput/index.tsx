import { memo } from "react";
import { RadioInputProps } from "types/props";

const RadioInput: React.FC<RadioInputProps> = ({
  id,
  name,
  value,
  checkedValue,
  onChange,
  label,
  disabled,
}) => {
  return (
    <div className="flex justify-start items-center gap-2">
      <input
        id={id}
        name={name}
        type="checkbox"
        className="h-4 w-4 rounded-md text-primary border border-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        checked={typeof checkedValue === typeof value && checkedValue === value}
        onClick={() => onChange(value)}
        readOnly
        disabled={disabled}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  );
};

RadioInput.displayName = "RadioInput";

export default memo(RadioInput);
