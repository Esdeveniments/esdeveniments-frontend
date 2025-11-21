"use client";

import { useState } from "react";
import { buildNewsletterContextMessage } from "@utils/newsletter-helpers";
import type { NewsletterFormProps } from "types/props";

type SubmissionStatus = "idle" | "loading" | "success" | "error";

export default function NewsletterForm({
  place,
  placeLabel,
  placeType,
  category,
  categoryLabel,
  byDate,
  byDateLabel,
}: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubmissionStatus>("idle");

  // Construct a friendly message about what the user is subscribing to
  const getContextMessage = () =>
    buildNewsletterContextMessage({
      categoryLabel,
      placeLabel,
      placeType,
      byDateLabel,
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          place,
          placeLabel,
          category,
          categoryLabel,
          byDate,
          byDateLabel,
        }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
        <p className="font-medium">✅ Subscrit correctament!</p>
        <p className="mt-1 text-sm">Rebràs {getContextMessage()} al teu correu.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-6">
      <h3 className="mb-2 text-lg font-bold text-gray-900">No et perdis res!</h3>
      <p className="mb-4 text-sm text-gray-600">
        Rep {getContextMessage()} directament a la teva safata d&#39;entrada.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          placeholder="El teu correu electrònic"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-red-500"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-lg bg-red-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-70"
        >
          {status === "loading" ? "..." : "Subscriure'm"}
        </button>
      </form>
      {status === "error" && (
        <p className="mt-2 text-xs text-red-600">
          Hi ha hagut un error. Torna-ho a provar.
        </p>
      )}
    </div>
  );
}
