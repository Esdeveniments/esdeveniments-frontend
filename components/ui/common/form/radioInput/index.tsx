import { memo } from "react";

type RadioInputValue = string | number;

interface RadioInputProps {
  id: string;
  name: string;
  value: RadioInputValue;
  checkedValue: RadioInputValue;
  onChange: (value: RadioInputValue) => void;
  label: string;
  disabled?: boolean;
}

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
    <div className="flex justify-center items-center gap-2">
      <input
        id={id}
        name={name}
        type="checkbox"
        className="h-4 w-4 rounded-md text-primary border border-primary focus:outline-none focus:ring-0 focus:ring-whiteCorp"
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
