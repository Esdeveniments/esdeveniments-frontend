import { FC } from "react";
import Link from "next/link";
import { CulturalMessageProps } from "types/props";
import { formatCatalanA, capitalizeFirstLetter } from "@utils/helpers";

const CulturalMessage: FC<CulturalMessageProps> = ({
  location,
  locationValue,
  locationType = "general",
}) => {
  if (!location) {
    return null;
  }

  const capitalizedLocation = capitalizeFirstLetter(location);

  return (
    <div className="leading-relaxed">
      <p className="text-base leading-relaxed text-blackCorp font-bold">
        Explora més plans{" "}
        {formatCatalanA(capitalizedLocation, locationType, false)}:
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          href={`/${locationValue}/avui`}
          className="inline-flex items-center rounded-full border border-blackCorp bg-whiteCorp px-3 py-1 text-sm text-blackCorp hover:bg-primary hover:text-whiteCorp transition-colors"
        >
          Què fer avui
        </Link>
        <Link
          href={`/${locationValue}/dema`}
          className="inline-flex items-center rounded-full border border-blackCorp bg-whiteCorp px-3 py-1 text-sm text-blackCorp hover:bg-primary hover:text-whiteCorp transition-colors"
        >
          Què fer demà
        </Link>
        <Link
          href={`/${locationValue}/setmana`}
          className="inline-flex items-center rounded-full border border-blackCorp bg-whiteCorp px-3 py-1 text-sm text-blackCorp hover:bg-primary hover:text-whiteCorp transition-colors"
        >
          Què fer aquesta setmana
        </Link>
        <Link
          href={`/${locationValue}/cap-de-setmana`}
          className="inline-flex items-center rounded-full border border-blackCorp bg-whiteCorp px-3 py-1 text-sm text-blackCorp hover:bg-primary hover:text-whiteCorp transition-colors"
        >
          Què fer aquest cap de setmana
        </Link>
      </div>
    </div>
  );
};

export default CulturalMessage;
