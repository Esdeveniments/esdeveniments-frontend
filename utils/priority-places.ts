/**
 * Top priority places for static generation (build-time)
 * Limited to ~15 places to keep build size under AWS Amplify's 230MB limit
 * Each place generates ~4.6MB, so 15 places = ~69MB (within limit with other routes)
 */
export const topStaticGenerationPlaces = [
  // Top 3 major cities (highest traffic)
  "barcelona",
  "girona",
  "tarragona",
  // Top regions (high traffic)
  "maresme",
  "valles-oriental",
  "valles-occidental",
  "baix-llobregat",
  // Top cities near Barcelona (high traffic)
  "badalona",
  "mataro",
  "sabadell",
  "terrassa",
  "granollers",
  "l-hospitalet-de-llobregat",
  "santa-coloma-de-gramenet",
  "castelldefels",
  "viladecans",
];

/**
 * Full list of high-priority place slugs for SEO and sitemap generation
 * Contains most visited places from Google Search Console and major cities in Catalonia
 * Used for sitemap generation (doesn't affect build size)
 */
export const highPrioritySlugs = [
  // Most visited places from Google Search Console
  "alella",
  "altafulla",
  "anoia",
  "arenys-de-munt",
  "argentona",
  "bages",
  "baix-llobregat",
  "badalona",
  "barcelona",
  "bigues-i-riells",
  "caldes-de-montbui",
  "calella",
  "canet-de-mar",
  "canoves",
  "cardedeu",
  "castellardenhug",
  "castellbisbal",
  "cervello",
  "el-masnou",
  "gallifa",
  "granollers",
  "igualada",
  "la-garriga",
  "llinars",
  "llissa-de-vall",
  "malgrat-de-mar",
  "maresme",
  "matadepera",
  "mataro",
  "montgat",
  "montmelo",
  "montseny",
  "moianes",
  "mura",
  "premia-de-dalt",
  "roda-de-ter",
  "rupit-i-pruit",
  "sant-esteve-palautordera",
  "sant-pol-de-mar",
  "santa-coloma-de-cervello",
  "santquirze",
  "seva",
  "tordera",
  "tona",
  "valles-occidental",
  "valles-oriental",
  "vilassar-de-mar",
  // Major cities in Catalonia
  "tarragona",
  "lleida",
  "girona",
  "sabadell",
  "terrassa",
  "l-hospitalet-de-llobregat",
  "santa-coloma-de-gramenet",
  "reus",
  "manresa",
  "vic",
  "castelldefels",
  "viladecans",
  "el-prat-de-llobregat",
  "rubi",
  "sant-boi-de-llobregat",
  "esplugues-de-llobregat",
];
