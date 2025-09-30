import { FC } from "react";
import { CulturalMessageProps } from "types/props";
import { formatCatalanA, capitalizeFirstLetter } from "@utils/helpers";
import Badge from "../badge";

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
        <Badge href={`/${locationValue}/avui`}>Què fer avui</Badge>
        <Badge href={`/${locationValue}/dema`}>Què fer demà</Badge>
        <Badge href={`/${locationValue}/setmana`}>
          Què fer aquesta setmana
        </Badge>
        <Badge href={`/${locationValue}/cap-de-setmana`}>
          Què fer aquest cap de setmana
        </Badge>
      </div>
    </div>
  );
};

export default CulturalMessage;
