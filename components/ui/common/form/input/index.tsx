import { InputProps } from "types/props";

export default function Input({
  id,
  title,
  subtitle,
  value,
  onChange,
  error,
  onBlur,
}: InputProps) {
  return (
    <div className="w-full">
      <label htmlFor={id} className="form-label">
        {title}
      </label>
      <div className="mt-2">
        {subtitle ? <p className="form-helper px-2">{subtitle}</p> : null}
        <input
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          type="text"
          name={id}
          id={id}
          className={`w-full rounded-xl border-border focus:border-foreground-strong text-base ${error ? "input-error" : ""
            }`}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {error && (
          <p id={`${id}-error`} className="helper-text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
