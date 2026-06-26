import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Esdeveniments.cat",
    short_name: "Esdeveniments",
    description: "Descobreix els millors esdeveniments culturals de Catalunya",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#D6002F",
    orientation: "portrait-primary",
    prefer_related_applications: false,
    categories: ["entertainment", "lifestyle", "culture"],
    lang: "ca",
    dir: "ltr",
    icons: [
      {
        src: "/static/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        // Dedicated maskable variant: opaque background, logo fitted to the
        // 40%-radius safe zone so Android mask shapes don't crop it.
        src: "/static/icons/icon-192x192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/static/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/static/icons/icon-512x512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/static/icons/screenshot-narrow.png",
        sizes: "780x1688",
        type: "image/png",
        form_factor: "narrow",
        label: "Esdeveniments culturals a Catalunya en mòbil",
      },
      {
        src: "/static/icons/screenshot-wide.png",
        sizes: "2560x1600",
        type: "image/png",
        form_factor: "wide",
        label: "Esdeveniments culturals a Catalunya en escriptori",
      },
    ],
    shortcuts: [
      {
        name: "Esdeveniments de Barcelona",
        short_name: "Barcelona",
        description: "Veure esdeveniments de Barcelona",
        url: "/barcelona",
        icons: [
          {
            src: "/static/icons/today-icon.png",
            sizes: "96x96",
            type: "image/png",
          },
        ],
      },
      // {
      //   name: "Esdeveniments de Girona",
      //   short_name: "Girona",
      //   description: "Veure esdeveniments de Girona",
      //   url: "/girona",
      //   icons: [
      //     {
      //       src: "/static/icons/today-icon.png",
      //       sizes: "96x96",
      //       type: "image/png",
      //     },
      //   ],
      // }, // Not yet in database
      {
        name: "Esdeveniments de Catalunya",
        short_name: "Catalunya",
        description: "Veure tots els esdeveniments de Catalunya",
        url: "/catalunya",
        icons: [
          {
            src: "/static/icons/today-icon.png",
            sizes: "96x96",
            type: "image/png",
          },
        ],
      },
      {
        name: "Publica un esdeveniment",
        short_name: "Publica",
        description: "Publica un nou esdeveniment",
        url: "/publica",
        icons: [
          {
            src: "/static/icons/today-icon.png",
            sizes: "96x96",
            type: "image/png",
          },
        ],
      },
    ],
  };
}
