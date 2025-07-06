import { FC, MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendGoogleEvent } from "@utils/analytics";
import { CulturalMessageProps } from "types/props";

const CulturalMessage: FC<CulturalMessageProps> = ({
  location,
  locationValue,
}) => {
  const { push } = useRouter();

  if (!location) {
    return null;
  }

  const handleNavigation = async (
    e: MouseEvent<HTMLAnchorElement>,
    locationValue: string,
    timeframe: string
  ) => {
    e.preventDefault();
    sendGoogleEvent("navigate_to", {
      content_type: "navigation",
      item_id: `${locationValue}_${timeframe}`,
      item_name: `${locationValue} ${timeframe}`,
      event_category: "Navigation",
      event_label: `navigate_to_${locationValue}_${timeframe}`,
    });
    await push(e.currentTarget.href);
  };

  return (
    <div className="mt-2 leading-relaxed">
      Imagina un lloc on cada dia és una nova descoberta. Això és{" "}
      <span className="font-bold">{location}</span>: un univers de cultura
      esperant ser explorat per tu. Comença la teva aventura{" "}
      <Link
        href={`/${locationValue}/avui`}
        onClick={(e) => handleNavigation(e, locationValue, "avui")}
        className="font-medium text-primary hover:underline"
      >
        avui
      </Link>
      , descobreix què està passant{" "}
      <Link
        href={`/${locationValue}/dema`}
        onClick={(e) => handleNavigation(e, locationValue, "dema")}
        className="font-medium text-primary hover:underline"
      >
        demà
      </Link>
      , continua explorant{" "}
      <Link
        href={`/${locationValue}/setmana`}
        onClick={(e) => handleNavigation(e, locationValue, "setmana")}
        className="font-medium text-primary hover:underline"
      >
        durant la setmana
      </Link>
      , i culmina amb un{" "}
      <Link
        href={`/${locationValue}/cap-de-setmana`}
        onClick={(e) => handleNavigation(e, locationValue, "cap-de-setmana")}
        className="font-medium text-primary hover:underline"
      >
        cap de setmana espectacular
      </Link>
      . Deixa&apos;t sorprendre per tot el que{" "}
      <span className="font-bold">{location}</span> pot oferir-te.
    </div>
  );
};

export default CulturalMessage;
