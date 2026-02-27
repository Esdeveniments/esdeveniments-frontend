"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@components/hooks/useAuth";
import { Link } from "@i18n/routing";
import type { ProfileEditFormProps } from "types/props";

export default function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const t = useTranslations("Components.Profile");
  const { user } = useAuth();

  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio || "");
  const [website, setWebsite] = useState(profile.website || "");
  const [saved, setSaved] = useState(false);

  const isOwner = user?.profileSlug === profile.slug;

  if (!isOwner) {
    return (
      <div className="card-bordered card-body text-center stack">
        <p className="body-normal text-foreground/80">
          {t("editNotOwner")}
        </p>
        <Link
          href={`/perfil/${profile.slug}` as `/${string}`}
          className="text-primary font-semibold hover:underline"
        >
          {t("backToProfile")}
        </Link>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="card-bordered card-body stack"
      data-testid="profile-edit-form"
    >
      <h1 className="heading-2 text-foreground">
        {t("editPageTitle", { name: profile.name })}
      </h1>

      {saved && (
        <div
          className="bg-primary/10 text-primary body-small rounded-lg px-4 py-3"
          role="status"
          aria-live="polite"
        >
          {t("editSaved")}
        </div>
      )}

      <label className="label" htmlFor="profile-name">
        {t("editName")}
      </label>
      <input
        id="profile-name"
        type="text"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-input"
      />

      <label className="label" htmlFor="profile-bio">
        {t("editBio")}
      </label>
      <textarea
        id="profile-bio"
        rows={4}
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        className="rounded-input resize-y"
      />

      <label className="label" htmlFor="profile-website">
        {t("editWebsite")}
      </label>
      <input
        id="profile-website"
        type="url"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="rounded-input"
        placeholder="https://"
      />

      <button type="submit" className="btn-primary w-full">
        {t("editSave")}
      </button>

      <Link
        href={`/perfil/${profile.slug}` as `/${string}`}
        className="body-small text-foreground/60 text-center hover:underline"
      >
        {t("backToProfile")}
      </Link>
    </form>
  );
}
