/**
 * Post-publish status polling component (UX point 5).
 * Polls TikTok's status endpoint every 5 seconds until complete or failed.
 */
"use client";

import { useState, useEffect, useRef } from "react";
import type { TikTokPublishStatus, TikTokStatusCheckProps } from "types/tiktok";

export default function TikTokStatusCheck({
  accessToken,
  publishId,
}: TikTokStatusCheckProps) {
  const [status, setStatus] = useState<TikTokPublishStatus>("PROCESSING_UPLOAD");
  const [failReason, setFailReason] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/tiktok/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: accessToken,
            publish_id: publishId,
          }),
        });
        const json = (await res.json()) as {
          data?: { status?: TikTokPublishStatus; fail_reason?: string };
        };
        const s = json.data?.status;
        if (s) {
          setStatus(s);
          if (s === "PUBLISH_COMPLETE" || s === "FAILED") {
            if (s === "FAILED") setFailReason(json.data?.fail_reason ?? null);
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        }
      } catch {
        // Silent retry on next interval
      }
    }

    intervalRef.current = setInterval(() => void checkStatus(), 5_000);
    void checkStatus(); // Check immediately

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [accessToken, publishId]);

  const isComplete = status === "PUBLISH_COMPLETE";
  const isFailed = status === "FAILED";
  const statusLabel = status.replace(/_/g, " ").toLowerCase();

  return (
    <div className="stack">
      <h2 className="heading-2">
        {isComplete ? "✅ Published!" : isFailed ? "❌ Failed" : "⏳ Processing..."}
      </h2>
      <p className="body-normal text-foreground/80">
        Status: <strong>{statusLabel}</strong>
      </p>
      {failReason && (
        <p className="body-small" style={{ color: "var(--destructive, #dc2626)" }}>
          {failReason}
        </p>
      )}
      {!isComplete && !isFailed && (
        <p className="body-small text-foreground/50">
          Checking status every 5 seconds...
        </p>
      )}
      <p className="body-small text-foreground/50">Publish ID: {publishId}</p>
    </div>
  );
}
