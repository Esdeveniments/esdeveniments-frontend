export const BUILD_VERSION =
  process.env.NODE_ENV === "development"
    ? Date.now().toString()
    : process.env.NEXT_PUBLIC_BUILD_ID ||
      process.env.npm_package_version ||
      "v1";

export const getVersionedUrl = (path: string) => {
  return `${path}?v=${BUILD_VERSION}`;
};
