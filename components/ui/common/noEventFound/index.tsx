import { FC } from "react";
import Image from "next/image";
import Link from "next/link";
import eventNotFound from "@public/static/images/error_404_page_not_found.png";

const NoEventFound: FC = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="block blurred-image">
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
      <div className="flex flex-col h-full justify-center items-center text-center mx-4">
        <div className="reset-this">
          <h1>
            Ostres! L&apos;esdeveniment no existeix o ha estat cancel·lat pels
            organitzadors
          </h1>
        </div>
        <p className="mb-4">
          Pots provar sort amb el{" "}
          <Link
            href="/cerca"
            prefetch={false}
            className="font-bold text-black hover:underline"
          >
            cercador
          </Link>
          , veure{" "}
          <Link
            href="/"
            prefetch={false}
            className="font-bold text-black hover:underline"
          >
            que passa avui a Catalunya
          </Link>
          , o bé,{" "}
          <Link
            href="/publica"
            prefetch={false}
            className="font-bold text-black hover:underline"
          >
            publicar l&apos;esdeveniment
          </Link>
          . Si creus que hi ha un error, posa&apos;t en contacte amb nosaltres
          a:{" "}
          <a
            className="font-bold text-black hover:underline"
            href="mailto:hola@esdeveniments.cat"
          >
            hola@esdeveniments.cat
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default NoEventFound;
