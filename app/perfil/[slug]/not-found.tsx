import Image from "next/image";
import errorImage from "@public/static/images/error_404_page_not_found.png";
import { getTranslations } from "next-intl/server";
import { Link } from "@i18n/routing";

export default async function ProfileNotFound() {
  const t = await getTranslations("Components.Profile");

  return (
    <div className="max-w-3xl mx-auto pt-section-y" data-testid="profile-not-found">
      <div className="block blurred-image">
        <Image
          src={errorImage}
          alt=""
          style={{ maxWidth: "100%", height: "auto" }}
        />
      </div>
      <div className="flex flex-col h-full justify-center items-center text-center mx-4">
        <h1 className="heading-1 mb-element-gap">{t("notFound")}</h1>
        <p className="body-normal text-foreground/80 mb-element-gap">
          {t("notFoundDescription")}
        </p>
        <Link
          href="/"
          className="text-primary font-semibold hover:underline"
        >
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
