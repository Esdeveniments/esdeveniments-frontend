import Link from "next/link";
import { siteUrl } from "@config/index";
import Image from "next/image";
import type { NextPage } from "next";
import type { TeamMember as TeamMemberType } from "types/common";
import { buildPageMeta } from "@components/partials/seo-meta";
import { Text } from "@components/ui/primitives";

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
    <div className="flex w-full flex-col items-center justify-center gap-2xl px-component-md pb-3xl pt-component-xs sm:w-[580px] md:w-[768px] md:px-xs lg:w-[1024px]">
      <div>
        <Text
          as="h1"
          variant="h1"
          className="text-center font-semibold uppercase italic"
        >
          Qui som?
        </Text>
        <Text
          as="h2"
          variant="h2"
          className="text-center font-normal italic"
          color="primary"
        >
          esdeveniments.cat
        </Text>
      </div>
      <div className="flex flex-col items-start justify-start gap-component-lg">
        <Text as="p" variant="body">
          Esdeveniments.cat és una iniciativa ciutadana per veure de manera
          fàcil i ràpida tots els actes culturals que es fan a Catalunya.
        </Text>
        <Text as="p" variant="body">
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
        </Text>
        <Text as="p" variant="body">
          Podreu seguir l&apos;agenda cultural en aquesta pàgina web o
          seguir-nos a les xarxes socials:
        </Text>
      </div>
      <div></div>
      <div className="flex w-full flex-col justify-center gap-component-xl pb-4xl">
        <Text as="h2" variant="h2" className="text-center">
          El nostre equip
        </Text>
        <div className="flex w-full flex-col items-center justify-center gap-component-xl sm:flex-row">
          {teamMembers.map((member) => (
            <div
              key={member.name}
              className="h-[414px] w-[200px] rounded-md bg-whiteCorp shadow-xl"
            >
              <div className="h-[185px] overflow-hidden">
                <Image
                  className="rounded-t-md object-cover object-top"
                  src={member.image}
                  alt={member.name}
                  width={200}
                  height={200}
                />
              </div>
              <div className="flex w-full flex-col items-center justify-center gap-component-lg py-component-xl">
                <div className="flex w-full items-start justify-start gap-component-xs pt-component-md">
                  <div className="h-6 w-2 bg-primary"></div>
                  <Text as="h3" variant="h3">
                    {member.name}
                  </Text>
                </div>
                <div className="flex w-full flex-col items-start justify-start px-component-md">
                  <Text as="p" variant="body" className="w-full">
                    {member.role}
                  </Text>
                  <Text
                    as="p"
                    variant="body-sm"
                    className="w-full font-semibold"
                  >
                    {member.title}
                  </Text>
                </div>
                <a
                  href={member.linkedin}
                  className="my-component-sm w-full cursor-pointer px-component-md py-component-sm text-center font-bold duration-300 ease-in-out hover:bg-primary hover:text-whiteCorp"
                >
                  <Text as="p" variant="body">
                    LinkedIn
                  </Text>
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
