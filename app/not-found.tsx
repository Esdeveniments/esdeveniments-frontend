"use client";

import { Text } from "components/ui/primitives/Text";

export default function NotFound() {
  return (
    <div className="py-page-y text-center" data-testid="not-found-page">
      <Text as="h1" variant="h1" data-testid="not-found-title">
        Pàgina no trobada
      </Text>
      <Text as="p" variant="body">
        No s'ha pogut trobar la pàgina que busques.
      </Text>
      <a
        href="/"
        style={{ color: "#0070f3", textDecoration: "underline" }}
        data-testid="not-found-home-link"
      >
        Torna a l'inici
      </a>
    </div>
  );
}
