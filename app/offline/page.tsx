import { Text } from "@components/ui/primitives";

export default function OfflinePage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-whiteCorp"
      data-testid="offline-page"
    >
      <div className="text-center">
        <Text
          as="h1"
          variant="h1"
          className="mb-component-md font-bold"
          data-testid="offline-title"
        >
          🌐 Sense connexió
        </Text>
        <Text
          as="p"
          variant="body-lg"
          className="mb-component-xl text-blackCorp/80"
        >
          No pots connectar-te a internet. Alguns continguts emmagatzemats
          podrien estar disponibles.
        </Text>
        <a
          href="/"
          className="hover:bg-blue-700 inline-block rounded bg-primary/100 px-component-md py-component-xs font-bold text-whiteCorp"
          data-testid="offline-home-link"
        >
          Torna a l&apos;inici
        </a>
        <br />
        <a
          href="/barcelona"
          className="bg-whiteCorp0 mr-component-xs mt-component-md inline-block rounded px-component-md py-component-xs font-bold text-whiteCorp hover:bg-blackCorp"
        >
          Barcelona
        </a>
        <a
          href="/catalunya"
          className="bg-whiteCorp0 mt-component-md inline-block rounded px-component-md py-component-xs font-bold text-whiteCorp hover:bg-blackCorp"
        >
          Catalunya
        </a>
      </div>
    </div>
  );
}
