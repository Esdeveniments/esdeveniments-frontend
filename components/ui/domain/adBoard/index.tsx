import { memo, JSX } from "react";
import { Text } from "@components/ui/primitives";

function AdBoard(): JSX.Element {
  return (
    <div className="flex h-56 w-full flex-col items-center justify-center rounded-lg border border-warning bg-warning/10 p-component-md text-center">
      <Text variant="body-lg" className="font-semibold text-warning">
        L&apos;anunci no s&apos;ha pogut carregar.
      </Text>
      <Text variant="body-sm" className="mt-component-xs text-warning">
        Si us plau, ajuda&apos;ns a mantenir aquesta pàgina desactivant
        qualsevol bloquejador d&apos;anuncis. Gràcies per la teva comprensió i
        suport!
      </Text>
      <Text variant="body-sm" className="mt-component-xs text-warning">
        Si estàs interessat a anunciar-te aquí,{" "}
        <a
          className="text-primary"
          href="mailto:hola@esdeveniments.cat"
          rel="noopener noreferrer"
        >
          contacta&apos;ns
        </a>{" "}
        per obtenir més informació.
      </Text>
    </div>
  );
}

export default memo(AdBoard);
