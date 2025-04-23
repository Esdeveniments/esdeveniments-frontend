import { FC, MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendGoogleEvent } from "@utils/analytics";
import { CulturalMessageProps } from "types/props";

const CulturalMessage: FC<CulturalMessageProps> = ({ location }) => {
  const { push } = useRouter();

  if (!location) {
    return null;
  }

  const handleNavigation = async (
    e: MouseEvent<HTMLAnchorElement>,
    location: string,
    timeframe: string
  ) => {
    e.preventDefault();
    sendGoogleEvent("navigate_to", {
      content_type: "navigation",
      item_id: `${location}_${timeframe}`,
      item_name: `${location} ${timeframe}`,
      event_category: "Navigation",
      event_label: `navigate_to_${location}_${timeframe}`,
    });
    await push(e.currentTarget.href);
  };

  return (
    <p className="mt-2">
      Imagina un lloc on cada dia és una nova descoberta. Això és{" "}
      <span className="font-bold">{location}</span>: un univers de cultura
      esperant ser explorat per tu. Comença la teva aventura{" "}
      <Link
        href={`/${location}/avui`}
        onClick={(e) => handleNavigation(e, location, "avui")}
        className="font-medium text-primary hover:underline"
      >
        avui
      </Link>
      , descobreix què està passant{" "}
      <Link
        href={`/${location}/dema`}
        onClick={(e) => handleNavigation(e, location, "dema")}
        className="font-medium text-primary hover:underline"
      >
        demà
      </Link>
      , continua explorant{" "}
      <Link
        href={`/${location}/setmana`}
        onClick={(e) => handleNavigation(e, location, "setmana")}
        className="font-medium text-primary hover:underline"
      >
        durant la setmana
      </Link>
      , i culmina amb un{" "}
      <Link
        href={`/${location}/cap-de-setmana`}
        onClick={(e) => handleNavigation(e, location, "cap-de-setmana")}
        className="font-medium text-primary hover:underline"
      >
        cap de setmana espectacular
      </Link>
      . Deixa&apos;t sorprendre per tot el que{" "}
      <span className="font-bold">{location}</span> pot oferir-te.
    </p>
  );
};

export default CulturalMessage;
