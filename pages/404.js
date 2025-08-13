import Meta from "@components/partials/seo-meta";
import { siteUrl } from "@config/index";

export default function Custom404() {
  return (
    <>
      <Meta
        title="404 - Pàgina no trobada - Esdeveniments.cat"
        description="La pàgina que busques no existeix."
        canonical={`${siteUrl}/404`}
        noindex
      />
      <div className="w-full flex flex-col justify-center items-center gap-6 py-20">
        <h1 className="italic uppercase font-semibold">Pàgina no trobada</h1>
        <p>La pàgina que busques no existeix o ha estat moguda.</p>
      </div>
    </>
  );
}
