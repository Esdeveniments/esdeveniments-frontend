"use client";

import Link from "next/link";
import { sendGoogleEvent } from "@utils/analytics";

export default function PromoCheckoutCTA({
  href,
  kind,
  price,
}: {
  href: string;
  kind: string;
  price: number;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primarydark"
      prefetch={false}
      onClick={() => {
        try {
          sendGoogleEvent("begin_checkout", {
            kind,
            price_eur: price,
          });
        } catch (_) {
          // ignore analytics errors
        }
      }}
    >
      Continuar
    </Link>
  );
}