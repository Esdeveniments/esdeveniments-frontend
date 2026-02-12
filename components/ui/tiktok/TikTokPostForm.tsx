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
  const [disableDuet, setDisableDuet] = useState(creatorInfo.duet_disabled);
  const [disableStitch, setDisableStitch] = useState(creatorInfo.stitch_disabled);
  const [disableComment, setDisableComment] = useState(creatorInfo.comment_disabled);
  const [brandContent, setBrandContent] = useState(false);
  const [brandOrganic, setBrandOrganic] = useState(false);
  const [isAigc, setIsAigc] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const prevUrlRef = useRef<string | null>(null);

  // Cleanup preview URL on unmount or when video changes
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
  }

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
            disable_duet: disableDuet,
            disable_stitch: disableStitch,
            disable_comment: disableComment,
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

      // Step 2: Upload video via proxy
      const uploadRes = await fetch("/api/tiktok/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "x-tiktok-upload-url": uploadUrl,
          "x-tiktok-content-type": videoFile.type || "video/mp4",
        },
        body: await videoFile.arrayBuffer(),
      });
      if (!uploadRes.ok) {
        const uploadData = (await uploadRes.json()) as { error?: string };
        throw new Error(uploadData.error || "Video upload failed");
      }
      onPublished({ publish_id: initData.data?.publish_id || "" });
    } catch (e) {
      onError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = Boolean(videoFile && privacyLevel && consent && !isSubmitting);

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
          <video src={videoPreviewUrl} controls className="w-full rounded-card" style={{ maxHeight: 300 }} />
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
            {creatorInfo.privacy_level_options.map((opt) => (
              <option key={opt} value={opt}>
                {TIKTOK_PRIVACY_LABELS[opt] ?? opt}
              </option>
            ))}
          </select>
        </label>
        <Toggle checked={!disableComment} onChange={(v) => setDisableComment(!v)} disabled={creatorInfo.comment_disabled} label="Allow comments" />
        <Toggle checked={!disableDuet} onChange={(v) => setDisableDuet(!v)} disabled={creatorInfo.duet_disabled} label="Allow Duet" />
        <Toggle checked={!disableStitch} onChange={(v) => setDisableStitch(!v)} disabled={creatorInfo.stitch_disabled} label="Allow Stitch" />
      </Section>

      {/* UX 3: Commercial Content Disclosure */}
      <Section title="Commercial Content Disclosure">
        <p className="body-small text-foreground/70">
          Indicate if this video promotes a business or brand.
        </p>
        <Toggle checked={brandOrganic} onChange={setBrandOrganic} label="Your brand — promotes your own business" />
        <Toggle checked={brandContent} onChange={setBrandContent} label="Branded content — paid partnership" />
        <Toggle checked={isAigc} onChange={setIsAigc} label="AI-generated content" />
      </Section>

      {/* UX 4: Consent + Policy Links */}
      <Section title="Consent">
        <p className="body-small text-foreground/70">
          By posting, you confirm compliance with TikTok&apos;s{" "}
          <ExtLink href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en">Music Usage Confirmation</ExtLink>
          {" "}and{" "}
          <ExtLink href="https://www.tiktok.com/legal/page/global/bc-policy/en">Branded Content Policy</ExtLink>.
        </p>
        <label className="flex-start gap-2 body-normal cursor-pointer">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
          <span>
            I agree to TikTok&apos;s{" "}
            <ExtLink href="https://www.tiktok.com/legal/page/global/terms-of-service/en">Terms of Service</ExtLink>
            {" "}and{" "}
            <ExtLink href="https://www.tiktok.com/community-guidelines">Community Guidelines</ExtLink>
          </span>
        </label>
      </Section>

      <button type="submit" className="btn-primary" disabled={!canSubmit}>
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

function Toggle({ checked, onChange, disabled, label }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string;
}) {
  return (
    <label className="flex-start gap-2 body-normal cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
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
