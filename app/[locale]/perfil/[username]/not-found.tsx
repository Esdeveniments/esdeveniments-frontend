import Image from "next/image";
import errorImage from "@public/static/images/error_404_page_not_found.png";
import { getTranslations } from "next-intl/server";
import { Link } from "@i18n/routing";

export default async function ProfileNotFound() {
  const t = await getTranslations("Components.Profile");

  return (
    <div className="w-full max-w-3xl mx-auto px-section-x py-section-y" data-testid="profile-not-found">
      <div className="block blurred-image">
        <Image
          src={errorImage}
          alt=""
          style={{ maxWidth: "100%", height: "auto" }}
        />
      </div>
      <div className="flex flex-col items-center gap-element-gap text-center">
        <h1 className="heading-1">{t("notFound")}</h1>
        <p className="body-normal text-muted-foreground">{t("notFoundDescription")}</p>
        <Link href="/" className="btn-neutral">
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
