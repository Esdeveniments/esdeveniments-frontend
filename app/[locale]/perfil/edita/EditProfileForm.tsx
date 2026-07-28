"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@i18n/routing";
import { useAuth } from "@components/hooks/useAuth";
import { validateUsername, isPlaceholderUsername } from "@utils/username-validation";
import type { EditProfileFormProps } from "types/props";
import EditProfileAvatar from "./EditProfileAvatar";

const DISPLAY_NAME_MAX = 80;
const BIO_MAX = 500;

export default function EditProfileForm({ redirectTo }: EditProfileFormProps) {
  const t = useTranslations("App.EditProfile");
  const { user, refetchUser } = useAuth();
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

  const validate = (): boolean => {
    let ok = true;

    const usernameResult = validateUsername(username);
    if (!usernameResult.ok) {
      setUsernameError(t(`usernameErrors.${usernameResult.code}`));
      ok = false;
    } else {
      setUsernameError(null);
    }

    const trimmedDisplayName = displayName.trim();
    if (!trimmedDisplayName) {
      setDisplayNameError(t("errors.displayNameRequired"));
      ok = false;
    } else if (trimmedDisplayName.length > DISPLAY_NAME_MAX) {
      setDisplayNameError(t("errors.displayNameTooLong"));
      ok = false;
    } else {
      setDisplayNameError(null);
    }

    if (bio.trim().length > BIO_MAX) {
      setBioError(t("errors.bioTooLong"));
      ok = false;
    } else {
      setBioError(null);
    }

    return ok;
  };

  const onSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setSubmitError(null);
    setSuccess(false);

    if (!validate()) return;

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
        return;
      }
      if (response.status === 401 || response.status === 403) {
        setSubmitError(t("errors.sessionExpired"));
        return;
      }
      if (!response.ok) {
        setSubmitError(t("errors.generic"));
        return;
      }

      await refetchUser();
      if (redirectTo) {
        router.push(redirectTo);
        return;
      }
      setSuccess(true);
    } catch {
      setSubmitError(t("errors.generic"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container flex flex-col justify-center pt-6 pb-14">
      <div className="w-full max-w-md mx-auto flex flex-col gap-6 px-2 lg:px-0">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="heading-1 text-foreground-strong">
            {t(isOnboarding ? "onboardingHeading" : "heading")}
          </h1>
          <p className="body-normal text-foreground/80">
            {t(isOnboarding ? "onboardingSubheading" : "subheading")}
          </p>
        </div>

        {submitError && (
          <div
            className="w-full px-4 py-3 bg-error/10 border border-error rounded-lg"
            role="alert"
          >
            <p className="text-sm font-medium text-error">{submitError}</p>
          </div>
        )}
        {success && (
          <div
            className="w-full px-4 py-3 bg-success-light border border-success-border rounded-lg"
            role="status"
          >
            <p className="text-sm font-medium text-success-dark">
              {t("success")}
            </p>
          </div>
        )}

        <EditProfileAvatar />

        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <div className="w-full">
            <label htmlFor="username" className="form-label">
              {t("fields.username")}
            </label>
            {showUsernameHint && (
              <p id="username-hint" className="helper-text">
                {t("usernameHint")}
              </p>
            )}
            {usernameLocked && (
              <p id="username-locked-hint" className="helper-text">
                {t("usernameLockedHint")}
              </p>
            )}
            <div className="mt-2">
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={validate}
                readOnly={usernameLocked}
                className={`w-full rounded-xl border-border focus:border-foreground-strong text-base ${usernameLocked ? "input-readonly" : ""} ${usernameError ? "input-error" : ""}`}
                aria-invalid={usernameError ? "true" : "false"}
                aria-describedby={
                  [
                    showUsernameHint && "username-hint",
                    usernameLocked && "username-locked-hint",
                    usernameError && "username-error",
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
              />
              {usernameError && (
                <p id="username-error" className="helper-text-error" role="alert">
                  {usernameError}
                </p>
              )}
            </div>
          </div>

          <div className="w-full">
            <label htmlFor="displayName" className="form-label">
              {t("fields.displayName")}
            </label>
            <div className="mt-2">
              <input
                id="displayName"
                name="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={validate}
                className={`w-full rounded-xl border-border focus:border-foreground-strong text-base ${displayNameError ? "input-error" : ""}`}
                aria-invalid={displayNameError ? "true" : "false"}
                aria-describedby={
                  displayNameError ? "displayName-error" : undefined
                }
              />
              {displayNameError && (
                <p
                  id="displayName-error"
                  className="helper-text-error"
                  role="alert"
                >
                  {displayNameError}
                </p>
              )}
            </div>
          </div>

          <div className="w-full">
            <label htmlFor="bio" className="form-label">
              {t("fields.bio")}
            </label>
            <div className="mt-2">
              <textarea
                id="bio"
                name="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                onBlur={validate}
                maxLength={BIO_MAX}
                rows={4}
                className={`w-full p-3 border rounded-xl border-border focus:border-foreground-strong resize-vertical ${bioError ? "input-error" : ""}`}
                aria-invalid={bioError ? "true" : "false"}
                aria-describedby={bioError ? "bio-error" : undefined}
              />
              {bioError && (
                <p id="bio-error" className="helper-text-error" role="alert">
                  {bioError}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? t("savingLabel") : t("submitLabel")}
          </button>
        </form>
      </div>
    </div>
  );
}
