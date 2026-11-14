"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@i18n/routing";
import { useAuth } from "@components/hooks/useAuth";
import { validateUsername, isPlaceholderUsername } from "@utils/username-validation";
import { sendGoogleEvent, ensureGtag } from "@utils/analytics";
import Input from "@components/ui/common/form/input";
import Button from "@components/ui/common/button";
import { siteUrl } from "@config/index";
import type { EditProfileFormProps } from "types/props";
import EditProfileAvatar from "./EditProfileAvatar";

const DISPLAY_NAME_MAX = 80;
const BIO_MAX = 500;

function getSiteHost(): string {
  try {
    return new URL(siteUrl).host;
  } catch {
    return "esdeveniments.cat";
  }
}

const siteHost = getSiteHost();

export default function EditProfileForm({ redirectTo }: EditProfileFormProps) {
  const t = useTranslations("App.EditProfile");
  // Reuses the navbar's logout copy; the navbar avatar only links here.
  const tAuth = useTranslations("Components.Navbar.auth");
  const { user, refetchUser, logout } = useAuth();
  const router = useRouter();
  // Matches the check in NavbarClient: `=== false`, not falsy, so a
  // transient backend enrichment blip (profileCompleted undefined) doesn't
  // wrongly show onboarding copy to an already-completed profile.
  const isOnboarding = user?.profileCompleted === false;

  const [username, setUsername] = useState(user?.username ?? "");
  // Only claim the field holds a placeholder while it actually still does.
  const showUsernameHint = isOnboarding && isPlaceholderUsername(username);
  // Usernames feed indexed public URLs (/perfil/{username}), so the backend
  // only allows setting a real one once. Checked against the saved value
  // (not the live `username` state) since that's what determines whether
  // the field should even be editable in the first place.
  const usernameLocked = !isPlaceholderUsername(user?.username ?? "");
  const [displayName, setDisplayName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [displayNameError, setDisplayNameError] = useState<string | null>(
    null,
  );
  const [bioError, setBioError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const hasTrackedViewRef = useRef(false);
  useEffect(() => {
    if (hasTrackedViewRef.current) return;
    ensureGtag();
    sendGoogleEvent("edit_profile_page_view", { is_onboarding: isOnboarding });
    hasTrackedViewRef.current = true;
  }, [isOnboarding]);

  // Leaving a field checks only that field, so a new account's empty display
  // name isn't flagged before the user reaches it. A field showing an error
  // re-checks as the user types, so the error is gone before they click Save:
  // clearing it on blur would shift the button and swallow that click.
  const checkUsername = (value = username): boolean => {
    const result = validateUsername(value);
    setUsernameError(result.ok ? null : t(`usernameErrors.${result.code}`));
    return result.ok;
  };

  const checkDisplayName = (value = displayName): boolean => {
    const trimmed = value.trim();
    const error = !trimmed
      ? t("errors.displayNameRequired")
      : trimmed.length > DISPLAY_NAME_MAX
        ? t("errors.displayNameTooLong")
        : null;
    setDisplayNameError(error);
    return !error;
  };

  const checkBio = (value = bio): boolean => {
    const ok = value.trim().length <= BIO_MAX;
    setBioError(ok ? null : t("errors.bioTooLong"));
    return ok;
  };

  // Every check runs (no short-circuit), so all errors show at once.
  const validate = (): boolean =>
    [checkUsername(), checkDisplayName(), checkBio()].every(Boolean);

  const onSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setSubmitError(null);
    setSuccess(false);

    if (!validate()) return;

    sendGoogleEvent("edit_profile_submit_attempt", { is_onboarding: isOnboarding });
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/users/me/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          displayName: displayName.trim(),
          bio: bio.trim() || null,
        }),
      });

      if (response.status === 409) {
        setUsernameError(t("errors.usernameTaken"));
        sendGoogleEvent("edit_profile_submit_blocked", { reason: "username_taken" });
        return;
      }
      if (response.status === 401 || response.status === 403) {
        setSubmitError(t("errors.sessionExpired"));
        sendGoogleEvent("edit_profile_submit_blocked", { reason: "session_expired" });
        return;
      }
      if (!response.ok) {
        setSubmitError(t("errors.generic"));
        sendGoogleEvent("edit_profile_submit_error", { reason: "generic" });
        return;
      }

      await refetchUser();
      sendGoogleEvent("edit_profile_submit_success", {
        is_onboarding: isOnboarding,
        redirected: !!redirectTo,
      });
      if (redirectTo) {
        router.push(redirectTo);
        return;
      }
      setSuccess(true);
    } catch {
      setSubmitError(t("errors.generic"));
      sendGoogleEvent("edit_profile_submit_error", { reason: "generic" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const profileHref = usernameLocked
    ? `/perfil/${encodeURIComponent(user?.username ?? "")}`
    : null;
  const usernameDescribedBy =
    [
      showUsernameHint && "username-hint",
      "username-url",
      usernameError && "username-error",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <div className="container py-section-y">
      <div className="w-full max-w-xl flex flex-col gap-section-y">
        <header className="flex flex-col gap-element-gap-sm">
          <h1 className="heading-1">
            {t(isOnboarding ? "onboardingHeading" : "heading")}
          </h1>
          <p className="body-normal text-muted-foreground">
            {t(isOnboarding ? "onboardingSubheading" : "subheading")}
          </p>
          {profileHref && (
            <Link
              href={profileHref}
              className="self-start body-small font-semibold text-foreground-strong underline underline-offset-4 hover:no-underline focus-ring"
              data-testid="edit-profile-view-link"
            >
              {t("viewProfile")}
            </Link>
          )}
        </header>

        {submitError && (
          <div
            className="rounded-input border border-error bg-error/10 p-card-padding-sm"
            role="alert"
          >
            <p className="body-small font-semibold text-error-dark">{submitError}</p>
          </div>
        )}
        {success && (
          <div
            className="flex flex-wrap items-center justify-between gap-element-gap rounded-input border border-success-border bg-success-light p-card-padding-sm"
            role="status"
          >
            <p className="body-small font-semibold text-success-dark">{t("success")}</p>
            {profileHref && (
              <Link
                href={profileHref}
                className="body-small font-semibold text-foreground-strong underline underline-offset-4 hover:no-underline focus-ring"
              >
                {t("viewProfile")}
              </Link>
            )}
          </div>
        )}

        <EditProfileAvatar />

        <form className="flex flex-col gap-section-y-sm" onSubmit={onSubmit} noValidate>
          <Input
            id="displayName"
            title={t("fields.displayName")}
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (displayNameError) checkDisplayName(e.target.value);
            }}
            onBlur={() => checkDisplayName()}
            error={displayNameError ?? undefined}
            autoComplete="name"
            maxLength={DISPLAY_NAME_MAX}
          />

          <div className="w-full">
            <label htmlFor="username" className="form-label">
              {t("fields.username")}
            </label>
            {showUsernameHint && (
              <p id="username-hint" className="form-helper mt-1">
                {t("usernameHint")}
              </p>
            )}
            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (usernameError) checkUsername(e.target.value);
              }}
              onBlur={() => checkUsername()}
              readOnly={usernameLocked}
              autoCapitalize="none"
              autoComplete="username"
              spellCheck={false}
              className={`input input-lg mt-2 ${usernameLocked ? "input-readonly" : ""} ${usernameError ? "input-error" : ""}`}
              aria-invalid={usernameError ? "true" : "false"}
              aria-describedby={usernameDescribedBy}
            />
            {usernameError && (
              <p id="username-error" className="helper-text-error" role="alert">
                {usernameError}
              </p>
            )}
            <p id="username-url" className="helper-text break-words">
              {usernameLocked
                ? t("usernameLockedHint")
                : t("usernameUrl", { url: `${siteHost}/perfil/${username.trim() || "…"}` })}
            </p>
          </div>

          <div className="w-full">
            <div className="flex items-baseline justify-between gap-element-gap">
              <label htmlFor="bio" className="form-label">
                {t("fields.bio")}
              </label>
              <span id="bio-count" className="body-small text-muted-foreground">
                {t("bioCount", { count: bio.length, max: BIO_MAX })}
              </span>
            </div>
            <textarea
              id="bio"
              name="bio"
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                if (bioError) checkBio(e.target.value);
              }}
              onBlur={() => checkBio()}
              maxLength={BIO_MAX}
              rows={4}
              placeholder={t("bioPlaceholder")}
              className={`input h-auto py-3 mt-2 resize-y ${bioError ? "input-error" : ""}`}
              aria-invalid={bioError ? "true" : "false"}
              aria-describedby={bioError ? "bio-count bio-error" : "bio-count"}
            />
            {bioError && (
              <p id="bio-error" className="helper-text-error" role="alert">
                {bioError}
              </p>
            )}
          </div>

          <Button type="submit" variant="primary" className="w-full sm:w-auto sm:self-start" disabled={isSubmitting}>
            {isSubmitting ? t("savingLabel") : t("submitLabel")}
          </Button>
        </form>

        {/* Low on the page, like account actions on Luma and Meetup: the
            navbar has no menu, so this and nothing else logs a user out. */}
        <div className="border-t border-border pt-section-y-sm">
          <Button
            type="button"
            variant="outline"
            onClick={() => logout()}
            data-analytics-action="edit_profile_logout_cta"
          >
            {tAuth("logout")}
          </Button>
        </div>
      </div>
    </div>
  );
}
