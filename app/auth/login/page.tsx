"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiLogin } from "@lib/auth/session";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [magicUrl, setMagicUrl] = useState<string | null>(null);

  return (
    <div className="w-full flex justify-center bg-whiteCorp py-8">
      <div className="w-full sm:w-[520px] px-4 flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Inicia sessió</h1>
        <label className="flex flex-col gap-1">
          <span>Email</span>
          <input
            className="border p-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@exemple.com"
          />
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button
            className="bg-primary text-white p-2 rounded"
            onClick={async () => {
              setError(null);
              if (!email) return;
              try {
                await apiLogin(email);
                router.push("/dashboard");
              } catch (e) {
                setError("No s'ha pogut iniciar sessió");
              }
            }}
          >
            Entrar (instantani)
          </button>
          <button
            className="bg-gray-200 p-2 rounded"
            onClick={async () => {
              setError(null);
              setMagicUrl(null);
              if (!email) return;
              try {
                const res = await fetch("/api/auth/magic/request", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email }),
                });
                if (!res.ok) throw new Error("failed");
                const data = await res.json();
                setMagicUrl(data.verifyUrl as string);
              } catch (e) {
                setError("No s'ha pogut enviar l'enllaç màgic");
              }
            }}
          >
            Envia enllaç màgic
          </button>
        </div>
        {magicUrl && (
          <p className="text-sm">
            Enllaç de prova (dev):
            {" "}
            <a className="text-primary underline" href={magicUrl}>
              {magicUrl}
            </a>
          </p>
        )}
        <p className="text-sm">
          No tens compte? <Link className="text-primary underline" href="/auth/signup">Crea'n un</Link>
        </p>
      </div>
    </div>
  );
}