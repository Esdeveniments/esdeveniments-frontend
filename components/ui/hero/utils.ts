export const buildHeroUrl = (
  place: string,
  date: string | null,
  searchTerm: string
): string => {
  const basePath = place === "catalunya" ? "/catalunya" : `/${place}`;
  let url = basePath;

  if (date) {
    url += `/${date}`;
  }

  if (searchTerm.trim()) {
    const params = new URLSearchParams();
    params.set("search", searchTerm.trim());
    url += `?${params.toString()}`;
  }

  return url;
};
