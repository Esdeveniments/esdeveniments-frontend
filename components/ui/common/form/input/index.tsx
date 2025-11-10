import { InputProps } from "types/props";

export default function Input({
  id,
  title,
  subtitle,
  value,
  onChange,
}: InputProps) {
  return (
    <div className="w-full">
      <label htmlFor={id} className="text-foreground-strong font-bold">
        {title}
      </label>
      <div className="mt-2">
        {subtitle ? <p className="text-[12px] p-2">{subtitle}</p> : null}
        <input
          value={value}
          onChange={onChange}
          type="text"
          name={id}
          id={id}
          className="w-full rounded-xl border-border focus:border-foreground-strong text-base"
        />
      </div>
    </div>
  );
}
