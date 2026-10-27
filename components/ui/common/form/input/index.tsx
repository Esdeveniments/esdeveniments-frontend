import { InputProps } from "types/props";

export default function Input({
  id,
  title,
  subtitle,
  optionalLabel,
  value,
  onChange,
  error,
  onBlur,
  inputMode,
  autoComplete,
  maxLength,
}: InputProps) {
  const hintId = subtitle ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="w-full">
      <label htmlFor={id} className="form-label">
        {title}
        {optionalLabel ? (
          <span className="font-normal text-muted-foreground"> {optionalLabel}</span>
        ) : null}
      </label>
      {subtitle ? (
        <p id={hintId} className="form-helper mt-1">
          {subtitle}
        </p>
      ) : null}
      <input
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        type="text"
        name={id}
        id={id}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        className={`input input-lg mt-2 ${error ? "input-error" : ""}`}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={describedBy}
      />
      {error && (
        <p id={errorId} className="helper-text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
