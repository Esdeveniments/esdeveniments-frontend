import { useState, useEffect } from "react";
import CreatableSelect from "react-select/creatable";
import { components, StylesConfig, GroupBase } from "react-select";
import useStore from "@store";
import type { Option } from "types/common";

interface SelectComponentProps {
  id: string;
  title: string;
  value?: Option | null;
  // eslint-disable-next-line no-unused-vars
  onChange: (value: Option | null) => void;
  options: Option[];
  isDisabled?: boolean;
  isValidNewOption?: boolean;
  isClearable?: boolean;
  placeholder?: string;
}

const borderColor = "#CCC !important";

const customStyles: StylesConfig<Option, false, GroupBase<Option>> = {
  container: (provided) => ({
    ...provided,
    borderColor: "#FFF !important",
    border: "0px",
  }),
  input: (provided) => ({
    ...provided,
    fontSize: "16px",
    padding: "0px 15px",
  }),
  control: (provided, state) => ({
    ...provided,
    borderColor: state.isFocused ? borderColor : borderColor,
    boxShadow: state.isFocused ? "#000 !important" : "#CCC !important",
    borderRadius: "8px",
  }),
  placeholder: (provided) => ({
    ...provided,
    fontSize: "16px",
    color: "#CCC",
    padding: "0px 15px",
  }),
  option: (provided, state) => ({
    ...provided,
    fontSize: "16px",
    background: state.isFocused ? "#FF0037" : "#FFF",
    color: state.isFocused ? "#FFF" : "#454545",
  }),
  singleValue: (provided) => ({
    ...provided,
    fontSize: "16px",
    color: "#454545",
  }),
  menu: (provided) => ({
    ...provided,
    border: "0px",
    borderRadius: "0px",
    boxShadow: "0px 10px 30px -25px #454545",
    background: "#FFF",
    padding: "0px 10px 30px",
  }),
};

const Input = components.Input;

export default function SelectComponent({
  id,
  title,
  value: initialValue = null,
  onChange,
  options = [],
  isDisabled = false,
  isValidNewOption = false,
  isClearable = false,
  placeholder = "una opció",
}: SelectComponentProps) {
  const { setState } = useStore((state) => ({
    setState: state.setState,
  }));
  const [selectedOption, setSelectedOption] = useState<Option | null>(
    initialValue
  );

  useEffect(() => {
    setSelectedOption(initialValue);
  }, [initialValue]);

  const handleChange = (value: Option | null) => {
    setSelectedOption(value);
    onChange(value);

    if (value === null) {
      setState("page", 1);
      setState("scrollPosition", 0);
    }
  };

  return (
    <div className="w-full">
      <label htmlFor={id} className="text-blackCorp font-bold">
        {title}
      </label>
      <div className="mt-2">
        <CreatableSelect<Option>
          id={id}
          instanceId={id}
          isSearchable
          isClearable={isClearable}
          formatCreateLabel={(inputValue: string) =>
            `Afegir nou lloc: "${inputValue}"`
          }
          placeholder={placeholder}
          defaultValue={selectedOption || initialValue}
          value={selectedOption || initialValue}
          onChange={handleChange}
          options={options}
          styles={customStyles}
          isDisabled={isDisabled}
          isValidNewOption={() => isValidNewOption}
          noOptionsMessage={() => "No s'ha trobat cap opció"}
          components={{
            Input,
          }}
        />
      </div>
    </div>
  );
}
