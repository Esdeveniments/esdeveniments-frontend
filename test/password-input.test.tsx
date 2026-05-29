import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    key === "passwordShow" ? "Show password" : "Hide password",
}));

vi.mock("@heroicons/react/24/outline", () => ({
  EyeIcon: () => <svg data-testid="eye-icon" />,
  EyeSlashIcon: () => <svg data-testid="eye-slash-icon" />,
}));

import PasswordInput from "@components/ui/auth/PasswordInput";

function renderField() {
  const onChange = vi.fn();
  const utils = render(
    <PasswordInput
      id="pw"
      value="secret123"
      onChange={onChange}
      autoComplete="current-password"
    />
  );
  return { ...utils, onChange };
}

describe("PasswordInput", () => {
  it("hides the password by default (type=password, eye icon)", () => {
    renderField();
    expect(screen.getByDisplayValue("secret123")).toHaveAttribute(
      "type",
      "password"
    );
    expect(screen.getByTestId("eye-icon")).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /show password/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("reveals the password when the toggle is clicked", () => {
    renderField();
    fireEvent.click(screen.getByRole("button", { name: /show password/i }));
    expect(screen.getByDisplayValue("secret123")).toHaveAttribute(
      "type",
      "text"
    );
    expect(screen.getByTestId("eye-slash-icon")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /hide password/i })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("toggles back to hidden on a second click", () => {
    renderField();
    const toggle = screen.getByRole("button", { name: /show password/i });
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: /hide password/i }));
    expect(screen.getByDisplayValue("secret123")).toHaveAttribute(
      "type",
      "password"
    );
  });

  it("forwards onChange and a11y props", () => {
    const onChange = vi.fn();
    render(
      <PasswordInput
        id="pw"
        value=""
        onChange={onChange}
        ariaInvalid
        ariaDescribedby="pw-error"
      />
    );
    const input = document.getElementById("pw") as HTMLInputElement;
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("pw-error");
    fireEvent.change(input, { target: { value: "x" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("uses the toggle button (type=button) so it doesn't submit the form", () => {
    renderField();
    const toggle = screen.getByRole("button", { name: /show password/i });
    expect(toggle).toHaveAttribute("type", "button");
  });
});
