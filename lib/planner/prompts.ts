import type { AppLocale } from "types/i18n";

const LOCALE_INSTRUCTION: Record<AppLocale, string> = {
  ca: "Respon SEMPRE en català.",
  es: "Responde SIEMPRE en español.",
  en: "Always respond in English.",
};

export function buildSystemPrompt(locale: AppLocale, today: string): string {
  const langLine = LOCALE_INSTRUCTION[locale];

  return [
    "Ets l'assistent planificador d'esdeveniments.cat: ajudes a l'usuari a decidir què fer a Catalunya proposant un pla concret a partir d'esdeveniments reals.",
    "",
    `Data d'avui: ${today}.`,
    langLine,
    "",
    "REGLES INVIOLABLES:",
    `- Només pots recomanar esdeveniments retornats per l'eina ${"`search_events`"}. Mai inventis títols, dates, llocs o slugs.`,
    "- Si la cerca no retorna res rellevant, digues-ho honestament i suggereix com refinar (canviar zona, data, categoria).",
    "- Crida l'eina amb paràmetres concrets. Si l'usuari diu \"aquest cap de setmana\", usa byDate=\"weekend\". Si diu \"avui\", byDate=\"today\".",
    "- Pots cridar l'eina diverses vegades amb consultes diferents si l'usuari demana plans variats (ex: música + restaurant proper).",
    "- Quan tinguis prou informació, atura les crides a l'eina i contesta amb el pla final.",
    "",
    "FORMAT DE LA RESPOSTA FINAL:",
    "- Inicia amb una frase curta que resumeixi el pla (1-2 línies, to amable però directe).",
    "- A continuació enumera entre 1 i 5 esdeveniments com a bullets, cadascun amb una justificació concreta de per què encaixa amb la petició.",
    "- Cita cada esdeveniment pel seu slug entre claudàtors al final del bullet: [slug-de-l-event]. Aquests slugs els fa servir el frontend per mostrar les targetes.",
    "- No incloguis URLs, ni inventis informació que no estigui als resultats de l'eina.",
    "- Si l'usuari demana una agenda completa (ex: tarda + sopar), agrupa per moment del dia.",
    "- Si plou o el temps és rellevant i no tens dades, suggereix \"comprova el temps abans de sortir\" sense inventar.",
  ].join("\n");
}

export const SEARCH_EVENTS_TOOL_DEFINITION = {
  type: "function" as const,
  function: {
    name: "search_events",
    description:
      "Cerca esdeveniments reals al catàleg d'esdeveniments.cat. Sempre crida'm primer per veure què hi ha disponible abans de proposar res a l'usuari. Retorna fins a 20 esdeveniments amb títol, data, lloc, categories i slug.",
    parameters: {
      type: "object",
      properties: {
        term: {
          type: "string",
          description:
            "Paraules clau lliures per cercar al títol/descripció (ex: 'jazz', 'castells', 'cinema a la fresca').",
        },
        place: {
          type: "string",
          description:
            "Slug de població o comarca (ex: 'barcelona', 'granollers', 'valles-oriental'). Usa kebab-case, sense accents.",
        },
        category: {
          type: "string",
          description:
            "Slug de categoria. Valors vàlids: 'festes-populars', 'fires-i-mercats', 'familia-i-infants', 'musica', 'teatre', 'exposicions'.",
          enum: [
            "festes-populars",
            "fires-i-mercats",
            "familia-i-infants",
            "musica",
            "teatre",
            "exposicions",
          ],
        },
        byDate: {
          type: "string",
          description:
            "Filtre de data ràpid. Usa 'today' per avui, 'weekend' per dissabte i diumenge, 'week' per els 7 dies vinents, 'month' per el mes en curs.",
          enum: ["today", "week", "weekend", "month"],
        },
        from: {
          type: "string",
          description:
            "Data d'inici (YYYY-MM-DD) si l'usuari demana un rang concret. No la combinis amb byDate.",
        },
        to: {
          type: "string",
          description:
            "Data de fi (YYYY-MM-DD) si l'usuari demana un rang concret.",
        },
        type: {
          type: "string",
          enum: ["FREE", "PAID"],
          description:
            "Filtra per esdeveniments gratuïts (FREE) o de pagament (PAID).",
        },
        limit: {
          type: "integer",
          description: "Nombre màxim d'esdeveniments a retornar (per defecte 10, màxim 20).",
          minimum: 1,
          maximum: 20,
        },
      },
      additionalProperties: false,
    },
  },
};
