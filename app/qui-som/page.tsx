import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { siteUrl } from "@config/index";
import Image from "next/image";
import type { NextPage } from "next";
import type { TeamMember as TeamMemberType } from "types/common";
import { buildPageMeta } from "@components/partials/seo-meta";
import JsonLdServer from "@components/partials/JsonLdServer";

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

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": `${siteUrl}/qui-som#about`,
  url: `${siteUrl}/qui-som`,
  name: "Qui som - Esdeveniments.cat",
  description:
    "Coneix l'equip d'Esdeveniments.cat i la missió darrere l'agenda cultural col·laborativa de Catalunya.",
  isPartOf: { "@id": `${siteUrl}#website` },
  mainEntity: {
    "@type": "Organization",
    name: "Esdeveniments.cat",
    url: siteUrl,
    sameAs: [
      "https://www.facebook.com/esdevenimentscat",
      "https://www.instagram.com/esdevenimentscat",
      "https://www.tiktok.com/@esdevenimentscat",
      "https://x.com/esdeveniments",
    ],
    member: teamMembers.map((member) => ({
      "@type": "Person",
      name: member.name,
      jobTitle: member.title,
      description: member.role,
      image: `${siteUrl}${member.image}`,
      sameAs: [member.linkedin],
    })),
  },
};

const QuiSom: NextPage = () => {
  return (
    <>
      <JsonLdServer id="about-page-schema" data={organizationSchema} />
      <div className="container py-section-y">
        <div className="stack gap-6 items-center">
          <div className="stack gap-2 items-center">
            <h1 className="heading-1 text-center">Qui som?</h1>
            <h2 className="heading-2 text-center text-primary">
              esdeveniments.cat
            </h2>
          </div>
          <div className="stack gap-6">
            <p className="body-normal">
              Esdeveniments.cat és una iniciativa ciutadana per veure de manera
              fàcil i ràpida tots els actes culturals que es fan a Catalunya.
            </p>
            <p className="body-normal">
              L&apos;agenda és col·laborativa, i cada persona que organitzi un
              acte cultural podrà publicar-lo{" "}
              <PressableAnchor
                href="/publica"
                prefetch={false}
                className="text-primary hover:underline underline-offset-2 font-medium"
                variant="inline"
              >
                aquí
              </PressableAnchor>{" "}
              pel seu compte.
            </p>
            <p className="body-normal">
              Podreu seguir l&apos;agenda cultural en aquesta pàgina web o
              seguir-nos a les xarxes socials:
            </p>
          </div>
        </div>
        <div className="w-full stack gap-8 items-center py-section-y">
          <h2 className="heading-2 text-center">El nostre equip</h2>
          <div className="w-full flex flex-col sm:flex-row justify-center items-center gap-8">
            {teamMembers.map((member) => (
              <article
                key={member.name}
                className="card-elevated w-[200px] h-[414px] transition-card hover-lift"
              >
                <div className="h-[185px] overflow-hidden">
                  <Image
                    className="object-cover object-top rounded-t-card"
                    src={member.image}
                    alt={member.name}
                    width={200}
                    height={200}
                  />
                </div>
                <div className="stack gap-6 items-center p-card-padding-sm">
                  <div className="flex-start gap-2 w-full pt-2">
                    <div className="w-2 h-6 bg-primary"></div>
                    <h3 className="heading-4">{member.name}</h3>
                  </div>
                  <div className="stack gap-1 w-full">
                    <p className="body-normal text-foreground">{member.role}</p>
                    <p className="body-small font-semibold text-foreground-strong">
                      {member.title}
                    </p>
                  </div>
                  <a
                    href={member.linkedin}
                    className="btn-primary w-full transition-interactive"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LinkedIn
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default QuiSom;
