import { useState, useEffect } from "react";
import { NetworkInformation } from "types/common";

export const useNetworkSpeed = (): number => {
  const [quality, setQuality] = useState<number>(70); // Default quality

  useEffect(() => {
    const connection: NetworkInformation | undefined =
      ((navigator as Navigator).connection ||
      (navigator as Navigator).mozConnection ||
      (navigator as Navigator).webkitConnection);

    if (!connection) {
      console.log("Network Information API not supported");
      return setQuality(70); // Exit if the connection API is not supported and set default quality
    }

    const setConnectionQuality = (): void => {
      switch (connection.effectiveType) {
        case "slow-2g":
        case "2g":
          setQuality(30);
          break;
        case "3g":
          setQuality(50);
          break;
        case "4g":
          setQuality(80);
          break;
        case "wifi":
          setQuality(100);
          break;
        default:
          setQuality(70);
      }
    };

    setConnectionQuality();
    connection.addEventListener("change", setConnectionQuality);

    return () => {
      if (connection) {
        connection.removeEventListener("change", setConnectionQuality);
      }
    };
  }, []);

  return quality;
};
