"use client";

import Link from "next/link";
import { useEffect } from "react";
import { sendGoogleEvent } from "@utils/analytics";

export default function SuccessPage() {
  useEffect(() => {
    try {
      sendGoogleEvent("checkout_success", {});
    } catch (_) {}
  }, []);

  return (
    <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-28 px-2 lg:px-0">
      <h1 className="uppercase mb-4">Pagament completat</h1>
      <p className="mb-6">Gràcies! Hem rebut la teva comanda de promoció. Ens posarem en contacte si cal informació addicional.</p>
      <div className="flex gap-4">
        <Link href="/" className="text-primary underline">Tornar a l'inici</Link>
        <Link href="/promociona" className="text-primary underline">Configurar una altra promoció</Link>
      </div>
    </div>
  );
}