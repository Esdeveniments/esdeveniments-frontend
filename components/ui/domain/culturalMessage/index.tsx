import { FC } from "react";
import { CulturalMessageProps } from "types/props";
import { formatCatalanA, capitalizeFirstLetter } from "@utils/helpers";
import { Badge, Text } from "@components/ui/primitives";

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
      <Text
        as="p"
        variant="body"
        size="base"
        color="black"
        className="font-bold leading-relaxed"
      >
        Explora més plans{" "}
        {formatCatalanA(capitalizedLocation, locationType, false)}:
      </Text>
      <div className="mt-component-xs flex flex-wrap gap-component-xs">
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
