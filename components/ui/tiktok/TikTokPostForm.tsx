/**
 * TikTok post form — satisfies all 5 UX audit requirements:
 * 1. Creator info display + limits
 * 2. Privacy dropdown (from API) + interaction toggles
 * 3. Commercial content disclosure
 * 4. Music Usage Confirmation + policy links + consent
 * 5. Video preview + editable title + post button
 */
"use client";

import {
  useState,
  useEffect,
  useRef,
  type FormEvent,
  type ChangeEvent,
} from "react";
import type {
  TikTokPrivacyLevel,
  TikTokPostFormProps,
} from "types/tiktok";
import { TIKTOK_PRIVACY_LABELS } from "types/tiktok";

export default function TikTokPostForm({
  creatorInfo,
  accessToken,
  onPublished,
  onError,
}: TikTokPostFormProps) {
  const [title, setTitle] = useState("");
  const [privacyLevel, setPrivacyLevel] = useState<TikTokPrivacyLevel | "">("");
  // UX 2c: Interactions must be unchecked by default
  const [allowComment, setAllowComment] = useState(false);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);
  // UX 3: Commercial content — master toggle OFF by default
  const [commercialToggle, setCommercialToggle] = useState(false);
  const [brandOrganic, setBrandOrganic] = useState(false);
  const [brandContent, setBrandContent] = useState(false);
  const [isAigc, setIsAigc] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDurationError, setVideoDurationError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const prevUrlRef = useRef<string | null>(null);

  // Reset sub-options when commercial toggle turned off
  useEffect(() => {
    if (!commercialToggle) {
      setBrandOrganic(false);
      setBrandContent(false);
    }
  }, [commercialToggle]);

  // UX 3b: Clear SELF_ONLY privacy when branded content is selected
  useEffect(() => {
    if (brandContent && privacyLevel === "SELF_ONLY") {
      setPrivacyLevel("");
    }
  }, [brandContent, privacyLevel]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, []);

  function handleVideoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    const url = URL.createObjectURL(file);
    prevUrlRef.current = url;
    setVideoFile(file);
    setVideoPreviewUrl(url);
    setVideoDurationError(null);
  }

  // UX 3: Derived state
  const commercialNeedsSelection =
    commercialToggle && !brandOrganic && !brandContent;
  const privacyOptions = brandContent
    ? creatorInfo.privacy_level_options.filter((o) => o !== "SELF_ONLY")
    : creatorInfo.privacy_level_options;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!videoFile || !privacyLevel || !consent) return;
    setIsSubmitting(true);

    try {
      // Step 1: Init publish
      const initRes = await fetch("/api/tiktok/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: accessToken,
          post_info: {
            title,
            privacy_level: privacyLevel,
            disable_duet: !allowDuet,
            disable_stitch: !allowStitch,
            disable_comment: !allowComment,
            brand_content_toggle: brandContent,
            brand_organic_toggle: brandOrganic,
            is_aigc: isAigc,
            video_cover_timestamp_ms: 1000,
          },
          source_info: {
            source: "FILE_UPLOAD",
            video_size: videoFile.size,
            chunk_size: videoFile.size,
            total_chunk_count: 1,
          },
        }),
      });
      const initData = (await initRes.json()) as {
        data?: { publish_id?: string; upload_url?: string };
        error?: { code?: string; message?: string };
      };
      if (initData.error?.code !== "ok") {
        throw new Error(initData.error?.message || "Publish init failed");
      }
      const uploadUrl = initData.data?.upload_url;
      if (!uploadUrl) throw new Error("No upload URL received");

      // Step 2: Upload video directly to TikTok's upload URL
      // (bypasses Lambda 6MB payload limit by going browser → TikTok)
      const totalSize = videoFile.size;
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": videoFile.type || "video/mp4",
          "Content-Length": String(totalSize),
          "Content-Range": `bytes 0-${totalSize - 1}/${totalSize}`,
        },
        body: videoFile,
      });
      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => "Unknown error");
        throw new Error(`Upload failed: ${uploadRes.status} ${errText}`);
      }
      onPublished({ publish_id: initData.data?.publish_id || "" });
    } catch (e) {
      onError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = Boolean(
    videoFile &&
      privacyLevel &&
      consent &&
      !isSubmitting &&
      !videoDurationError &&
      !commercialNeedsSelection,
  );

  return (
    <form onSubmit={handleSubmit} className="stack">
      {/* UX 1: Creator Info */}
      <div className="card-bordered">
        <div className="card-body flex-start gap-element-gap">
          {creatorInfo.creator_avatar_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={creatorInfo.creator_avatar_url}
              alt={creatorInfo.creator_nickname}
              className="rounded-badge"
              width={48}
              height={48}
            />
          )}
          <div>
            <p className="body-normal font-medium">{creatorInfo.creator_nickname}</p>
            <p className="body-small text-foreground/60">
              @{creatorInfo.creator_username}
            </p>
          </div>
        </div>
        <p className="body-small text-foreground/60 px-card-padding pb-card-padding">
          Max video duration: {creatorInfo.max_video_post_duration_sec}s
        </p>
      </div>

      {/* UX 5: Video + Title */}
      <Section title="Video">
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          onChange={handleVideoChange}
          className="body-small"
        />
        {videoPreviewUrl && (
          <video
            src={videoPreviewUrl}
            controls
            className="w-full rounded-card"
            style={{ maxHeight: 300 }}
            onLoadedMetadata={(e) => {
              const dur = e.currentTarget.duration;
              if (dur > creatorInfo.max_video_post_duration_sec) {
                setVideoDurationError(
                  `Video is ${Math.round(dur)}s but max allowed is ${creatorInfo.max_video_post_duration_sec}s`,
                );
              }
            }}
          />
        )}
        {videoDurationError && (
          <p className="body-small" style={{ color: "var(--destructive, #dc2626)" }}>
            {videoDurationError}
          </p>
        )}
        <label className="stack" style={{ gap: 4 }}>
          <span className="label">Caption</span>
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 2200))}
            placeholder="Add a caption..."
            rows={3}
            maxLength={2200}
            className="bg-background border border-border rounded-input py-2 px-3 body-normal text-foreground w-full"
          />
          <span className="body-small text-foreground/50">{title.length}/2200</span>
        </label>
      </Section>

      {/* UX 2: Privacy & Interactions */}
      <Section title="Privacy & Interactions">
        <label className="stack" style={{ gap: 4 }}>
          <span className="label">Who can view this video</span>
          <select
            value={privacyLevel}
            onChange={(e) => setPrivacyLevel(e.target.value as TikTokPrivacyLevel)}
            required
            className="bg-background border border-border rounded-input py-2 px-3 body-normal text-foreground w-full"
          >
            <option value="" disabled>Select privacy level</option>
            {privacyOptions.map((opt) => (
              <option key={opt} value={opt}>
                {TIKTOK_PRIVACY_LABELS[opt] ?? opt}
              </option>
            ))}
          </select>
        </label>
        {brandContent && privacyLevel === "" && (
          <p className="body-small text-foreground/60">
            Branded content visibility cannot be set to private.
          </p>
        )}
        <Checkbox
          checked={allowComment}
          onChange={setAllowComment}
          disabled={creatorInfo.comment_disabled}
          label="Allow comments"
        />
        <Checkbox
          checked={allowDuet}
          onChange={setAllowDuet}
          disabled={creatorInfo.duet_disabled}
          label="Allow Duet"
        />
        <Checkbox
          checked={allowStitch}
          onChange={setAllowStitch}
          disabled={creatorInfo.stitch_disabled}
          label="Allow Stitch"
        />
      </Section>

      {/* UX 3: Commercial Content Disclosure */}
      <Section title="Commercial Content Disclosure">
        <p className="body-small text-foreground/70">
          Indicate if this video promotes a business or brand.
        </p>
        <Checkbox
          checked={commercialToggle}
          onChange={setCommercialToggle}
          label="This video contains commercial content"
        />
        {commercialToggle && (
          <div className="stack" style={{ paddingLeft: 24 }}>
            <Checkbox
              checked={brandOrganic}
              onChange={setBrandOrganic}
              label="Your brand — promotes your own business"
            />
            {brandOrganic && !brandContent && (
              <p className="body-small text-foreground/70" style={{ paddingLeft: 24 }}>
                Your video will be labeled as &quot;Promotional content&quot;
              </p>
            )}
            <Checkbox
              checked={brandContent}
              onChange={setBrandContent}
              disabled={privacyLevel === "SELF_ONLY"}
              label={`Branded content — paid partnership${
                privacyLevel === "SELF_ONLY"
                  ? " (not available with private visibility)"
                  : ""
              }`}
            />
            {brandContent && (
              <p className="body-small text-foreground/70" style={{ paddingLeft: 24 }}>
                Your video will be labeled as &quot;Paid partnership&quot;
              </p>
            )}
            {commercialNeedsSelection && (
              <p
                className="body-small"
                style={{ color: "var(--destructive, #dc2626)" }}
              >
                You need to indicate if your content promotes yourself, a third
                party, or both.
              </p>
            )}
          </div>
        )}
        <Checkbox checked={isAigc} onChange={setIsAigc} label="AI-generated content" />
      </Section>

      {/* UX 4: Consent + Policy Links — dynamic per commercial content */}
      <Section title="Consent">
        <p className="body-small text-foreground/70">
          {brandContent ? (
            <>
              By posting, you agree to TikTok&apos;s{" "}
              <ExtLink href="https://www.tiktok.com/legal/page/global/bc-policy/en">
                Branded Content Policy
              </ExtLink>
              {" "}and{" "}
              <ExtLink href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en">
                Music Usage Confirmation
              </ExtLink>
              .
            </>
          ) : (
            <>
              By posting, you agree to TikTok&apos;s{" "}
              <ExtLink href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en">
                Music Usage Confirmation
              </ExtLink>
              .
            </>
          )}
        </p>
        <label className="flex-start gap-2 body-normal cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
          />
          <span>
            I agree to TikTok&apos;s{" "}
            <ExtLink href="https://www.tiktok.com/legal/page/global/terms-of-service/en">
              Terms of Service
            </ExtLink>
            {" "}and{" "}
            <ExtLink href="https://www.tiktok.com/community-guidelines">
              Community Guidelines
            </ExtLink>
          </span>
        </label>
      </Section>

      {/* UX 5d: Processing notice */}
      <p className="body-small text-foreground/50">
        After publishing, it may take a few minutes for the content to process
        and be visible on your TikTok profile.
      </p>

      <button
        type="submit"
        className="btn-primary"
        disabled={!canSubmit}
        title={
          commercialNeedsSelection
            ? "You need to indicate if your content promotes yourself, a third party, or both."
            : undefined
        }
      >
        {isSubmitting ? "Publishing..." : "Post to TikTok"}
      </button>
    </form>
  );
}

/* -- Tiny inline helpers (used multiple times in this file only) -- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="stack">
      <h2 className="heading-4">{title}</h2>
      {children}
    </section>
  );
}

function Checkbox({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <label
      className={`flex-start gap-2 body-normal ${
        disabled ? "opacity-50" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span>{label}</span>
    </label>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
      {children}
    </a>
  );
}
