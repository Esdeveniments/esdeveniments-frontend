import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Esdeveniments.cat",
    short_name: "Esdeveniments",
    description: "Descobreix els millors esdeveniments culturals de Catalunya",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    orientation: "portrait-primary",
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
        src: "/static/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/static/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        form_factor: "narrow",
        label: "Mobile view of Esdeveniments.cat",
      },
      {
        src: "/static/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        form_factor: "wide",
        label: "Desktop view of Esdeveniments.cat",
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
