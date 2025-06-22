export const sanitize = (url: string): string => {
  const accents = [
    /[\u0300-\u030f]/g,
    /[\u1AB0-\u1AFF]/g,
    /[\u1DC0-\u1DFF]/g,
    /[\u1F00-\u1FFF]/g,
    /[\u2C80-\u2CFF]/g,
    /[\uFB00-\uFB06]/g,
  ];

  let sanitizedUrl = url.toLowerCase();
  sanitizedUrl = sanitizedUrl.replace(/\s+$/, "");

  accents.forEach((regex) => {
    sanitizedUrl = sanitizedUrl.normalize("NFD").replace(regex, "");
  });

  sanitizedUrl = sanitizedUrl.replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-");
  sanitizedUrl = sanitizedUrl.replace(/[-\s]+/g, "-");

  return sanitizedUrl;
};

export const slug = (str: string, formattedStart: string, id: string): string =>
  `${sanitize(str)}-${formattedStart
    .toLowerCase()
    .replace(/ /g, "-")
    .replace("---", "-")
    .replace("ç", "c")
    .replace(/--/g, "-")}-${id}`;

export const truncateString = (str: string, num: number): string => {
  if (str.length <= num) return str;
  return str.slice(0, num) + "...";
};
