"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { mockLogin } from "@lib/auth/session";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");

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
        <button
          className="bg-primary text-white p-2 rounded"
          onClick={() => {
            if (!email) return;
            mockLogin(email);
            router.push("/dashboard");
          }}
        >
          Entrar
        </button>
        <p className="text-sm">
          No tens compte? <Link className="text-primary underline" href="/auth/signup">Crea'n un</Link>
        </p>
      </div>
    </div>
  );
}