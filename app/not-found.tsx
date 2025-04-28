"use client";

export default function NotFound() {
  return (
    <div style={{ padding: 32, textAlign: "center" }}>
      <h1>Pàgina no trobada</h1>
      <p>No s&apos;ha pogut trobar la pàgina que busques.</p>
      <a href="/" style={{ color: "#0070f3", textDecoration: "underline" }}>
        Torna a l&apos;inici
      </a>
    </div>
  );
}
