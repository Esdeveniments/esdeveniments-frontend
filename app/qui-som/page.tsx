import Link from "next/link";
import { siteUrl } from "@config/index";
import Image from "next/image";
import type { NextPage } from "next";
import type { TeamMember as TeamMemberType } from "types/common";
import { buildPageMeta } from "@components/partials/seo-meta";

export const metadata = buildPageMeta({
  title: "Qui som - Esdeveniments.cat",
  description:
    "Qui som? - Esdeveniments.cat és una iniciativa ciutadana per veure en un cop d'ull tots els actes culturals que es fan a Catalunya.",
  canonical: `${siteUrl}/qui-som`,
});

const teamMembers: TeamMemberType[] = [
  {
    name: "Albert Olivé Corbella",
    role: "Senior Full Stack Developer",
    title: "CTO Fundador",
    image: "/static/images/linkedin_albert.jpeg",
    linkedin: "https://www.linkedin.com/in/albertolivecorbella/",
  },
  {
    name: "Andreu Benítez Moreno",
    role: "UI Engineer | Graphic Designer",
    title: "Co-Fundador",
    image: "/static/images/linkedin_andreu.jpeg",
    linkedin: "https://www.linkedin.com/in/andreubenitezmoreno/",
  },
  {
    name: "Gerard Rovellat Carbó",
    role: "Software Engineer | Backend Developer",
    title: "Co-Fundador",
    image: "/static/images/linkedin_gerard.jpg",
    linkedin: "https://www.linkedin.com/in/gerardrovellatcarbo/",
  },
];

const QuiSom: NextPage = () => {
  return (
    <div className="container flex flex-col justify-center items-center gap-10 pt-2 pb-14">
      <div>
        <h1 className="text-center italic uppercase font-semibold">Qui som?</h1>
        <h2 className="text-center italic font-normal text-primary">
          esdeveniments.cat
        </h2>
      </div>
      <div className="flex flex-col justify-start items-start gap-6">
        <p>
          Esdeveniments.cat és una iniciativa ciutadana per veure de manera
          fàcil i ràpida tots els actes culturals que es fan a Catalunya.
        </p>
        <p>
          L&apos;agenda és col·laborativa, i cada persona que organitzi un acte
          cultural podrà publicar-lo{" "}
          <Link
            href="/publica"
            prefetch={false}
            className="font-normal text-primary hover:underline"
          >
            aquí
          </Link>{" "}
          pel seu compte.
        </p>
        <p>
          Podreu seguir l&apos;agenda cultural en aquesta pàgina web o
          seguir-nos a les xarxes socials:
        </p>
      </div>
      <div></div>
      <div className="w-full flex flex-col justify-center gap-8 pb-20">
        <h2 className="text-center">El nostre equip</h2>
        <div className="w-full flex flex-col sm:flex-row justify-center items-center gap-8">
          {teamMembers.map((member) => (
            <div
              key={member.name}
              className="w-[200px] h-[414px] bg-background rounded-md shadow-xl"
            >
              <div className="h-[185px] overflow-hidden">
                <Image
                  className="object-cover object-top rounded-t-md"
                  src={member.image}
                  alt={member.name}
                  width={200}
                  height={200}
                />
              </div>
              <div className="w-full flex flex-col justify-center items-center gap-6 py-8">
                <div className="w-full flex justify-start items-start gap-2 pt-4">
                  <div className="w-2 h-6 bg-primary"></div>
                  <h3 className="heading-4">{member.name}</h3>
                </div>
                <div className="w-full flex flex-col justify-start items-start px-4">
                  <p className="w-full">{member.role}</p>
                  <p className="w-full text-sm font-semibold">{member.title}</p>
                </div>
                <a
                  href={member.linkedin}
                  className="w-full text-center hover:bg-primary hover:text-background font-bold px-4 py-3 my-3 ease-in-out duration-300 cursor-pointer"
                >
                  <p>LinkedIn</p>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuiSom;
