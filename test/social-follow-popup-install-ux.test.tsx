/**
 * Unit tests for SocialFollowPopup's install/push UX branches.
 *
 * The sibling social-follow-popup.test.tsx covers the shell (triggers,
 * cooldown, dismiss). This file mocks usePwaInstall + usePushNotifications
 * so each install state can be driven directly, and asserts the popup shows
 * the right thing per state — including the safety net we care about most:
 * the headline only sells the app when there's an actionable install path,
 * never to a user who can't install from here.
 *
 * Copy assertions use the Catalan strings because the next-intl test mock
 * always resolves against messages/ca.json.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import SocialFollowPopup, {
  PAGE_VIEW_KEY,
  DELAY_MS,
} from "@components/ui/common/social/SocialFollowPopup";
import type { PwaInstallState } from "types/pwa";

// ── Mocks ───────────────────────────────────────────────────────────
const { mockUsePwaInstall, mockUsePush, mockUseMobile } = vi.hoisted(() => ({
  mockUsePwaInstall: vi.fn(),
  mockUsePush: vi.fn(),
  mockUseMobile: vi.fn(() => false),
}));

vi.mock("@components/hooks/useCheckMobileScreen", () => ({
  default: mockUseMobile,
}));
vi.mock("@components/hooks/usePwaInstall", () => ({
  usePwaInstall: mockUsePwaInstall,
}));
vi.mock("@components/hooks/usePushNotifications", () => ({
  usePushNotifications: mockUsePush,
}));

// Real Catalan copy the next-intl mock will return.
const COPY = {
  socialHeadline: "Que els plans et trobin a tu",
  installHeadline: "Tingues els plans sempre a mà",
  shareBottomBar: "Toca Compartir a la barra inferior",
  shareMenu: "Obre el menú ⋯ i toca Comparteix",
};

const installButton = () =>
  screen.queryByRole("button", { name: /instal·la l'app/i });

// ── Defaults ────────────────────────────────────────────────────────
type InstallHook = {
  installState: PwaInstallState;
  isInstalled: boolean;
  canPromptInstall: boolean;
  showIosInstructions: boolean;
  showOpenInSafariHint: boolean;
  isIpad: boolean;
  iosShareLocation: "safari" | "menu";
  promptInstall: () => Promise<unknown>;
};

const notAvailableInstall: InstallHook = {
  installState: "not-available",
  isInstalled: false,
  canPromptInstall: false,
  showIosInstructions: false,
  showOpenInSafariHint: false,
  isIpad: false,
  iosShareLocation: "safari",
  promptInstall: vi.fn(),
};

function setInstall(overrides: Partial<InstallHook>) {
  mockUsePwaInstall.mockReturnValue({ ...notAvailableInstall, ...overrides });
}

function setPush(state: string) {
  mockUsePush.mockReturnValue({ state, subscribe: vi.fn() });
}

/** Render and trip the engagement timer so the popup is visible. */
function showPopup() {
  sessionStorage.setItem(PAGE_VIEW_KEY, "1");
  sessionStorage.setItem(PAGE_VIEW_KEY + "-path", "/other");
  render(<SocialFollowPopup pathname="/page-b" />);
  act(() => {
    vi.advanceTimersByTime(DELAY_MS + 100);
  });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  mockUseMobile.mockReturnValue(false);
  setInstall({});
  setPush("unsupported");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// =====================================================================
// Safety net: headline never promises install without a real path
// =====================================================================
describe("SocialFollowPopup – install copy gating", () => {
  it("shows the social headline and no install button when no install path exists", () => {
    setInstall({ installState: "not-available" });
    showPopup();

    expect(screen.getByText(COPY.socialHeadline)).toBeInTheDocument();
    expect(screen.queryByText(COPY.installHeadline)).not.toBeInTheDocument();
    expect(installButton()).not.toBeInTheDocument();
  });

  it("keeps the social headline (no install copy) when the app is already installed", () => {
    setInstall({ installState: "installed", isInstalled: true });
    showPopup();

    expect(screen.getByText(COPY.socialHeadline)).toBeInTheDocument();
    expect(screen.queryByText(COPY.installHeadline)).not.toBeInTheDocument();
    expect(installButton()).not.toBeInTheDocument();
  });

  it("switches to the install headline when a one-click prompt is available", () => {
    setInstall({ installState: "prompt", canPromptInstall: true });
    showPopup();

    expect(screen.getByText(COPY.installHeadline)).toBeInTheDocument();
    expect(screen.queryByText(COPY.socialHeadline)).not.toBeInTheDocument();
    expect(installButton()).toBeInTheDocument();
  });

  it("uses the install headline on iOS where steps are shown", () => {
    setInstall({ installState: "ios-manual", showIosInstructions: true });
    showPopup();

    expect(screen.getByText(COPY.installHeadline)).toBeInTheDocument();
  });
});

// =====================================================================
// InstallSection renders the right path per state
// =====================================================================
describe("SocialFollowPopup – install path rendering", () => {
  it("renders the one-click Install button and calls promptInstall on click", async () => {
    const promptInstall = vi.fn().mockResolvedValue("accepted");
    setInstall({ installState: "prompt", canPromptInstall: true, promptInstall });
    showPopup();

    const button = installButton();
    expect(button).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(button!);
    });
    expect(promptInstall).toHaveBeenCalledTimes(1);
  });

  it("shows the Safari bottom-bar share step on iPhone Safari", () => {
    setInstall({
      installState: "ios-manual",
      showIosInstructions: true,
      iosShareLocation: "safari",
    });
    showPopup();

    expect(screen.getByText(COPY.shareBottomBar)).toBeInTheDocument();
    expect(screen.queryByText(COPY.shareMenu)).not.toBeInTheDocument();
    expect(installButton()).not.toBeInTheDocument();
  });

  it("shows the ⋯ menu share step on third-party iOS browsers", () => {
    setInstall({
      installState: "ios-manual",
      showIosInstructions: true,
      iosShareLocation: "menu",
    });
    showPopup();

    expect(screen.getByText(COPY.shareMenu)).toBeInTheDocument();
    expect(screen.queryByText(COPY.shareBottomBar)).not.toBeInTheDocument();
  });

  it("shows the open-in-Safari hint (and no failing steps) inside an in-app webview", () => {
    setInstall({ installState: "ios-in-app", showOpenInSafariHint: true });
    showPopup();

    expect(screen.getByText(/obre aquesta pàgina a Safari/i)).toBeInTheDocument();
    expect(screen.queryByText(COPY.shareBottomBar)).not.toBeInTheDocument();
    expect(installButton()).not.toBeInTheDocument();
  });
});

// =====================================================================
// Push CTA appears as the second step once there's no pending install
// =====================================================================
describe("SocialFollowPopup – push CTA", () => {
  it("offers the push opt-in when installed and notifications are supported", () => {
    setInstall({ installState: "installed", isInstalled: true });
    setPush("unsubscribed");
    showPopup();

    expect(
      screen.getByRole("button", { name: /activa notificacions/i }),
    ).toBeInTheDocument();
  });

  it("hides the push CTA while a one-click install is still pending", () => {
    setInstall({ installState: "prompt", canPromptInstall: true });
    setPush("unsubscribed");
    showPopup();

    expect(
      screen.queryByRole("button", { name: /activa notificacions/i }),
    ).not.toBeInTheDocument();
  });
});
