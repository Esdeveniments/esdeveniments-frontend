"use client";

export default function NotFound() {
  return (
    <div
      style={{ padding: 32, textAlign: "center" }}
      data-testid="not-found-page"
    >
      <h1 data-testid="not-found-title">Pàgina no trobada</h1>
      <p>No s&apos;ha pogut trobar la pàgina que busques.</p>
      <a
        href="/"
        style={{ color: "#0070f3", textDecoration: "underline" }}
        data-testid="not-found-home-link"
      >
        Torna a l&apos;inici
      </a>
    </div>
  );
}
