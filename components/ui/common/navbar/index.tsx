import { getTranslations } from "next-intl/server";
import type { NavigationItem } from "types/common";
import type { NavbarClientProps } from "types/props";

import NavbarClient from "./NavbarClient";

export default async function Navbar() {
  const t = await getTranslations("Components.Navbar");

  const navigation: NavigationItem[] = [
    { name: t("navigation.home"), href: "/", current: true },
    { name: t("navigation.agenda"), href: "/catalunya", current: false },
    { name: t("navigation.publish"), href: "/publica", current: false },
    { name: t("navigation.news"), href: "/noticies", current: false },
    { name: t("navigation.archive"), href: "/sitemap", current: false },
  ];

  const props: NavbarClientProps = {
    navigation,
    labels: {
      logoAlt: t("logoAlt"),
      openMenu: t("aria.openMenu"),
      closeMenu: t("aria.closeMenu"),
      home: t("aria.home"),
      publish: t("aria.publish"),
      news: t("aria.news"),
      mobilePublishLabel: t("mobilePublishLabel"),
    },
  };

  return <NavbarClient {...props} />;
}
