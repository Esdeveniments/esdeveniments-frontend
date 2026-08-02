import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const trackClickMock = vi.fn();
const trackedCtaMock = vi.fn(() => ({
  ref: vi.fn(),
  trackClick: trackClickMock,
}));

let authState: { user: { username: string } | null; status: string } = {
  user: null,
  status: "unauthenticated",
};

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@i18n/routing", () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

vi.mock("@components/hooks/useTrackedCta", () => ({
  default: (...args: unknown[]) => trackedCtaMock(...(args as [])),
}));

import ProfileOwnerActions from "@components/ui/profile/ProfileOwnerActions";
import ProfileClaimCta from "@components/ui/profile/ProfileClaimCta";

describe("ProfileOwnerActions", () => {
  beforeEach(() => {
    trackClickMock.mockReset();
    trackedCtaMock.mockClear();
    authState = { user: null, status: "unauthenticated" };
  });

  it("renders nothing for a visitor who isn't the profile owner", () => {
    authState = { user: { username: "someoneElse" }, status: "authenticated" };
    render(<ProfileOwnerActions username="alex91" />);
    expect(screen.queryByText("editProfile")).toBeNull();
  });

  it("registers the profile_edit_cta id and tracks a click for the owner", () => {
    authState = { user: { username: "alex91" }, status: "authenticated" };
    render(<ProfileOwnerActions username="alex91" />);

    expect(trackedCtaMock).toHaveBeenCalledWith("profile_edit_cta");
    fireEvent.click(screen.getByText("editProfile"));
    expect(trackClickMock).toHaveBeenCalledTimes(1);
  });
});

describe("ProfileClaimCta", () => {
  beforeEach(() => {
    trackClickMock.mockReset();
    trackedCtaMock.mockClear();
    authState = { user: null, status: "unauthenticated" };
  });

  it("renders nothing once authenticated", () => {
    authState = { user: { username: "alex91" }, status: "authenticated" };
    render(<ProfileClaimCta username="alex91" />);
    expect(screen.queryByText("claimLogin")).toBeNull();
  });

  it("registers the profile_claim_cta id, tracks a click, and carries the auth-gate action for a visitor", () => {
    render(<ProfileClaimCta username="alex91" />);

    expect(trackedCtaMock).toHaveBeenCalledWith("profile_claim_cta");
    const link = screen.getByText("claimLogin");
    expect(link).toHaveAttribute("data-analytics-action", "profile_claim_login");
    fireEvent.click(link);
    expect(trackClickMock).toHaveBeenCalledTimes(1);
  });
});
