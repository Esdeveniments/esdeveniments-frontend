import { FC } from "react";
import Image from "next/image";
import Link from "next/link";
import { Text } from "@components/ui/primitives";
import eventNotFound from "@public/static/images/error_404_page_not_found.png";

const NoEventFound: FC = () => {
  return (
    <div className="mx-auto max-w-3xl" data-testid="no-event-found">
      <div className="blurred-image block">
        <Image
          title="Esdeveniment no trobat - Esdeveniments.cat"
          src={eventNotFound}
          alt="Esdeveniment no trobat - Esdeveniments.cat"
          style={{
            maxWidth: "100%",
            height: "auto",
          }}
        />
      </div>
      <div className="mx-component-md flex h-full flex-col items-center justify-center text-center">
        <div className="reset-this">
          <Text as="h1" variant="h1">
            Ostres! L'esdeveniment no existeix o ha estat cancel·lat pels
            organitzadors
          </Text>
        </div>
        <Text as="p" variant="body" className="mb-component-md">
          Pots provar sort amb el{" "}
          <Link
            href="/cerca"
            prefetch={false}
            className="text-black font-bold hover:underline"
          >
            cercador
          </Link>
          , veure{" "}
          <Link
            href="/"
            prefetch={false}
            className="text-black font-bold hover:underline"
          >
            que passa avui a Catalunya
          </Link>
          , o bé,{" "}
          <Link
            href="/publica"
            prefetch={false}
            className="text-black font-bold hover:underline"
          >
            publicar l'esdeveniment
          </Link>
          . Si creus que hi ha un error, posa't en contacte amb nosaltres a:{" "}
          <a
            className="text-black font-bold hover:underline"
            href="mailto:hola@esdeveniments.cat"
          >
            hola@esdeveniments.cat
          </a>
          .
        </Text>
      </div>
    </div>
  );
};

export default NoEventFound;
